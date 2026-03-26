import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CREDIT_COSTS } from "@/lib/utils"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { StitchToolClient, extractProjectId, extractFirstScreenId, extractVariantScreenIds } from "@/lib/stitch/client"

const encoder = new TextEncoder()

const OPTION_LABELS = ["A", "B", "C"]

function createStreamSender(controller: ReadableStreamDefaultController) {
  return (event: object) =>
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
}

/**
 * Build a natural-language prompt for Stitch from the MVP plan.
 * Stitch uses Gemini — concise, descriptive prompts work best.
 */
function buildStitchPrompt(mvpPlan: string, projectName: string): string {
  return (
    `Design the main application screen for "${projectName}".\n\n` +
    `MVP context:\n${mvpPlan}\n\n` +
    `Create a modern, polished, production-ready UI. ` +
    `Focus on the primary user-facing screen with all key features visible and accessible.`
  )
}

/**
 * Generate 3 Stitch design variants using direct tool calls.
 *
 * We bypass the high-level SDK methods (project.generate / screen.variants)
 * because they have no null-safety on the response path:
 *   raw.outputComponents[0].design.screens[0]  ← crashes when design is undefined
 *
 * Using StitchToolClient.callTool() directly lets us apply defensive extraction.
 */
async function generateStitchMockup(
  mvpPlan: string,
  projectName: string,
  send?: (event: object) => void
): Promise<string> {
  if (!process.env.STITCH_API_KEY) {
    throw new Error("STITCH_API_KEY environment variable is not configured")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Raw = Record<string, any>

  const client = new StitchToolClient({ apiKey: process.env.STITCH_API_KEY })

  /** Pull bare screen ID from a list_screens item */
  function screenIdFromItem(item: Raw): string {
    const name: string = item?.name || item?.id || item?.screenId || ""
    if (name.includes("/screens/")) return name.split("/screens/")[1]
    return name
  }

  try {
    send?.({ type: "stage", message: "Creating design project...", step: 1, totalSteps: 4 })

    const projectRaw = await client.callTool<Raw>("create_project", { title: projectName })
    console.log("[Stitch] create_project raw:", JSON.stringify(projectRaw))
    const stitchProjectId = extractProjectId(projectRaw)

    send?.({ type: "stage", message: "Generating initial design...", step: 2, totalSteps: 4 })

    const prompt = buildStitchPrompt(mvpPlan, projectName)
    const generateRaw = await client.callTool<Raw>("generate_screen_from_text", {
      projectId: stitchProjectId,
      prompt,
      deviceType: "DESKTOP",
    })
    console.log("[Stitch] generate_screen_from_text raw:", JSON.stringify(generateRaw))

    // The API may return only design-system metadata in outputComponents (no screens).
    // Fall back to listing the project's screens to get the generated screen ID.
    let initialScreenId: string
    try {
      initialScreenId = extractFirstScreenId(generateRaw)
    } catch {
      console.log("[Stitch] No screen in generate response — listing screens to find it")
      const listRaw = await client.callTool<Raw>("list_screens", { projectId: stitchProjectId })
      console.log("[Stitch] list_screens raw:", JSON.stringify(listRaw))
      const listed: Raw[] = listRaw?.screens || []
      if (listed.length === 0) throw new Error("[Stitch] No screens found after generate_screen_from_text")
      initialScreenId = screenIdFromItem(listed[0])
    }

    console.log("[Stitch] initialScreenId:", initialScreenId)
    send?.({ type: "stage", message: "Generating 3 design variants...", step: 3, totalSteps: 4 })

    const variantsRaw = await client.callTool<Raw>("generate_variants", {
      projectId: stitchProjectId,
      selectedScreenIds: [initialScreenId],
      prompt: "Generate 3 visually distinct design alternatives with different layouts and color schemes",
      variantOptions: { variantCount: 3, creativeRange: "EXPLORE", aspects: ["COLOR_SCHEME", "LAYOUT"] },
      deviceType: "DESKTOP",
    })
    console.log("[Stitch] generate_variants raw:", JSON.stringify(variantsRaw))

    // Extract variant screen IDs from response, or fall back to listing all screens
    let variantIds = extractVariantScreenIds(variantsRaw)
    if (variantIds.length === 0) {
      console.log("[Stitch] No variants in response — listing screens to find them")
      const listRaw2 = await client.callTool<Raw>("list_screens", { projectId: stitchProjectId })
      console.log("[Stitch] list_screens (post-variants) raw:", JSON.stringify(listRaw2))
      const allScreens: Raw[] = listRaw2?.screens || []
      variantIds = allScreens
        .map(screenIdFromItem)
        .filter((id) => id && id !== initialScreenId)
        .slice(0, 3)
    }

    if (variantIds.length === 0) {
      throw new Error("[Stitch] generate_variants returned no variant screens")
    }

    send?.({ type: "stage", message: "Fetching design assets...", step: 4, totalSteps: 4 })

    const options = await Promise.all(
      variantIds.slice(0, 3).map(async (screenId, i) => {
        const screenRaw = await client.callTool<Raw>("get_screen", {
          projectId: stitchProjectId,
          screenId,
          name: `projects/${stitchProjectId}/screens/${screenId}`,
        })
        return {
          label: OPTION_LABELS[i],
          title: `Design Variant ${OPTION_LABELS[i]}`,
          htmlUrl: screenRaw?.htmlCode?.downloadUrl || "",
          imageUrl: screenRaw?.screenshot?.downloadUrl || "",
        }
      })
    )

    return JSON.stringify({ type: "stitch", options })
  } finally {
    await client.close()
  }
}

export const maxDuration = 300 // 5 min — Stitch generation can take time

export async function POST(request: Request) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let creditsConsumed = 0
  let userId: string | undefined
  let projectId: string | undefined
  let isStreaming = false

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      statusCode = 401
      errorType = "unauthorized"
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id

    const body = await request.json()
    projectId = body.projectId
    const { mvpPlan, projectName, stream: streamRequested } = body

    if (!projectId || !mvpPlan || !projectName) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId, mvpPlan, and projectName are required"
      return NextResponse.json(
        { error: "projectId, mvpPlan, and projectName are required" },
        { status: 400 }
      )
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      statusCode = 404
      errorType = "not_found"
      errorMessage = "Project not found"
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check and deduct credits
    const creditCost = CREDIT_COSTS['mockup']
    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: creditCost,
      p_action: 'mockup',
      p_description: `Mockup generation for "${projectName}"`,
    })

    if (!consumed) {
      statusCode = 402
      errorType = "insufficient_credits"
      errorMessage = "Insufficient credits"
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan." },
        { status: 402 }
      )
    }

    creditsConsumed = creditCost

    // ─── Streaming path ─────────────────────────────────────────────────
    if (streamRequested === true) {
      isStreaming = true

      const readableStream = new ReadableStream({
        async start(controller) {
          const send = createStreamSender(controller)

          try {
            const content = await generateStitchMockup(mvpPlan, projectName, send)

            send({ type: "stage", message: "Saving mockups...", step: 4, totalSteps: 4 })

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from("mockups").insert({
              project_id: projectId!,
              content,
              model_used: "stitch",
              metadata: { source: "stitch", generated_at: new Date().toISOString() },
            })

            await supabase
              .from("projects")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("id", projectId!)

            send({ type: "done", model: "stitch" })

            trackAPIMetrics({
              endpoint: `/api/mockups/generate`,
              method: "POST",
              featureType: "mockup",
              userId: userId!,
              projectId: projectId ?? null,
              statusCode: 200,
              responseTimeMs: timer.getElapsedMs(),
              creditsConsumed,
              modelUsed: "stitch",
              aiSource: "stitch",
              errorType: undefined,
              errorMessage: undefined,
            })
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Mockup generation failed"
            send({ type: "error", message: msg })
            statusCode = 500
            errorType = "generation_error"
            errorMessage = msg

            trackAPIMetrics({
              endpoint: `/api/mockups/generate`,
              method: "POST",
              featureType: "mockup",
              userId: userId!,
              projectId: projectId ?? null,
              statusCode: 500,
              responseTimeMs: timer.getElapsedMs(),
              creditsConsumed,
              modelUsed: undefined,
              aiSource: "stitch",
              errorType: "generation_error",
              errorMessage: msg,
            })
          } finally {
            controller.close()
          }
        },
      })

      return new Response(readableStream, {
        headers: { "Content-Type": "application/x-ndjson" },
      })
    }
    // ─── End streaming path ─────────────────────────────────────────────

    // Non-streaming path
    const content = await generateStitchMockup(mvpPlan, projectName)

    const metadata = {
      source: "stitch",
      generated_at: new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("mockups").insert({
      project_id: projectId,
      content,
      model_used: "stitch",
      metadata,
    })

    await supabase
      .from("projects")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", projectId)

    console.log(`[Mockup] project=${projectId} model=stitch`)

    return NextResponse.json({
      content,
      model: "stitch",
      source: "stitch",
    })
  } catch (error) {
    console.error("Mockup generation error:", error)
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json(
      { error: "Failed to generate mockup. Please try again." },
      { status: 500 }
    )
  } finally {
    if (!isStreaming && userId) {
      trackAPIMetrics({
        endpoint: `/api/mockups/generate`,
        method: "POST",
        featureType: "mockup",
        userId,
        projectId: projectId || null,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        creditsConsumed,
        modelUsed: "stitch",
        aiSource: "stitch",
        errorType,
        errorMessage,
      })
    }
  }
}

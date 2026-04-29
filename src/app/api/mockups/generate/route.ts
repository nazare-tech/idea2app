import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { generateOpenRouterImageMockup } from "@/lib/openrouter-image-mockup-pipeline"
import {
  createSkippedActiveDocumentPayload,
  findLatestActiveDocument,
  getActiveDocumentIdentity,
} from "@/lib/active-document-policy"

const encoder = new TextEncoder()

function createStreamSender(controller: ReadableStreamDefaultController) {
  return (event: object) =>
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
}

export const maxDuration = 300 // 5 min — Stitch generation can take time

export async function POST(request: Request) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let userId: string | undefined
  let projectId: string | undefined
  let isStreaming = false
  let modelUsed: string | undefined

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
    const rateLimit = checkRateLimit({
      key: `mockups:${user.id}:${getClientIp(request)}`,
      limit: 8,
      windowMs: 60_000,
    })
    if (rateLimit.limited) {
      statusCode = 429
      errorType = "rate_limited"
      errorMessage = "Too many mockup generation requests"
      return NextResponse.json(
        { error: "Too many requests. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      )
    }

    const body = await request.json()
    projectId = typeof body.projectId === "string" ? body.projectId.trim() : undefined
    const mvpPlan = typeof body.mvpPlan === "string" ? body.mvpPlan : undefined
    const projectName = typeof body.projectName === "string" ? body.projectName.trim() : undefined
    const streamRequested = body.stream

    if (!projectId || !mvpPlan || !projectName) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId, mvpPlan, and projectName are required"
      return NextResponse.json(
        { error: "projectId, mvpPlan, and projectName are required" },
        { status: 400 }
      )
    }
    if (mvpPlan.length > 50_000 || projectName.length > 160) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "Mockup generation input is too large"
      return NextResponse.json(
        { error: "Mockup generation input is too large" },
        { status: 400 },
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

    const documentIdentity = getActiveDocumentIdentity("mockups")
    if (documentIdentity) {
      const existingDocument = await findLatestActiveDocument(supabase, projectId, documentIdentity)
      if (existingDocument) {
        return NextResponse.json(createSkippedActiveDocumentPayload(existingDocument))
      }
    }

    // ─── Streaming path ─────────────────────────────────────────────────
    if (streamRequested === true) {
      isStreaming = true

      const readableStream = new ReadableStream({
        async start(controller) {
          const send = createStreamSender(controller)

          try {
            const result = await generateOpenRouterImageMockup({
              mvpPlan,
              projectName,
              projectId: projectId!,
              send,
            })
            modelUsed = result.model

            send({ type: "stage", message: "Saving mockups...", step: 5, totalSteps: 5 })

            const { error: insertError } = await supabase.from("mockups").insert({
              project_id: projectId!,
              content: result.content,
              model_used: result.model,
              metadata: result.metadata,
            })

            if (insertError) {
              throw new Error(`Failed to save generated mockups: ${insertError.message}`)
            }

            await supabase
              .from("projects")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("id", projectId!)

            send({ type: "done", model: result.model })

            trackAPIMetrics({
              endpoint: `/api/mockups/generate`,
              method: "POST",
              featureType: "mockup",
              userId: userId!,
              projectId: projectId ?? null,
              statusCode: 200,
              responseTimeMs: timer.getElapsedMs(),
              creditsConsumed: 0,
              modelUsed: result.model,
              aiSource: "openrouter-image",
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
              creditsConsumed: 0,
              modelUsed,
              aiSource: "openrouter-image",
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
    const result = await generateOpenRouterImageMockup({
      mvpPlan,
      projectName,
      projectId,
    })
    modelUsed = result.model

    const { error: insertError } = await supabase.from("mockups").insert({
      project_id: projectId,
      content: result.content,
      model_used: result.model,
      metadata: result.metadata,
    })

    if (insertError) {
      throw new Error(`Failed to save generated mockups: ${insertError.message}`)
    }

    await supabase
      .from("projects")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", projectId)

    console.log(`[Mockup] project=${projectId} model=${result.model} source=openrouter-image`)

    return NextResponse.json({
      content: result.content,
      model: result.model,
      source: result.source,
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
        creditsConsumed: 0,
        modelUsed,
        aiSource: "openrouter-image",
        errorType,
        errorMessage,
      })
    }
  }
}

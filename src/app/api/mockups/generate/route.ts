import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CREDIT_COSTS } from "@/lib/utils"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { generateStitchMockup } from "@/lib/stitch-pipeline"
import { refundCreditsServerSide } from "@/lib/credits"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
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

    const documentIdentity = getActiveDocumentIdentity("mockups")
    if (documentIdentity) {
      const existingDocument = await findLatestActiveDocument(supabase, projectId, documentIdentity)
      if (existingDocument) {
        return NextResponse.json(createSkippedActiveDocumentPayload(existingDocument))
      }
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

            send({ type: "stage", message: "Saving mockups...", step: 6, totalSteps: 6 })

            await supabase.from("mockups").insert({
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
            if (creditsConsumed > 0 && userId) {
              const refund = await refundCreditsServerSide({
                userId,
                amount: creditsConsumed,
                action: "mockup",
                description: `Mockup generation failed for "${projectName}": credits refunded`,
              })
              if (refund.error) console.error("[Mockup] Credit refund failed:", refund.error)
            }
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

    await supabase.from("mockups").insert({
      project_id: projectId,
      content,
      model_used: "stitch",
      metadata: { source: "stitch", generated_at: new Date().toISOString() },
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
    if (creditsConsumed > 0 && userId) {
      const refund = await refundCreditsServerSide({
        userId,
        amount: creditsConsumed,
        action: "mockup",
        description: "Mockup generation failed: credits refunded",
      })
      if (refund.error) console.error("[Mockup] Credit refund failed:", refund.error)
    }
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

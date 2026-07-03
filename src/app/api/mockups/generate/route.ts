import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { generateOpenRouterImageMockup } from "@/lib/openrouter-image-mockup-pipeline"
import { cleanupAbandonedMockupOptionDrafts, deleteMockupOptionDrafts, upsertMockupOptionDraft } from "@/lib/mockup-option-drafts"
import {
  createSkippedActiveDocumentPayload,
  findLatestActiveDocument,
  getActiveDocumentIdentity,
} from "@/lib/active-document-policy"
import { buildRequestLogContext, logError, logInfo, logWarn } from "@/lib/logger"

const encoder = new TextEncoder()

function createStreamSender(controller: ReadableStreamDefaultController) {
  return (event: object) =>
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
}

export const maxDuration = 800

export async function POST(request: Request) {
  const requestLogContext = buildRequestLogContext(request)
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
      logWarn("MockupGenerate", "unauthorized", requestLogContext)
      statusCode = 401
      errorType = "unauthorized"
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id
    const userLogContext = { ...requestLogContext, userId }
    const rateLimit = checkRateLimit({
      key: `mockups:${user.id}:${getClientIp(request)}`,
      limit: 8,
      windowMs: 60_000,
    })
    if (rateLimit.limited) {
      logWarn("MockupGenerate", "rate_limited", {
        ...userLogContext,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      })
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
    const mockupLogContext = { ...userLogContext, projectId, streaming: streamRequested === true }
    logInfo("MockupGenerate", "request_started", {
      ...mockupLogContext,
      hasMvpPlan: Boolean(mvpPlan),
      hasProjectName: Boolean(projectName),
    })

    if (!projectId || !mvpPlan || !projectName) {
      logWarn("MockupGenerate", "validation_failed", {
        ...mockupLogContext,
        hasProjectId: Boolean(projectId),
        hasMvpPlan: Boolean(mvpPlan),
        hasProjectName: Boolean(projectName),
      })
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId, mvpPlan, and projectName are required"
      return NextResponse.json(
        { error: "projectId, mvpPlan, and projectName are required" },
        { status: 400 }
      )
    }
    if (mvpPlan.length > 50_000 || projectName.length > 160) {
      logWarn("MockupGenerate", "input_too_large", {
        ...mockupLogContext,
        mvpPlanLength: mvpPlan.length,
        projectNameLength: projectName.length,
      })
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
      logWarn("MockupGenerate", "project_not_found", mockupLogContext)
      statusCode = 404
      errorType = "not_found"
      errorMessage = "Project not found"
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const documentIdentity = getActiveDocumentIdentity("mockups")
    if (documentIdentity) {
      const existingDocument = await findLatestActiveDocument(supabase, projectId, documentIdentity)
      if (existingDocument) {
        logInfo("MockupGenerate", "skipped_existing", {
          ...mockupLogContext,
          outputTable: existingDocument.outputTable,
          outputId: existingDocument.outputId,
        })
        return NextResponse.json(createSkippedActiveDocumentPayload(existingDocument))
      }
    }

    try {
      const cleanupSummary = await cleanupAbandonedMockupOptionDrafts({
        supabase,
        storageSupabase: createServiceClient(),
        projectId,
        userId: userId!,
      })
      if (cleanupSummary.rowCount > 0) {
        logInfo("MockupGenerate", "abandoned_drafts_cleaned", {
          ...mockupLogContext,
          ...cleanupSummary,
        })
      }
    } catch (cleanupError) {
      logWarn("MockupGenerate", "abandoned_draft_cleanup_failed", {
        ...mockupLogContext,
        error: cleanupError instanceof Error ? cleanupError.message : "Unknown cleanup error",
      })
    }

    // ─── Streaming path ─────────────────────────────────────────────────
    if (streamRequested === true) {
      isStreaming = true

      const readableStream = new ReadableStream({
        async start(controller) {
          const send = createStreamSender(controller)

          try {
            logInfo("MockupGenerate", "stream_generation_started", mockupLogContext)
            const result = await generateOpenRouterImageMockup({
              mvpPlan,
              projectName,
              projectId: projectId!,
              send,
              onOptionGenerated: (payload) =>
                upsertMockupOptionDraft({
                  supabase,
                  projectId: projectId!,
                  userId: userId!,
                  runId: payload.runId,
                  option: payload.option,
                  model: payload.model,
                  designPlan: payload.designPlan,
                }),
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
            try {
              await deleteMockupOptionDrafts({
                supabase,
                storageSupabase: createServiceClient(),
                projectId: projectId!,
                userId: userId!,
                runId: result.runId,
                deleteStorageObjects: true,
              })
            } catch (cleanupError) {
              logWarn("MockupGenerate", "stream_draft_cleanup_failed", {
                ...mockupLogContext,
                error: cleanupError instanceof Error ? cleanupError.message : "Unknown cleanup error",
              })
            }
            logInfo("MockupGenerate", "stream_generation_saved", {
              ...mockupLogContext,
              model: result.model,
            })

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
            logError("MockupGenerate", "stream_generation_failed", err, mockupLogContext)

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
    logInfo("MockupGenerate", "generation_started", mockupLogContext)
    const result = await generateOpenRouterImageMockup({
      mvpPlan,
      projectName,
      projectId,
      onOptionGenerated: (payload) =>
        upsertMockupOptionDraft({
          supabase,
          projectId: projectId!,
          userId: userId!,
          runId: payload.runId,
          option: payload.option,
          model: payload.model,
          designPlan: payload.designPlan,
        }),
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

    try {
      await deleteMockupOptionDrafts({
        supabase,
        storageSupabase: createServiceClient(),
        projectId,
        userId: userId!,
        runId: result.runId,
        deleteStorageObjects: true,
      })
    } catch (cleanupError) {
      logWarn("MockupGenerate", "draft_cleanup_failed", {
        ...mockupLogContext,
        error: cleanupError instanceof Error ? cleanupError.message : "Unknown cleanup error",
      })
    }

    await supabase
      .from("projects")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", projectId)

    logInfo("MockupGenerate", "generation_succeeded", {
      ...mockupLogContext,
      model: result.model,
      source: result.source,
    })

    return NextResponse.json({
      content: result.content,
      model: result.model,
      source: result.source,
    })
  } catch (error) {
    logError("MockupGenerate", "request_failed", error, {
      ...requestLogContext,
      userId,
      projectId,
    })
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

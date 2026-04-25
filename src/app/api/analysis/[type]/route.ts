import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runCompetitiveAnalysis, runPRD, runMVPPlan, runTechSpec } from "@/lib/analysis-pipelines"
import { callOpenRouterFallback } from "@/lib/openrouter"
import { type AnalysisType } from "@/lib/utils"
import { getTokenCost } from "@/lib/token-economics"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { linkifyBareUrls } from "@/lib/markdown-links"
import { getProjectIntakeContextForAi } from "@/lib/project-intake-context"
import {
  COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION,
  COMPETITIVE_ANALYSIS_V2_PROMPT_VERSION,
  COMPETITIVE_ANALYSIS_V2_WORKSPACE_SECTION_MAP,
} from "@/lib/competitive-analysis-v2"
import { refundCreditsServerSide } from "@/lib/credits"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import {
  createSkippedActiveDocumentPayload,
  findLatestActiveDocument,
  getActiveDocumentIdentityForAnalysisType,
} from "@/lib/active-document-policy"
import type { Json } from "@/types/database"

// Fixed default models per analysis type — user model selection removed
const ANALYSIS_DEFAULT_MODELS: Record<string, string> = {
  "competitive-analysis": "google/gemini-3.1-pro-preview",
  "prd":                  "anthropic/claude-sonnet-4-6",
  "mvp-plan":             "anthropic/claude-sonnet-4-6",
  "tech-spec":            "anthropic/claude-sonnet-4-6",
}

const encoder = new TextEncoder()

function createStreamSender(controller: ReadableStreamDefaultController) {
  return (event: object) =>
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
}

export const maxDuration = 300 // 5 min — competitive analysis pipeline (Perplexity + Tavily + synthesis) can take up to ~70s

function buildAnalysisMetadata(
  type: string,
  result: { source: string; model: string }
) {
  const metadata: { [key: string]: Json | undefined } = {
    source: result.source,
    model: result.model,
    generated_at: new Date().toISOString(),
  }

  if (type === "competitive-analysis") {
    metadata.document_version = COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION
    metadata.prompt_version = COMPETITIVE_ANALYSIS_V2_PROMPT_VERSION
    metadata.workspace_section_map = {
      ...COMPETITIVE_ANALYSIS_V2_WORKSPACE_SECTION_MAP,
    }
  }

  return metadata
}

interface AnalysisParams {
  params: Promise<{ type: string }>
}

export async function POST(request: Request, { params }: AnalysisParams) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let creditsConsumed = 0
  let modelUsed: string | undefined
  let aiSource: "openrouter" | "anthropic" | "n8n" | "inhouse" | undefined
  let userId: string | undefined
  let projectId: string | undefined
  let analysisType: string | undefined

  let isStreaming = false

  try {
    const { type } = await params
    analysisType = type
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
      key: `analysis:${type}:${user.id}:${getClientIp(request)}`,
      limit: type === "competitive-analysis" ? 6 : 12,
      windowMs: 60_000,
    })
    if (rateLimit.limited) {
      statusCode = 429
      errorType = "rate_limited"
      errorMessage = "Too many analysis requests"
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
    const { idea, name, competitiveAnalysis, prd, stream: streamRequested } = body
    const model = ANALYSIS_DEFAULT_MODELS[type] ?? "anthropic/claude-sonnet-4-6"

    if (!projectId || !idea || !name) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId, idea, and name are required"
      return NextResponse.json(
        { error: "projectId, idea, and name are required" },
        { status: 400 }
      )
    }

    // Validate analysis type
    const validTypes = ["competitive-analysis", "prd", "mvp-plan", "tech-spec"]
    if (!validTypes.includes(type)) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = `Invalid analysis type: ${type}`
      return NextResponse.json(
        { error: `Invalid analysis type: ${type}` },
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

    const documentIdentity = getActiveDocumentIdentityForAnalysisType(type)
    if (documentIdentity) {
      const existingDocument = await findLatestActiveDocument(supabase, projectId, documentIdentity)
      if (existingDocument) {
        return NextResponse.json({
          ...createSkippedActiveDocumentPayload(existingDocument),
          type,
        })
      }
    }

    const ideaForGeneration = await getProjectIntakeContextForAi(
      supabase,
      projectId,
      project.description || idea
    )

    // Check and deduct tokens (stored in credits balance)
    const creditCost = getTokenCost(type as AnalysisType, model)
    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: creditCost,
      p_action: type,
      p_description: `${type} for "${name}"`,
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

    // ─── Streaming path ────────────────────────────────────────────────
    if (streamRequested === true) {
      isStreaming = true
      const readableStream = new ReadableStream({
        async start(controller) {
          const send = createStreamSender(controller)

          try {
            const callbacks: import("@/lib/analysis-pipelines").StreamCallbacks = {
              onStage: (message, step, totalSteps) =>
                send({ type: "stage", message, step, totalSteps }),
              onToken: (content) => send({ type: "token", content }),
            }

            let streamResult: { content: string; source: string; model: string }

            if (type === "competitive-analysis") {
              streamResult = await runCompetitiveAnalysis({ idea: ideaForGeneration, name, model }, callbacks)
            } else if (type === "prd") {
              streamResult = await runPRD({ idea: ideaForGeneration, name, competitiveAnalysis, model }, callbacks)
            } else if (type === "mvp-plan") {
              streamResult = await runMVPPlan({ idea: ideaForGeneration, name, prd, model }, callbacks)
            } else if (type === "tech-spec") {
              streamResult = await runTechSpec({ idea: ideaForGeneration, name, prd, model }, callbacks)
            } else {
              streamResult = await callOpenRouterFallback(type, ideaForGeneration, name, model)
            }

            // Save to DB — same as non-streaming path
            const contentWithLinks = linkifyBareUrls(streamResult.content)
            const metadata = buildAnalysisMetadata(type, streamResult)
            if (type === "prd") {
              await supabase.from("prds").insert({ project_id: projectId!, content: contentWithLinks })
            } else if (type === "mvp-plan") {
              await supabase.from("mvp_plans").insert({ project_id: projectId!, content: contentWithLinks })
            } else if (type === "tech-spec") {
              await supabase.from("tech_specs").insert({ project_id: projectId!, content: contentWithLinks })
            } else {
              await supabase.from("analyses").insert({
                project_id: projectId!,
                type,
                content: contentWithLinks,
                metadata,
              })
            }

            await supabase
              .from("projects")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("id", projectId!)

            modelUsed = streamResult.model
            aiSource = streamResult.source as "openrouter" | "inhouse"
            send({ type: "done", model: streamResult.model })
            // Track metrics for successful streaming request
            trackAPIMetrics({
              endpoint: `/api/analysis/${type}`,
              method: "POST",
              featureType: "analysis",
              userId: userId!,
              projectId: projectId ?? null,
              statusCode: 200,
              responseTimeMs: timer.getElapsedMs(),
              creditsConsumed,
              modelUsed: streamResult.model,
              aiSource: streamResult.source as "openrouter" | "inhouse",
              errorType: undefined,
              errorMessage: undefined,
            })
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Generation failed"
            send({ type: "error", message: msg })
            errorType = "generation_error"
            errorMessage = msg
            statusCode = 500

            // Refund credits on generation failure
            if (creditsConsumed > 0) {
              const refund = await refundCreditsServerSide({
                userId: userId!,
                amount: creditsConsumed,
                action: analysisType!,
                description: `${analysisType} generation failed for "${name}": credits refunded`,
              })
              if (!refund.error) {
                send({ type: "refund", credits: creditsConsumed })
              } else {
                console.error("[Analysis] Credit refund failed:", refund.error)
              }
            }

            // Track metrics for failed streaming request
            trackAPIMetrics({
              endpoint: `/api/analysis/${type}`,
              method: "POST",
              featureType: "analysis",
              userId: userId!,
              projectId: projectId ?? null,
              statusCode: 500,
              responseTimeMs: timer.getElapsedMs(),
              creditsConsumed,
              modelUsed: undefined,
              aiSource: undefined,
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

    // Route to the appropriate in-house pipeline
    let result: { content: string; source: string; model: string }

    if (type === "competitive-analysis") {
      result = await runCompetitiveAnalysis({ idea: ideaForGeneration, name, model })
    } else if (type === "prd") {
      result = await runPRD({ idea: ideaForGeneration, name, competitiveAnalysis, model })
    } else if (type === "mvp-plan") {
      result = await runMVPPlan({ idea: ideaForGeneration, name, prd, model })
    } else if (type === "tech-spec") {
      result = await runTechSpec({ idea: ideaForGeneration, name, prd, model })
    } else {
      // gap-analysis still uses OpenRouter fallback
      result = await callOpenRouterFallback(type, ideaForGeneration, name, model)
    }

    // Track AI model and source
    modelUsed = result.model
    aiSource = result.source as "openrouter" | "inhouse"

    const contentWithLinks = linkifyBareUrls(result.content)

    const metadata = buildAnalysisMetadata(type, result)

    // Store the result based on type — always include source/model metadata
    if (type === "prd") {
      await supabase.from("prds").insert({
        project_id: projectId,
        content: contentWithLinks,
      })
    } else if (type === "mvp-plan") {
      await supabase.from("mvp_plans").insert({
        project_id: projectId,
        content: contentWithLinks,
      })
    } else if (type === "tech-spec") {
      await supabase.from("tech_specs").insert({
        project_id: projectId,
        content: contentWithLinks,
      })
    } else {
      await supabase.from("analyses").insert({
        project_id: projectId,
        type,
        content: contentWithLinks,
        metadata,
      })
    }

    // Update project
    await supabase
      .from("projects")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", projectId)

    console.log(`[Analysis] type=${type} project=${projectId} source=${result.source} model=${result.model}`)

    return NextResponse.json({
      content: contentWithLinks,
      source: result.source,
      model: result.model,
      type,
    })
  } catch (error) {
    console.error("Analysis error:", error)
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)

    // Refund credits on generation failure
    if (creditsConsumed > 0 && userId) {
      const refund = await refundCreditsServerSide({
        userId,
        amount: creditsConsumed,
        action: analysisType || "unknown",
        description: `${analysisType} generation failed: credits refunded`,
      })
      if (!refund.error) {
        console.log(`[Analysis] Refunded ${creditsConsumed} credits to user ${userId}`)
      } else {
        console.error("[Analysis] Credit refund failed:", refund.error)
      }
    }

    return NextResponse.json(
      { error: "Failed to generate analysis. Please try again." },
      { status: 500 }
    )
  } finally {
    // Track metrics (fire and forget - won't block response)
    if (!isStreaming && userId && analysisType) {
      trackAPIMetrics({
        endpoint: `/api/analysis/${analysisType}`,
        method: "POST",
        featureType: "analysis",
        userId,
        projectId: projectId || null,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        creditsConsumed,
        modelUsed,
        aiSource,
        errorType,
        errorMessage,
      })
    }
  }
}

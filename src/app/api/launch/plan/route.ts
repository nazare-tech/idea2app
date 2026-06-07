import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { getProjectIntakeContextForAi } from "@/lib/project-intake-context"
import { refundCreditsServerSide } from "@/lib/credits"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { runLaunchPlan } from "@/lib/analysis-pipelines"
import { linkifyBareUrls } from "@/lib/markdown-links"
import {
  createSkippedActiveDocumentPayload,
  findLatestActiveDocument,
  getActiveDocumentIdentity,
} from "@/lib/active-document-policy"

export const maxDuration = 800

export async function POST(request: Request) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let userId: string | undefined
  let projectId: string | undefined
  const creditsConsumed = 5
  let creditsCharged = false

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
      key: `launch-plan:${user.id}:${getClientIp(request)}`,
      limit: 12,
      windowMs: 60_000,
    })
    if (rateLimit.limited) {
      statusCode = 429
      errorType = "rate_limited"
      errorMessage = "Too many launch plan requests"
      return NextResponse.json(
        { error: "Too many requests. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      )
    }

    const body = await request.json()
    const { projectId: incomingProjectId, idea, name, marketingBrief } = body
    projectId = incomingProjectId

    if (!projectId || !idea || !name) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId, idea, and name are required"
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const brief = {
      targetAudience: String(marketingBrief?.targetAudience ?? "").trim(),
      stage: String(marketingBrief?.stage ?? "").trim(),
      budget: String(marketingBrief?.budget ?? "").trim(),
      channels: String(marketingBrief?.channels ?? "").trim(),
      launchWindow: String(marketingBrief?.launchWindow ?? "").trim(),
    }

    if (!brief.targetAudience || !brief.stage || !brief.budget || !brief.channels || !brief.launchWindow) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "marketingBrief with 5 fields is required"
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id, description")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      statusCode = 404
      errorType = "not_found"
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const documentIdentity = getActiveDocumentIdentity("launch")
    if (documentIdentity) {
      const existingDocument = await findLatestActiveDocument(supabase, projectId, documentIdentity)
      if (existingDocument) {
        return NextResponse.json(createSkippedActiveDocumentPayload(existingDocument))
      }
    }

    const ideaForGeneration = await getProjectIntakeContextForAi(
      supabase,
      projectId,
      project.description || idea
    )

    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: creditsConsumed,
      p_action: "launch-plan",
      p_description: `launch-plan for \"${name}\"`,
    })

    if (!consumed) {
      statusCode = 402
      errorType = "insufficient_credits"
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan." },
        { status: 402 }
      )
    }
    creditsCharged = true

    const result = await runLaunchPlan({
      idea: ideaForGeneration,
      name,
      brief,
      model: "openai/gpt-5.4-mini",
    })
    const content = linkifyBareUrls(result.content)

    await supabase.from("analyses").insert({
      project_id: projectId,
      type: "launch-plan",
      content,
      metadata: {
        source: result.source,
        model: result.model,
        generated_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({ content, type: "launch-plan", source: result.source, model: result.model })
  } catch (error) {
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    if (creditsCharged && userId) {
      const refund = await refundCreditsServerSide({
        userId,
        amount: creditsConsumed,
        action: "launch-plan",
        description: "Launch plan generation failed: credits refunded",
      })
      if (refund.error) console.error("[LaunchPlan] Credit refund failed:", refund.error)
    }
    return NextResponse.json({ error: "Failed to generate launch plan." }, { status: 500 })
  } finally {
    if (userId) {
      trackAPIMetrics({
        endpoint: "/api/launch/plan",
        method: "POST",
        featureType: "analysis",
        userId,
        projectId: projectId || null,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        creditsConsumed: creditsCharged ? creditsConsumed : 0,
        errorType,
        errorMessage,
      })
    }
  }
}

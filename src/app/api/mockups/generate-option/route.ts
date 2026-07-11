import { NextResponse } from "next/server"

import {
  OPENROUTER_MOCKUP_OPTION_CONFIGS,
  generateOpenRouterImageMockupOption,
  type OpenRouterMockupOptionLabel,
} from "@/lib/mockups/openrouter-image-pipeline"
import {
  createSkippedActiveDocumentPayload,
  findLatestActiveDocument,
  getActiveDocumentIdentity,
} from "@/lib/active-document-policy"
import { parseMockupDesignPlan } from "@/lib/mockups/design-plan"
import { upsertMockupOptionDraft } from "@/lib/mockups/option-drafts"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { buildRequestLogContext, logError, logInfo, logWarn } from "@/lib/logger"
import { getUserPlanName } from "@/lib/project-allowance"
import {
  recordManualGenerationFailed,
  recordManualGenerationStarted,
} from "@/lib/product-analytics/generation"

export const maxDuration = 800

const OPTION_LABELS = new Set<string>(
  OPENROUTER_MOCKUP_OPTION_CONFIGS.map((config) => config.label),
)
const SAFE_RUN_ID = /^[A-Za-z0-9_-]+$/

function parseOptionLabel(value: unknown): OpenRouterMockupOptionLabel | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toUpperCase()
  return OPTION_LABELS.has(normalized) ? normalized as OpenRouterMockupOptionLabel : null
}

export async function POST(request: Request) {
  const requestLogContext = buildRequestLogContext(request)
  let analyticsRunId: string | undefined
  let analyticsUserId: string | undefined
  let analyticsProjectId: string | undefined
  let analyticsPlanName: string | undefined
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logWarn("MockupOption", "unauthorized", requestLogContext)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userLogContext = { ...requestLogContext, userId: user.id }
    const rateLimit = await checkRateLimit({
      key: `mockups-option:${user.id}:${getClientIp(request)}`,
      limit: 12,
      windowMs: 60_000,
    })
    if (rateLimit.limited) {
      logWarn("MockupOption", "rate_limited", {
        ...userLogContext,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      })
      return NextResponse.json(
        { error: "Too many mockup generation requests. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      )
    }

    const body = await request.json()
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : ""
    const mvpPlan = typeof body.mvpPlan === "string" ? body.mvpPlan : ""
    const projectName = typeof body.projectName === "string" ? body.projectName.trim() : ""
    const runId = typeof body.runId === "string" ? body.runId.trim() : undefined
    const label = parseOptionLabel(body.label)
    const idea = typeof body.idea === "string" ? body.idea : undefined
    const productPlan = typeof body.productPlan === "string" ? body.productPlan : undefined
    let designPlan: ReturnType<typeof parseMockupDesignPlan> | undefined
    if (body.designPlan && typeof body.designPlan === "object") {
      try {
        designPlan = parseMockupDesignPlan(JSON.stringify(body.designPlan))
      } catch {
        logWarn("MockupOption", "invalid_design_plan", userLogContext)
        return NextResponse.json({ error: "Invalid mockup design plan" }, { status: 400 })
      }
    }

    const mockupLogContext = {
      ...userLogContext,
      projectId,
      runId,
      optionLabel: label,
    }
    logInfo("MockupOption", "request_started", {
      ...mockupLogContext,
      hasDesignPlan: Boolean(designPlan),
      hasIdea: Boolean(idea),
      hasProductPlan: Boolean(productPlan),
    })

    if (!projectId || !mvpPlan || !projectName || !label) {
      logWarn("MockupOption", "validation_failed", {
        ...mockupLogContext,
        hasProjectId: Boolean(projectId),
        hasMvpPlan: Boolean(mvpPlan),
        hasProjectName: Boolean(projectName),
        hasLabel: Boolean(label),
      })
      return NextResponse.json(
        { error: "projectId, mvpPlan, projectName, and label are required" },
        { status: 400 },
      )
    }

    if (
      mvpPlan.length > 50_000 ||
      projectName.length > 160 ||
      (idea && idea.length > 10_000) ||
      (productPlan && productPlan.length > 50_000) ||
      (runId && (runId.length > 120 || !SAFE_RUN_ID.test(runId)))
    ) {
      logWarn("MockupOption", "input_too_large", {
        ...mockupLogContext,
        mvpPlanLength: mvpPlan.length,
        projectNameLength: projectName.length,
        ideaLength: idea?.length ?? 0,
        productPlanLength: productPlan?.length ?? 0,
        runIdLength: runId?.length ?? 0,
      })
      return NextResponse.json(
        { error: "Mockup generation input is too large" },
        { status: 400 },
      )
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      logWarn("MockupOption", "project_not_found", mockupLogContext)
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const documentIdentity = getActiveDocumentIdentity("mockups")
    if (documentIdentity) {
      const existingDocument = await findLatestActiveDocument(supabase, projectId, documentIdentity)
      if (existingDocument) {
        logInfo("MockupOption", "skipped_existing", {
          ...mockupLogContext,
          outputTable: existingDocument.outputTable,
          outputId: existingDocument.outputId,
        })
        return NextResponse.json(createSkippedActiveDocumentPayload(existingDocument))
      }
    }

    if (runId && isUuid(runId)) {
      analyticsRunId = runId
      analyticsUserId = user.id
      analyticsProjectId = projectId
      analyticsPlanName = await getUserPlanName(supabase, user.id)
      await recordManualGenerationStarted({
        runId,
        userId: user.id,
        projectId,
        planName: analyticsPlanName,
      })
    }

    logInfo("MockupOption", "generation_started", mockupLogContext)
    const result = await generateOpenRouterImageMockupOption({
      mvpPlan,
      projectName,
      projectId,
      label,
      runId,
      idea,
      productPlan,
      designPlan,
    })
    await upsertMockupOptionDraft({
      supabase,
      projectId,
      userId: user.id,
      runId: result.runId,
      option: result.option,
      model: result.model,
      designPlan: result.designPlan,
    })
    logInfo("MockupOption", "generation_succeeded", {
      ...mockupLogContext,
      model: result.model,
      storagePath: result.option.storagePath,
      width: result.option.width,
      height: result.option.height,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (analyticsRunId && analyticsUserId && analyticsProjectId) {
      await recordManualGenerationFailed({
        runId: analyticsRunId,
        userId: analyticsUserId,
        projectId: analyticsProjectId,
        documentType: "mockups",
        failureKind: error instanceof Error && error.message.includes("timed out")
          ? "timeout"
          : "provider",
        planName: analyticsPlanName,
      })
    }
    logError("MockupOption", "request_failed", error, requestLogContext)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate mockup option" },
      { status: 500 },
    )
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

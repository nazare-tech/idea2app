import { NextResponse } from "next/server"

import {
  OPENROUTER_MOCKUP_OPTION_CONFIGS,
  generateOpenRouterImageMockupOption,
  type OpenRouterMockupOptionLabel,
} from "@/lib/openrouter-image-mockup-pipeline"
import {
  createSkippedActiveDocumentPayload,
  findLatestActiveDocument,
  getActiveDocumentIdentity,
} from "@/lib/active-document-policy"
import { parseMockupDesignPlan } from "@/lib/mockup-design-plan"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { buildRequestLogContext, logError, logInfo, logWarn } from "@/lib/logger"

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
    const rateLimit = checkRateLimit({
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
    logInfo("MockupOption", "generation_succeeded", {
      ...mockupLogContext,
      model: result.model,
      storagePath: result.option.storagePath,
      width: result.option.width,
      height: result.option.height,
    })

    return NextResponse.json(result)
  } catch (error) {
    logError("MockupOption", "request_failed", error, requestLogContext)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate mockup option" },
      { status: 500 },
    )
  }
}

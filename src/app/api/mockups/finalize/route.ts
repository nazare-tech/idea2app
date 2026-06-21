import { NextResponse } from "next/server"

import {
  MOCKUP_STORAGE_BUCKET,
  OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
} from "@/lib/openrouter-image-mockup-pipeline"
import {
  buildMockupImageProxyUrl,
  type OpenRouterImageMockupScreen,
  type OpenRouterImageMockupContent,
  type OpenRouterImageMockupOption,
} from "@/lib/openrouter-image-mockup-format"
import {
  createSkippedActiveDocumentPayload,
  findLatestActiveDocument,
  getActiveDocumentIdentity,
} from "@/lib/active-document-policy"
import { parseMockupDesignPlan } from "@/lib/mockup-design-plan"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import { buildRequestLogContext, logError, logInfo, logWarn } from "@/lib/logger"

export const maxDuration = 800

const EXPECTED_LABELS = ["A", "B", "C"]
const SAFE_RUN_ID = /^[A-Za-z0-9_-]+$/

function normalizeOption(value: unknown, projectId: string): OpenRouterImageMockupOption | null {
  if (!value || typeof value !== "object") return null

  const record = value as Record<string, unknown>
  const label = typeof record.label === "string" ? record.label.trim().toUpperCase() : ""
  const title = typeof record.title === "string" ? record.title.trim() : ""
  const storagePath = typeof record.storagePath === "string" ? record.storagePath.trim() : ""
  const description = typeof record.description === "string" ? record.description.trim() : ""
  const contentType = typeof record.contentType === "string" ? record.contentType.trim() : "image/png"
  const screens = normalizeScreens(record.screens)
  const width = typeof record.width === "number" && Number.isFinite(record.width) && record.width > 0
    ? record.width
    : undefined
  const height = typeof record.height === "number" && Number.isFinite(record.height) && record.height > 0
    ? record.height
    : undefined

  if (!EXPECTED_LABELS.includes(label) || !title || !storagePath) return null
  if (!storagePath.startsWith(`${projectId}/`)) return null
  if (!contentType.startsWith("image/")) return null

  return {
    label,
    title,
    imageUrl: buildMockupImageProxyUrl({ projectId, storagePath }),
    storagePath,
    description,
    contentType,
    ...(screens.length > 0 ? { screens } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  }
}

function normalizeScreens(value: unknown): OpenRouterImageMockupScreen[] {
  if (!Array.isArray(value)) return []
  return value
    .map((screen) => {
      if (!screen || typeof screen !== "object") return null
      const record = screen as Record<string, unknown>
      const name = typeof record.name === "string" ? record.name.trim() : ""
      const caption = typeof record.caption === "string" ? record.caption.trim() : ""
      if (!name || !caption) return null
      return {
        name,
        caption,
        ...(typeof record.purpose === "string" && record.purpose.trim()
          ? { purpose: record.purpose.trim() }
          : {}),
        ...(typeof record.happyPathState === "string" && record.happyPathState.trim()
          ? { happyPathState: record.happyPathState.trim() }
          : {}),
      }
    })
    .filter((screen): screen is OpenRouterImageMockupScreen => Boolean(screen))
}

export async function POST(request: Request) {
  const requestLogContext = buildRequestLogContext(request)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logWarn("MockupFinalize", "unauthorized", requestLogContext)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userLogContext = { ...requestLogContext, userId: user.id }
    const body = await request.json()
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : ""
    const model = typeof body.model === "string" ? body.model.trim() : ""
    const runId = typeof body.runId === "string" ? body.runId.trim() : ""
    const rawOptions: unknown[] = Array.isArray(body.options) ? body.options : []
    let designPlan: unknown = null
    if (body.designPlan && typeof body.designPlan === "object") {
      try {
        designPlan = parseMockupDesignPlan(JSON.stringify(body.designPlan))
      } catch {
        logWarn("MockupFinalize", "invalid_design_plan", userLogContext)
        return NextResponse.json({ error: "Invalid mockup design plan" }, { status: 400 })
      }
    }

    const mockupLogContext = {
      ...userLogContext,
      projectId,
      runId,
      model,
    }
    logInfo("MockupFinalize", "request_started", {
      ...mockupLogContext,
      rawOptionCount: rawOptions.length,
      hasDesignPlan: Boolean(designPlan),
    })

    if (!projectId || !model || !runId) {
      logWarn("MockupFinalize", "validation_failed", {
        ...mockupLogContext,
        hasProjectId: Boolean(projectId),
        hasModel: Boolean(model),
        hasRunId: Boolean(runId),
      })
      return NextResponse.json(
        { error: "projectId, model, and runId are required" },
        { status: 400 },
      )
    }
    if (model.length > 160 || runId.length > 120 || !SAFE_RUN_ID.test(runId)) {
      logWarn("MockupFinalize", "unsupported_values", {
        ...mockupLogContext,
        modelLength: model.length,
        runIdLength: runId.length,
        runIdFormatValid: SAFE_RUN_ID.test(runId),
      })
      return NextResponse.json(
        { error: "model and runId must use supported values" },
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
      logWarn("MockupFinalize", "project_not_found", mockupLogContext)
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const documentIdentity = getActiveDocumentIdentity("mockups")
    if (documentIdentity) {
      const existingDocument = await findLatestActiveDocument(supabase, projectId, documentIdentity)
      if (existingDocument) {
        logInfo("MockupFinalize", "skipped_existing", {
          ...mockupLogContext,
          outputTable: existingDocument.outputTable,
          outputId: existingDocument.outputId,
        })
        return NextResponse.json(createSkippedActiveDocumentPayload(existingDocument))
      }
    }

    const options = rawOptions
      .map((option: unknown) => normalizeOption(option, projectId))
      .filter((option: OpenRouterImageMockupOption | null): option is OpenRouterImageMockupOption => Boolean(option))
      .sort((left: OpenRouterImageMockupOption, right: OpenRouterImageMockupOption) =>
        EXPECTED_LABELS.indexOf(left.label) - EXPECTED_LABELS.indexOf(right.label)
      )

    const labels = new Set(options.map((option) => option.label))
    if (options.length !== EXPECTED_LABELS.length || EXPECTED_LABELS.some((label) => !labels.has(label))) {
      logWarn("MockupFinalize", "missing_options", {
        ...mockupLogContext,
        optionCount: options.length,
        labels: [...labels],
      })
      return NextResponse.json(
        { error: "All three mockup options are required before finalizing" },
        { status: 400 },
      )
    }

    const generatedAt = new Date().toISOString()
    const content: OpenRouterImageMockupContent = {
      type: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
      model,
      generatedAt,
      options,
    }
    const metadata = {
      source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
      model,
      storage_bucket: MOCKUP_STORAGE_BUCKET,
      storage_run_id: runId,
      generated_at: generatedAt,
      ...(designPlan ? { design_plan: designPlan as Json } : {}),
      generation_mode: "option_invocations",
    } satisfies Record<string, Json>

    const { data, error: insertError } = await supabase
      .from("mockups")
      .insert({
        project_id: projectId,
        content: JSON.stringify(content),
        model_used: model,
        metadata,
      })
      .select("id")
      .single()

    if (insertError || !data?.id) {
      throw new Error(`Failed to save generated mockups: ${insertError?.message ?? "missing output id"}`)
    }
    logInfo("MockupFinalize", "mockups_saved", {
      ...mockupLogContext,
      outputId: data.id,
      optionCount: options.length,
    })

    await supabase
      .from("projects")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", projectId)

    return NextResponse.json({
      id: data.id,
      content: JSON.stringify(content),
      model,
      source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
    })
  } catch (error) {
    logError("MockupFinalize", "request_failed", error, requestLogContext)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save mockups" },
      { status: 500 },
    )
  }
}

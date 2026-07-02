import { NextResponse } from "next/server"

import {
  MOCKUP_STORAGE_BUCKET,
  OPENROUTER_MOCKUP_OPTION_CONFIGS,
  getOpenRouterMockupImageModel,
} from "@/lib/openrouter-image-mockup-pipeline"
import {
  OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
  type OpenRouterImageMockupScreen,
} from "@/lib/openrouter-image-mockup-format"
import { parseMockupDesignPlan } from "@/lib/mockup-design-plan"
import { getMockupOptionDrafts, insertMockupOptionDraftIfMissing } from "@/lib/mockup-option-drafts"
import { buildStorageRecoveredMockupOptions, mergeRecoveredMockupOptions } from "@/lib/mockup-option-recovery"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { buildRequestLogContext, logError, logInfo, logWarn } from "@/lib/logger"

export const maxDuration = 60

const SAFE_RUN_ID = /^[A-Za-z0-9_-]+$/

function getScreensFromDesignPlan(value: unknown): OpenRouterImageMockupScreen[] | undefined {
  if (!value || typeof value !== "object") return undefined
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.screens)) return undefined

  const screens = record.screens
    .map((screen) => {
      if (!screen || typeof screen !== "object") return null
      const screenRecord = screen as Record<string, unknown>
      const name = typeof screenRecord.name === "string" ? screenRecord.name.trim() : ""
      const caption = typeof screenRecord.caption === "string" ? screenRecord.caption.trim() : ""
      if (!name || !caption) return null
      return {
        name,
        caption,
        ...(typeof screenRecord.purpose === "string" && screenRecord.purpose.trim()
          ? { purpose: screenRecord.purpose.trim() }
          : {}),
        ...(typeof screenRecord.happyPathState === "string" && screenRecord.happyPathState.trim()
          ? { happyPathState: screenRecord.happyPathState.trim() }
          : {}),
      }
    })
    .filter((screen): screen is OpenRouterImageMockupScreen => Boolean(screen))

  return screens.length > 0 ? screens : undefined
}

export async function POST(request: Request) {
  const requestLogContext = buildRequestLogContext(request)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logWarn("MockupRecover", "unauthorized", requestLogContext)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userLogContext = { ...requestLogContext, userId: user.id }
    const body = await request.json()
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : ""
    const runId = typeof body.runId === "string" ? body.runId.trim() : ""
    let screens: OpenRouterImageMockupScreen[] | undefined
    if (body.designPlan && typeof body.designPlan === "object") {
      try {
        screens = getScreensFromDesignPlan(parseMockupDesignPlan(JSON.stringify(body.designPlan)))
      } catch {
        logWarn("MockupRecover", "invalid_design_plan", userLogContext)
        return NextResponse.json({ error: "Invalid mockup design plan" }, { status: 400 })
      }
    }

    const mockupLogContext = { ...userLogContext, projectId, runId }
    logInfo("MockupRecover", "request_started", {
      ...mockupLogContext,
      hasScreens: Boolean(screens?.length),
    })

    if (!projectId || !runId || !SAFE_RUN_ID.test(runId)) {
      logWarn("MockupRecover", "validation_failed", {
        ...mockupLogContext,
        hasProjectId: Boolean(projectId),
        hasRunId: Boolean(runId),
        runIdFormatValid: SAFE_RUN_ID.test(runId),
      })
      return NextResponse.json({ error: "projectId and a valid runId are required" }, { status: 400 })
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      logWarn("MockupRecover", "project_not_found", mockupLogContext)
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const draftOptions = await getMockupOptionDrafts({
      supabase,
      projectId,
      userId: user.id,
      runId,
    })
    const model = getOpenRouterMockupImageModel()

    if (draftOptions.length === OPENROUTER_MOCKUP_OPTION_CONFIGS.length) {
      logInfo("MockupRecover", "draft_options_recovered", {
        ...mockupLogContext,
        optionCount: draftOptions.length,
        labels: draftOptions.map((option) => option.label),
      })
      return NextResponse.json({
        options: draftOptions,
        model,
        source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
        runId,
      })
    }

    const storageSupabase = createServiceClient()
    const prefix = `${projectId}/${runId}`
    const { data: files, error } = await storageSupabase.storage
      .from(MOCKUP_STORAGE_BUCKET)
      .list(prefix, { limit: 20 })

    if (error) {
      throw new Error(`Failed to inspect saved mockup images: ${error.message}`)
    }
    logInfo("MockupRecover", "storage_listed", {
      ...mockupLogContext,
      fileCount: files?.length ?? 0,
    })

    const storageOptions = buildStorageRecoveredMockupOptions({
      files: files ?? [],
      projectId,
      runId,
      screens,
    })
    const draftLabels = new Set(draftOptions.map((option) => option.label.toUpperCase()))
    const storageOptionsToBackfill = storageOptions.filter(
      (option) => !draftLabels.has(option.label.toUpperCase()),
    )

    for (const option of storageOptionsToBackfill) {
      await insertMockupOptionDraftIfMissing({
        supabase,
        projectId,
        userId: user.id,
        runId,
        option,
        model,
      })
    }
    const options = mergeRecoveredMockupOptions({ draftOptions, storageOptions })

    logInfo("MockupRecover", "options_recovered", {
      ...mockupLogContext,
      optionCount: options.length,
      draftOptionCount: draftOptions.length,
      storageOptionCount: storageOptions.length,
      storageBackfillCount: storageOptionsToBackfill.length,
      labels: options.map((option) => option.label),
    })
    return NextResponse.json({
      options,
      model,
      source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
      runId,
    })
  } catch (error) {
    logError("MockupRecover", "request_failed", error, requestLogContext)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to recover generated mockup options" },
      { status: 500 },
    )
  }
}

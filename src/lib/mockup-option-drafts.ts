import type { SupabaseClient } from "@supabase/supabase-js"

import {
  OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
  buildMockupImageProxyUrl,
  isValidDraftMockupImagePath,
  type OpenRouterImageMockupOption,
  type OpenRouterImageMockupScreen,
} from "@/lib/openrouter-image-mockup-format"
import type { MockupDesignPlan } from "@/lib/mockup-design-plan"
import type { Database, Json } from "@/types/database"

type ServerSupabaseClient = SupabaseClient<Database>
type MockupOptionDraftRow = Database["public"]["Tables"]["mockup_option_drafts"]["Row"]

export const MOCKUP_DRAFT_OPTION_LABELS = ["A", "B", "C"] as const
export type MockupDraftOptionLabel = typeof MOCKUP_DRAFT_OPTION_LABELS[number]

const MOCKUP_DRAFT_LABEL_SET = new Set<string>(MOCKUP_DRAFT_OPTION_LABELS)

export function isMockupDraftOptionLabel(value: unknown): value is MockupDraftOptionLabel {
  return typeof value === "string" && MOCKUP_DRAFT_LABEL_SET.has(value.toUpperCase())
}

export function normalizeMockupDraftOptionRows({
  rows,
  projectId,
  runId,
}: {
  rows: MockupOptionDraftRow[]
  projectId: string
  runId: string
}) {
  const optionsByLabel = new Map<MockupDraftOptionLabel, OpenRouterImageMockupOption>()

  for (const row of rows) {
    const option = normalizeMockupDraftOptionRow({ row, projectId, runId })
    if (option) {
      optionsByLabel.set(option.label as MockupDraftOptionLabel, option)
    }
  }

  return MOCKUP_DRAFT_OPTION_LABELS
    .map((label) => optionsByLabel.get(label))
    .filter((option): option is OpenRouterImageMockupOption => Boolean(option))
}

export function normalizeMockupDraftOptionRow({
  row,
  projectId,
  runId,
}: {
  row: MockupOptionDraftRow
  projectId: string
  runId: string
}) {
  const option = normalizeStoredOption(row.option_json)
  if (!option) return null

  const rowLabel = row.option_label.toUpperCase()
  const optionLabel = option.label.toUpperCase()
  if (!isMockupDraftOptionLabel(rowLabel) || rowLabel !== optionLabel) return null
  if (
    !isValidDraftMockupImagePath({
      projectId,
      storagePath: option.storagePath,
      draftRunId: runId,
    })
  ) {
    return null
  }

  return {
    ...option,
    label: rowLabel,
    imageUrl: buildMockupImageProxyUrl({
      projectId,
      storagePath: option.storagePath,
      draftRunId: runId,
    }),
  }
}

export async function upsertMockupOptionDraft({
  supabase,
  projectId,
  userId,
  runId,
  option,
  model,
  designPlan,
}: {
  supabase: ServerSupabaseClient
  projectId: string
  userId: string
  runId: string
  option: OpenRouterImageMockupOption
  model: string
  designPlan?: MockupDesignPlan | unknown
}) {
  const label = option.label.toUpperCase()
  if (!isMockupDraftOptionLabel(label)) {
    throw new Error(`Unsupported mockup draft option label: ${option.label}`)
  }
  if (
    !isValidDraftMockupImagePath({
      projectId,
      storagePath: option.storagePath,
      draftRunId: runId,
    })
  ) {
    throw new Error("Mockup draft option storage path is invalid")
  }

  const { error } = await supabase
    .from("mockup_option_drafts")
    .upsert({
      project_id: projectId,
      user_id: userId,
      run_id: runId,
      option_label: label,
      option_json: toJson(option),
      model_used: model,
      source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
      design_plan: designPlan ? toJson(designPlan) : null,
    }, {
      onConflict: "project_id,run_id,option_label",
    })

  if (error) {
    throw new Error(`Failed to save mockup option draft: ${error.message}`)
  }
}

export async function getMockupOptionDrafts({
  supabase,
  projectId,
  userId,
  runId,
}: {
  supabase: ServerSupabaseClient
  projectId: string
  userId: string
  runId: string
}) {
  const { data, error } = await supabase
    .from("mockup_option_drafts")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("run_id", runId)
    .order("option_label", { ascending: true })

  if (error) {
    throw new Error(`Failed to load mockup option drafts: ${error.message}`)
  }

  return normalizeMockupDraftOptionRows({
    rows: data ?? [],
    projectId,
    runId,
  })
}

export async function isMockupDraftImagePathOwned({
  supabase,
  projectId,
  userId,
  runId,
  storagePath,
}: {
  supabase: ServerSupabaseClient
  projectId: string
  userId: string
  runId: string
  storagePath: string
}) {
  if (!isValidDraftMockupImagePath({ projectId, storagePath, draftRunId: runId })) {
    return false
  }

  const { data, error } = await supabase
    .from("mockup_option_drafts")
    .select("option_label, option_json")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("run_id", runId)

  if (error) {
    throw new Error(`Failed to verify mockup draft image ownership: ${error.message}`)
  }

  return (data ?? []).some((row) => {
    const option = normalizeStoredOption(row.option_json)
    return option?.storagePath === storagePath
  })
}

export async function deleteMockupOptionDrafts({
  supabase,
  projectId,
  userId,
  runId,
}: {
  supabase: ServerSupabaseClient
  projectId: string
  userId: string
  runId: string
}) {
  const { error } = await supabase
    .from("mockup_option_drafts")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("run_id", runId)

  if (error) {
    throw new Error(`Failed to clean up mockup option drafts: ${error.message}`)
  }
}

function normalizeStoredOption(value: Json): OpenRouterImageMockupOption | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const record = value as Record<string, Json | undefined>
  const label = typeof record.label === "string" ? record.label.trim().toUpperCase() : ""
  const title = typeof record.title === "string" ? record.title.trim() : ""
  const storagePath = typeof record.storagePath === "string" ? record.storagePath.trim() : ""
  const description = typeof record.description === "string" ? record.description.trim() : ""
  const contentType = typeof record.contentType === "string" ? record.contentType.trim() : "image/png"
  const screens = normalizeScreens(record.screens)
  const width = readPositiveNumber(record.width)
  const height = readPositiveNumber(record.height)

  if (!isMockupDraftOptionLabel(label) || !title || !storagePath) return null
  if (!contentType.startsWith("image/") || contentType === "image/svg+xml") return null

  return {
    label,
    title,
    imageUrl: "",
    storagePath,
    description,
    contentType,
    ...(screens.length > 0 ? { screens } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  }
}

function normalizeScreens(value: Json | undefined): OpenRouterImageMockupScreen[] {
  if (!Array.isArray(value)) return []

  return value
    .map((screen) => {
      if (!screen || typeof screen !== "object" || Array.isArray(screen)) return null

      const record = screen as Record<string, Json | undefined>
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

function readPositiveNumber(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json
}

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
  buildMockupImageProxyUrl,
  getStoragePathsFromOpenRouterImageMockupContent,
  isValidDraftMockupImagePath,
  type OpenRouterImageMockupOption,
  type OpenRouterImageMockupScreen,
} from "@/lib/mockups/openrouter-image-format"
import type { MockupDesignPlan } from "@/lib/mockups/design-plan"
import type { Database, Json } from "@/types/database"

type ServerSupabaseClient = SupabaseClient<Database>
type MockupOptionDraftRow = Database["public"]["Tables"]["mockup_option_drafts"]["Row"]
type MockupRow = Pick<Database["public"]["Tables"]["mockups"]["Row"], "content" | "metadata">

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

export async function insertMockupOptionDraftIfMissing({
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
      ignoreDuplicates: true,
    })

  if (error) {
    throw new Error(`Failed to save missing mockup option draft: ${error.message}`)
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
  storageSupabase = supabase,
  projectId,
  userId,
  runId,
  deleteStorageObjects = false,
}: {
  supabase: ServerSupabaseClient
  storageSupabase?: ServerSupabaseClient
  projectId: string
  userId: string
  runId: string
  deleteStorageObjects?: boolean
}) {
  let rows: MockupOptionDraftRow[] = []
  if (deleteStorageObjects) {
    const { data, error: loadError } = await supabase
      .from("mockup_option_drafts")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .eq("run_id", runId)
      .limit(200)

    if (loadError) {
      throw new Error(`Failed to load mockup option drafts for cleanup: ${loadError.message}`)
    }
    rows = data ?? []
  }

  let deletedStorageObjects = 0
  if (rows.length > 0) {
    const { data: canonicalRows, error: canonicalError } = await supabase
      .from("mockups")
      .select("content, metadata")
      .eq("project_id", projectId)

    if (canonicalError) {
      throw new Error(`Failed to inspect canonical mockups before draft cleanup: ${canonicalError.message}`)
    }

    const referenced = getCanonicalMockupReferences(canonicalRows ?? [])
    const storagePaths = referenced.runIds.has(runId)
      ? []
      : rows
          .map((row) => normalizeMockupDraftOptionRow({ row, projectId, runId })?.storagePath)
          .filter((path): path is string => Boolean(path))
          .filter((path) => !referenced.storagePaths.has(path))

    if (storagePaths.length > 0) {
      const { error: storageError } = await storageSupabase.storage
        .from(process.env.SUPABASE_MOCKUP_STORAGE_BUCKET || "mockups")
        .remove(storagePaths)

      if (storageError) {
        throw new Error(`Failed to remove mockup draft images: ${storageError.message}`)
      }
      deletedStorageObjects = storagePaths.length
    }
  }

  const { error } = await supabase
    .from("mockup_option_drafts")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("run_id", runId)

  if (error) {
    throw new Error(`Failed to clean up mockup option drafts: ${error.message}`)
  }

  return {
    rowCount: deleteStorageObjects ? rows.length : 0,
    storageObjectCount: deletedStorageObjects,
  }
}

export async function cleanupAbandonedMockupOptionDrafts({
  supabase,
  storageSupabase = supabase,
  projectId,
  userId,
  olderThan = new Date(Date.now() - 24 * 60 * 60 * 1000),
  excludeRunId,
}: {
  supabase: ServerSupabaseClient
  storageSupabase?: ServerSupabaseClient
  projectId: string
  userId: string
  olderThan?: Date
  excludeRunId?: string
}) {
  const { data: rows, error } = await supabase
    .from("mockup_option_drafts")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .lt("updated_at", olderThan.toISOString())
    .limit(200)

  if (error) {
    throw new Error(`Failed to load abandoned mockup option drafts: ${error.message}`)
  }

  const candidateRows = (rows ?? []).filter((row) => row.run_id !== excludeRunId)
  if (candidateRows.length === 0) {
    return { runCount: 0, rowCount: 0, storageObjectCount: 0 }
  }

  const { data: canonicalRows, error: canonicalError } = await supabase
    .from("mockups")
    .select("content, metadata")
    .eq("project_id", projectId)

  if (canonicalError) {
    throw new Error(`Failed to inspect canonical mockups before draft cleanup: ${canonicalError.message}`)
  }

  const referenced = getCanonicalMockupReferences(canonicalRows ?? [])
  const protectedRunIds = new Set(referenced.runIds)
  for (const row of candidateRows) {
    const option = normalizeMockupDraftOptionRow({ row, projectId, runId: row.run_id })
    if (option && referenced.storagePaths.has(option.storagePath)) {
      protectedRunIds.add(row.run_id)
    }
  }

  const rowsByRunId = new Map<string, MockupOptionDraftRow[]>()
  for (const row of candidateRows) {
    if (protectedRunIds.has(row.run_id)) continue
    const option = normalizeMockupDraftOptionRow({ row, projectId, runId: row.run_id })
    if (!option) continue

    const existing = rowsByRunId.get(row.run_id) ?? []
    existing.push(row)
    rowsByRunId.set(row.run_id, existing)
  }

  let deletedRows = 0
  let deletedStorageObjects = 0

  for (const [runId, runRows] of rowsByRunId) {
    const storagePaths = runRows
      .map((row) => normalizeMockupDraftOptionRow({ row, projectId, runId })?.storagePath)
      .filter((path): path is string => Boolean(path))

    if (storagePaths.length > 0) {
      const { error: storageError } = await storageSupabase.storage
        .from(process.env.SUPABASE_MOCKUP_STORAGE_BUCKET || "mockups")
        .remove(storagePaths)

      if (storageError) {
        throw new Error(`Failed to remove abandoned mockup draft images: ${storageError.message}`)
      }
      deletedStorageObjects += storagePaths.length
    }

    const { error: deleteError } = await supabase
      .from("mockup_option_drafts")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .eq("run_id", runId)

    if (deleteError) {
      throw new Error(`Failed to delete abandoned mockup option draft rows: ${deleteError.message}`)
    }
    deletedRows += runRows.length
  }

  return {
    runCount: rowsByRunId.size,
    rowCount: deletedRows,
    storageObjectCount: deletedStorageObjects,
  }
}

function getCanonicalMockupReferences(rows: MockupRow[]) {
  const runIds = new Set<string>()
  const storagePaths = new Set<string>()

  for (const row of rows) {
    const metadata = row.metadata
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
      const storageRunId = (metadata as Record<string, Json | undefined>).storage_run_id
      if (typeof storageRunId === "string" && storageRunId.trim()) {
        runIds.add(storageRunId.trim())
      }
    }
    for (const storagePath of getStoragePathsFromOpenRouterImageMockupContent(row.content)) {
      storagePaths.add(storagePath)
    }
  }

  return { runIds, storagePaths }
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

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  DOCUMENT_DEFINITION_MAP,
  GENERATE_ALL_DEFAULT_MODELS,
  GENERATE_ALL_QUEUE_ORDER,
  isDocumentType,
  type DocumentType,
} from "@/lib/document-definitions"
import { GENERATE_ALL_ACTION_MAP, getTokenCost } from "@/lib/token-economics"
import type { Database, Json } from "@/types/database"

export type GenerationQueueStatus =
  | "queued"
  | "running"
  | "partial"
  | "completed"
  | "cancelled"
  | "error"

export type GenerationQueueItemStatus =
  | "pending"
  | "generating"
  | "done"
  | "skipped"
  | "cancelled"
  | "error"
  | "blocked"

export type GenerationQueueRow = Database["public"]["Tables"]["generation_queues"]["Row"]
export type GenerationQueueItemRow = Database["public"]["Tables"]["generation_queue_items"]["Row"]
export type GenerationQueueItemInsert = Database["public"]["Tables"]["generation_queue_items"]["Insert"]
export type GenerationQueueItemUpdate = Database["public"]["Tables"]["generation_queue_items"]["Update"]
type ServerSupabaseClient = SupabaseClient<Database>
// OpenRouter image mockups can run for several minutes, so the stale lease
// must outlast the longest supported request timeout while still recovering
// from browser disconnects or killed route handlers.
const STALE_GENERATING_MS = 270 * 1000
export const MANUAL_GENERATION_SOURCE = "manual"

export interface QueueJsonItem {
  docType: DocumentType
  label: string
  status: GenerationQueueItemStatus
  creditCost: number
  stageMessage?: string
  error?: string
  runId?: string
  source?: string
  idempotencyKey?: string
  dependsOn?: DocumentType[]
  attempt?: number
  maxAttempts?: number
  startedAt?: string
  completedAt?: string
  outputTable?: string
  outputId?: string
  creditStatus?: string
  modelId?: string
}

export function parseQueueJson(value: Json | null | undefined): QueueJsonItem[] {
  if (!Array.isArray(value)) return []

  const parsed: QueueJsonItem[] = []
  for (const item of value) {
    const record = asRecord(item)
    if (!record || typeof record.docType !== "string") continue
    if (!isDocumentType(record.docType)) continue

    parsed.push({
      docType: record.docType,
      label: typeof record.label === "string" ? record.label : record.docType,
      status: normalizeItemStatus(record.status),
      creditCost: typeof record.creditCost === "number" ? record.creditCost : 0,
      stageMessage: typeof record.stageMessage === "string" ? record.stageMessage : undefined,
      error: typeof record.error === "string" ? record.error : undefined,
      runId: typeof record.runId === "string" ? record.runId : undefined,
      source: typeof record.source === "string" ? record.source : undefined,
      idempotencyKey: typeof record.idempotencyKey === "string" ? record.idempotencyKey : undefined,
      dependsOn: parseDependsOn(record.dependsOn, record.docType),
      attempt: typeof record.attempt === "number" ? record.attempt : undefined,
      maxAttempts: typeof record.maxAttempts === "number" ? record.maxAttempts : undefined,
      startedAt: typeof record.startedAt === "string" ? record.startedAt : undefined,
      completedAt: typeof record.completedAt === "string" ? record.completedAt : undefined,
      outputTable: typeof record.outputTable === "string" ? record.outputTable : undefined,
      outputId: typeof record.outputId === "string" ? record.outputId : undefined,
      creditStatus: typeof record.creditStatus === "string" ? record.creditStatus : undefined,
      modelId: typeof record.modelId === "string" ? record.modelId : undefined,
    })
  }

  return parsed
}

export function buildManualGenerationQueue(queue: QueueJsonItem[]): QueueJsonItem[] {
  const seen = new Set<DocumentType>()
  const allowedTypes = new Set<DocumentType>(GENERATE_ALL_QUEUE_ORDER)
  const incomingByType = new Map(queue.map((item) => [item.docType, item]))
  const orderedDocTypes = [
    ...GENERATE_ALL_QUEUE_ORDER.filter((docType) => incomingByType.has(docType)),
    ...queue
      .map((item) => item.docType)
      .filter((docType) => !GENERATE_ALL_QUEUE_ORDER.includes(docType)),
  ]

  return orderedDocTypes.flatMap((docType) => {
    if (seen.has(docType) || !allowedTypes.has(docType)) return []
    seen.add(docType)

    const incoming = incomingByType.get(docType)
    if (!incoming) return []

    const status: GenerationQueueItemStatus = incoming.status === "skipped" ? "skipped" : "pending"
    const modelId = GENERATE_ALL_DEFAULT_MODELS[docType]
    const action = GENERATE_ALL_ACTION_MAP[docType]
    const creditCost = status === "skipped" || !action ? 0 : getTokenCost(action, modelId)

    return [{
      docType,
      label: DOCUMENT_DEFINITION_MAP[docType].label,
      status,
      creditCost,
      dependsOn: getDefaultDependsOn(docType),
      attempt: 0,
      maxAttempts: 1,
      modelId,
      source: MANUAL_GENERATION_SOURCE,
      creditStatus: status === "skipped" || creditCost === 0 ? "not_charged" : "unprocessed",
    }]
  })
}

export function queueItemRowToJson(item: GenerationQueueItemRow): QueueJsonItem {
  return {
    docType: isDocumentType(item.doc_type) ? item.doc_type : "competitive",
    label: item.label,
    status: normalizeItemStatus(item.status),
    creditCost: item.credit_cost,
    stageMessage: item.stage_message ?? undefined,
    error: item.error ?? undefined,
    runId: item.run_id ?? undefined,
    source: item.source ?? undefined,
    idempotencyKey: item.idempotency_key,
    dependsOn: item.depends_on.filter(isDocumentType),
    attempt: item.attempt,
    maxAttempts: item.max_attempts,
    startedAt: item.started_at ?? undefined,
    completedAt: item.completed_at ?? undefined,
    outputTable: item.output_table ?? undefined,
    outputId: item.output_id ?? undefined,
    creditStatus: item.credit_status,
    modelId: item.model_id ?? undefined,
  }
}

export async function createGenerationQueueItems(
  supabase: ServerSupabaseClient,
  queueRow: Pick<GenerationQueueRow, "id" | "project_id" | "user_id" | "model_selections">,
  queue: QueueJsonItem[],
) {
  if (queue.length === 0) return []

  const runId = getRunMetadata(queueRow.model_selections).runId
  const rows: GenerationQueueItemInsert[] = queue.map((item) => ({
    queue_id: queueRow.id,
    project_id: queueRow.project_id,
    user_id: queueRow.user_id,
    run_id: item.runId ?? runId ?? null,
    doc_type: item.docType,
    label: item.label,
    status: item.status,
    credit_cost: item.creditCost,
    credit_status: item.creditStatus ?? (item.creditCost === 0 ? "not_charged" : "unprocessed"),
    depends_on: item.dependsOn ?? getDefaultDependsOn(item.docType),
    attempt: item.attempt ?? 0,
    max_attempts: item.maxAttempts ?? 1,
    stage_message: item.stageMessage ?? null,
    error: item.error ?? null,
    output_table: item.outputTable ?? null,
    output_id: item.outputId ?? null,
    model_id: item.modelId ?? null,
    source: item.source ?? null,
    idempotency_key: item.idempotencyKey ?? `${queueRow.id}:${item.docType}`,
    started_at: item.startedAt ?? null,
    completed_at: item.completedAt ?? null,
  }))

  const { data, error } = await supabase
    .from("generation_queue_items")
    .insert(rows)
    .select("*")

  if (error) throw error
  return data ?? []
}

export async function replaceGenerationQueueItems(
  supabase: ServerSupabaseClient,
  queueRow: GenerationQueueRow,
  queue: QueueJsonItem[],
) {
  const { error } = await supabase
    .from("generation_queue_items")
    .delete()
    .eq("queue_id", queueRow.id)
    .eq("user_id", queueRow.user_id)

  if (error) throw error

  return createGenerationQueueItems(supabase, queueRow, queue)
}

export async function getGenerationQueueItems(
  supabase: ServerSupabaseClient,
  queueRow: GenerationQueueRow,
) {
  const { data, error } = await supabase
    .from("generation_queue_items")
    .select("*")
    .eq("queue_id", queueRow.id)
    .eq("user_id", queueRow.user_id)
    .order("created_at", { ascending: true })

  if (error) throw error
  if (data && data.length > 0) return sortItemsByQueueOrder(data, parseQueueJson(queueRow.queue))

  const created = await createGenerationQueueItems(
    supabase,
    queueRow,
    parseQueueJson(queueRow.queue),
  )
  return sortItemsByQueueOrder(created, parseQueueJson(queueRow.queue))
}

export async function syncGenerationQueueJson(
  supabase: ServerSupabaseClient,
  queueRow: Pick<GenerationQueueRow, "id" | "project_id" | "user_id">,
  items: GenerationQueueItemRow[],
  extra: Database["public"]["Tables"]["generation_queues"]["Update"] = {},
) {
  const orderedItems = sortItemsByQueueOrder(items, items.map(queueItemRowToJson))
  const queue = orderedItems.map(queueItemRowToJson)
  const currentIndex = queue.findIndex((item) => item.status === "pending" || item.status === "generating")

  const { error } = await supabase
    .from("generation_queues")
    .update({
      queue: queue as unknown as Database["public"]["Tables"]["generation_queues"]["Update"]["queue"],
      current_index: currentIndex === -1 ? queue.length : currentIndex,
      ...extra,
    })
    .eq("id", queueRow.id)
    .eq("project_id", queueRow.project_id)
    .eq("user_id", queueRow.user_id)

  if (error) throw error
}

export async function updateGenerationQueueItem(
  supabase: ServerSupabaseClient,
  item: Pick<GenerationQueueItemRow, "id" | "user_id">,
  update: GenerationQueueItemUpdate,
) {
  const { data, error } = await supabase
    .from("generation_queue_items")
    .update(update)
    .eq("id", item.id)
    .eq("user_id", item.user_id)
    .select("*")
    .single()

  if (error) throw error
  return data
}

export async function updateGenerationQueueItemIfStatus(
  supabase: ServerSupabaseClient,
  item: Pick<GenerationQueueItemRow, "id" | "user_id">,
  expectedStatus: GenerationQueueItemStatus,
  update: GenerationQueueItemUpdate,
) {
  const { data, error } = await supabase
    .from("generation_queue_items")
    .update(update)
    .eq("id", item.id)
    .eq("user_id", item.user_id)
    .eq("status", expectedStatus)
    .select("*")
    .maybeSingle()

  if (error) throw error
  return data
}

export async function claimGenerationQueueItem(
  supabase: ServerSupabaseClient,
  item: GenerationQueueItemRow,
) {
  const { data, error } = await supabase
    .from("generation_queue_items")
    .update({
      status: "generating",
      stage_message: "Generating...",
      started_at: item.started_at ?? new Date().toISOString(),
      error: null,
    })
    .eq("id", item.id)
    .eq("user_id", item.user_id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle()

  if (error) throw error
  return data
}

export async function recoverStaleGenerationQueueItems(
  supabase: ServerSupabaseClient,
  items: GenerationQueueItemRow[],
  staleAfterMs = STALE_GENERATING_MS,
) {
  const staleBefore = Date.now() - staleAfterMs
  const staleItems = items.filter((item) => {
    if (item.status !== "generating") return false
    const referenceTime = item.updated_at ?? item.started_at
    if (!referenceTime) return false
    return new Date(referenceTime).getTime() < staleBefore
  })

  if (staleItems.length === 0) return []

  return Promise.all(
    staleItems.map((item) =>
      updateGenerationQueueItemIfStatus(supabase, item, "generating", {
        status: "pending",
        stage_message: "Retrying interrupted generation",
        error: null,
        started_at: null,
        attempt: Math.max(0, Math.min(item.attempt, item.max_attempts - 1)),
      }),
    ),
  ).then((updatedItems) =>
    updatedItems.filter((item): item is GenerationQueueItemRow => Boolean(item)),
  )
}

export async function resetGenerationQueueItemsForRetry(
  supabase: ServerSupabaseClient,
  items: GenerationQueueItemRow[],
  options: {
    source?: string
    creditStatus?: string
    creditCost?: number
    maxAttempts?: number
  } = {},
) {
  const resettableItems = items.filter((item) =>
    item.status === "pending" ||
    item.status === "error" ||
    item.status === "blocked" ||
    item.status === "cancelled"
  )

  if (resettableItems.length === 0) return []

  return Promise.all(
    resettableItems.map((item) =>
      updateGenerationQueueItem(supabase, item, {
        status: "pending",
        stage_message: null,
        error: null,
        started_at: null,
        completed_at: null,
        output_table: null,
        output_id: null,
        attempt: 0,
        ...(options.source !== undefined ? { source: options.source } : {}),
        ...(options.creditStatus !== undefined ? { credit_status: options.creditStatus } : {}),
        ...(options.creditCost !== undefined ? { credit_cost: options.creditCost } : {}),
        ...(options.maxAttempts !== undefined ? { max_attempts: options.maxAttempts } : {}),
      }),
    ),
  )
}

export function computeQueueStatus(items: GenerationQueueItemRow[]): GenerationQueueStatus {
  if (items.length === 0) return "completed"
  if (items.some((item) => item.status === "generating")) return "running"
  if (items.every((item) => item.status === "cancelled")) return "cancelled"
  if (
    items.some((item) => item.status === "cancelled") &&
    items.every((item) =>
      item.status === "done" ||
      item.status === "skipped" ||
      item.status === "cancelled"
    )
  ) {
    return "cancelled"
  }
  if (items.every((item) => item.status === "done" || item.status === "skipped")) return "completed"
  if (items.some((item) => item.status === "pending")) return "running"
  if (items.some((item) => item.status === "done" || item.status === "skipped")) {
    if (items.some((item) => item.status === "error" || item.status === "blocked")) return "partial"
  }
  if (items.some((item) => item.status === "error" || item.status === "blocked")) return "error"
  return "running"
}

export function getRunnableItems(items: GenerationQueueItemRow[], maxItems: number) {
  const doneDocTypes = new Set(
    items
      .filter((item) => item.status === "done" || item.status === "skipped")
      .map((item) => item.doc_type),
  )

  return items
    .filter((item) => item.status === "pending")
    .filter((item) => item.depends_on.every((docType) => doneDocTypes.has(docType)))
    .slice(0, maxItems)
}

export function getBlockedItems(items: GenerationQueueItemRow[]) {
  const docTypes = new Set(items.map((item) => item.doc_type))
  const failedDocTypes = new Set(
    items
      .filter((item) => item.status === "error" || item.status === "blocked")
      .map((item) => item.doc_type),
  )

  return items
    .filter((item) => item.status === "pending")
    .filter((item) =>
      item.depends_on.some((docType) => failedDocTypes.has(docType) || !docTypes.has(docType))
    )
}

export function getRunMetadata(value: Json | null | undefined) {
  const metadata = asRecord(value)
  return {
    mode: typeof metadata?.mode === "string" ? metadata.mode : null,
    source: typeof metadata?.source === "string" ? metadata.source : null,
    runId: typeof metadata?.runId === "string" ? metadata.runId : null,
  }
}

function sortItemsByQueueOrder<T extends { doc_type?: string; docType?: string }>(
  items: T[],
  queue: QueueJsonItem[],
) {
  const order = new Map(queue.map((item, index) => [item.docType, index]))
  return [...items].sort((a, b) => {
    const aType = a.doc_type ?? a.docType ?? ""
    const bType = b.doc_type ?? b.docType ?? ""
    return (order.get(aType as DocumentType) ?? 999) - (order.get(bType as DocumentType) ?? 999)
  })
}

function parseDependsOn(value: unknown, docType: DocumentType) {
  if (!Array.isArray(value)) return getDefaultDependsOn(docType)
  return value.filter((item): item is DocumentType => isDocumentType(item))
}

export function getDefaultDependsOn(docType: DocumentType): DocumentType[] {
  switch (docType) {
    case "prd":
      return ["competitive"]
    case "mvp":
    case "techspec":
      return ["prd"]
    case "mockups":
      return ["mvp"]
    default:
      return []
  }
}

function normalizeItemStatus(value: unknown): GenerationQueueItemStatus {
  if (
    value === "pending" ||
    value === "generating" ||
    value === "done" ||
    value === "skipped" ||
    value === "cancelled" ||
    value === "error" ||
    value === "blocked"
  ) {
    return value
  }

  return "pending"
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

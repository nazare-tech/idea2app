import { isDocumentType, type DocumentType } from "@/lib/document-definitions"
import { getProjectUrl } from "@/lib/project-routing"
import type { Json } from "@/types/database"

export const ONBOARDING_GENERATION_SOURCE = "onboarding"
export const ONBOARDING_GENERATION_MODE = "onboarding"
export const ONBOARDING_GENERATION_VERSION = "onboarding-generation-v1"
export const ONBOARDING_REQUIRED_DOC_TYPE = "competitive" as const

export type OnboardingGenerationStatus =
  | "pending"
  | "generating"
  | "done"
  | "error"
  | "skipped"
  | "cancelled"

export type OnboardingLoadingRowKey =
  | "overview"
  | "market-research"
  | "prd"
  | "mvp"
  | "launch"

export interface OnboardingQueueItem {
  docType: DocumentType
  label: string
  status: OnboardingGenerationStatus
  creditCost: number
  stageMessage?: string
  error?: string
  runId: string
  source: typeof ONBOARDING_GENERATION_SOURCE
  idempotencyKey: string
  dependsOn: DocumentType[]
  attempt: number
  maxAttempts: number
  startedAt?: string
  completedAt?: string
  outputTable?: string
  outputId?: string
  creditStatus: "not_charged"
}

export interface OnboardingLoadingRow {
  key: OnboardingLoadingRowKey
  label: string
  phrase: string
  status: OnboardingGenerationStatus
  docType: DocumentType
  error?: string
}

type QueueLike = {
  queue?: Json | null
  model_selections?: Json | null
  status: string
  error_info?: Json | null
}

const ONBOARDING_QUEUE_DEFINITIONS: Array<{
  docType: DocumentType
  label: string
  dependsOn: DocumentType[]
  stageMessage: string
}> = [
  {
    docType: "competitive",
    label: "Competitive Research",
    dependsOn: [],
    stageMessage: "Finding market patterns",
  },
  {
    docType: "prd",
    label: "PRD",
    dependsOn: ["competitive"],
    stageMessage: "Drafting requirements",
  },
  {
    docType: "mvp",
    label: "MVP Plan",
    dependsOn: ["prd"],
    stageMessage: "Planning launchable scope",
  },
  {
    docType: "launch",
    label: "Marketing",
    dependsOn: [],
    stageMessage: "Mapping channels",
  },
]

const LOADING_ROW_DEFINITIONS: Array<{
  key: OnboardingLoadingRowKey
  label: string
  phrase: string
  docType: DocumentType
}> = [
  {
    key: "overview",
    label: "Overview",
    phrase: "Finding market patterns",
    docType: "competitive",
  },
  {
    key: "market-research",
    label: "Market research",
    phrase: "Scoping opportunity",
    docType: "competitive",
  },
  {
    key: "prd",
    label: "PRD",
    phrase: "Drafting requirements",
    docType: "prd",
  },
  {
    key: "mvp",
    label: "MVP plan",
    phrase: "Planning launchable scope",
    docType: "mvp",
  },
  {
    key: "launch",
    label: "Marketing",
    phrase: "Mapping launch channels",
    docType: "launch",
  },
]

export function createOnboardingGenerationRunId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  return `onboarding-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function buildOnboardingGenerationQueue(runId = createOnboardingGenerationRunId()): OnboardingQueueItem[] {
  return ONBOARDING_QUEUE_DEFINITIONS.map((item) => ({
    ...item,
    status: "pending",
    creditCost: 0,
    runId,
    source: ONBOARDING_GENERATION_SOURCE,
    idempotencyKey: `${runId}:${item.docType}`,
    attempt: 0,
    maxAttempts: 2,
    creditStatus: "not_charged",
  }))
}

export function buildOnboardingQueueMetadata(runId: string) {
  return {
    mode: ONBOARDING_GENERATION_MODE,
    source: ONBOARDING_GENERATION_SOURCE,
    version: ONBOARDING_GENERATION_VERSION,
    runId,
  }
}

export function getOnboardingRunId(queueRow: Pick<QueueLike, "model_selections"> | null | undefined) {
  const metadata = asRecord(queueRow?.model_selections)
  return typeof metadata?.runId === "string" ? metadata.runId : null
}

export function isOnboardingGenerationQueue(queueRow: Pick<QueueLike, "model_selections" | "queue"> | null | undefined) {
  const metadata = asRecord(queueRow?.model_selections)
  return (
    metadata?.mode === ONBOARDING_GENERATION_MODE &&
    metadata?.source === ONBOARDING_GENERATION_SOURCE &&
    metadata?.version === ONBOARDING_GENERATION_VERSION
  )
}

export function buildOnboardingRedirectUrl(project: { id: string; name: string }) {
  return `${getProjectUrl(project)}#overview`
}

export function mapOnboardingLoadingRows(params: {
  queueRow: QueueLike | null
  completedDocs: Partial<Record<DocumentType, boolean>>
}): OnboardingLoadingRow[] {
  const queue = parseQueue(params.queueRow?.queue)

  return LOADING_ROW_DEFINITIONS.map((row) => {
    const matchingItem = queue.find((item) => item.docType === row.docType)
    const isDone = params.completedDocs[row.docType] === true

    return {
      ...row,
      status: isDone ? "done" : normalizeQueueItemStatus(matchingItem?.status),
      error: matchingItem?.error,
    }
  })
}

export function parseQueue(value: Json | null | undefined): OnboardingQueueItem[] {
  if (!Array.isArray(value)) return []

  const parsed: OnboardingQueueItem[] = []

  for (const item of value) {
    const record = asRecord(item)
    if (!record || typeof record.docType !== "string") continue
    if (record.source !== ONBOARDING_GENERATION_SOURCE) continue

    parsed.push({
      docType: isDocumentType(record.docType) ? record.docType : "competitive",
      label: typeof record.label === "string" ? record.label : record.docType,
      status: normalizeQueueItemStatus(record.status),
      creditCost: typeof record.creditCost === "number" ? record.creditCost : 0,
      stageMessage: typeof record.stageMessage === "string" ? record.stageMessage : undefined,
      error: typeof record.error === "string" ? record.error : undefined,
      runId: typeof record.runId === "string" ? record.runId : "",
      source: ONBOARDING_GENERATION_SOURCE,
      idempotencyKey: typeof record.idempotencyKey === "string" ? record.idempotencyKey : "",
      dependsOn: Array.isArray(record.dependsOn)
        ? record.dependsOn.filter((docType): docType is DocumentType => isDocumentType(docType))
        : [],
      attempt: typeof record.attempt === "number" ? record.attempt : 0,
      maxAttempts: typeof record.maxAttempts === "number" ? record.maxAttempts : 2,
      startedAt: typeof record.startedAt === "string" ? record.startedAt : undefined,
      completedAt: typeof record.completedAt === "string" ? record.completedAt : undefined,
      outputTable: typeof record.outputTable === "string" ? record.outputTable : undefined,
      outputId: typeof record.outputId === "string" ? record.outputId : undefined,
      creditStatus: "not_charged",
    })
  }

  return parsed
}

function normalizeQueueItemStatus(value: unknown): OnboardingGenerationStatus {
  if (
    value === "pending" ||
    value === "generating" ||
    value === "done" ||
    value === "error" ||
    value === "skipped" ||
    value === "cancelled"
  ) {
    return value
  }

  if (value === "blocked") return "error"

  return "pending"
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

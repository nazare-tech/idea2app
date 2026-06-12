import type { DocumentType } from "@/lib/document-definitions"
import type { QueueItem, QueueItemStatus } from "@/lib/generate-all-helpers"

export type DocumentDisplayStatus =
  | "idle"
  | "ready"
  | "queued"
  | "waiting"
  | "generating"
  | "needs_retry"

export interface MockupOptionStatus {
  label: string
  status: DocumentDisplayStatus
  message?: string
}

export interface DocumentGenerationDisplayState {
  docType: DocumentType
  displayStatus: DocumentDisplayStatus
  navStatus: "done" | "in_progress" | "pending" | "needs_retry"
  label: string
  message: string
  detail?: string
  queueStatus?: QueueItemStatus
  stageMessage?: string
  error?: string
  mockupOptionStatuses?: MockupOptionStatus[]
  mockupPreviewImages?: string[]
}

export interface BuildDocumentGenerationDisplayStatesInput {
  documentTypes: DocumentType[]
  labels: Partial<Record<DocumentType, string>>
  hasContent: Partial<Record<DocumentType, boolean>>
  queueItems?: QueueItem[]
  locallyGenerating?: Partial<Record<DocumentType, boolean>>
  mockupOptionStatuses?: MockupOptionStatus[]
  mockupPreviewImages?: string[]
}

const DEFAULT_MESSAGES: Record<DocumentType, string> = {
  prompt: "Ready",
  competitive: "Finding market patterns",
  prd: "Drafting product requirements",
  mvp: "Planning launchable scope",
  mockups: "Generating visual directions",
  techspec: "Drafting technical specifications",
  deploy: "Preparing deployment",
}

const QUEUED_DETAILS: Partial<Record<DocumentType, string>> = {
  prd: "This will start automatically after market research is ready.",
  mvp: "This will start automatically after the Product Plan is ready.",
  mockups: "Visual directions will generate after the First Version Plan is ready.",
}

const DEPENDENCY_DETAILS: Partial<Record<DocumentType, string>> = {
  prd: "This is waiting for Market Research. Retry Market Research first.",
  mvp: "This is waiting for the Product Plan. Retry Product Plan first.",
  mockups: "This is waiting for the First Version Plan. Generate the First Version Plan first.",
  techspec: "This is waiting for the Product Plan. Retry Product Plan first.",
  deploy: "This is waiting for Technical Specifications. Generate Technical Specifications first.",
}

const GENERIC_RETRY_DETAIL = "The request took too long or hit a temporary service issue. Try again and we will use the latest saved project context."

const TECHNICAL_ERROR_PATTERNS = [
  /Expected (?:','|']'|'}'|property name|double-quoted property name) /i,
  /JSON at position \d+/i,
  /line \d+ column \d+/i,
  /Unexpected token .* in JSON/i,
  /Unexpected end of JSON input/i,
  /SyntaxError/i,
]

function sanitizeGenerationErrorDetail(detail?: string) {
  if (!detail) return detail

  const redactedDetail = detail
    .replace(
      /https:\/\/openrouter\.ai\/workspaces\/[^/\s)]+\/keys\/[^\s)]+/g,
      "the OpenRouter key settings",
    )
    .replace(/key=[^&\s)]+/g, "key=[redacted]")

  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(redactedDetail))) {
    return GENERIC_RETRY_DETAIL
  }

  return redactedDetail
}

function getBlockingDependency(docType: DocumentType): DocumentType | undefined {
  if (docType === "prd") return "competitive"
  if (docType === "mvp") return "prd"
  if (docType === "mockups") return "mvp"
  if (docType === "techspec") return "prd"
  if (docType === "deploy") return "techspec"
  return undefined
}

export function buildDocumentGenerationDisplayStates({
  documentTypes,
  labels,
  hasContent,
  queueItems = [],
  locallyGenerating = {},
  mockupOptionStatuses,
  mockupPreviewImages,
}: BuildDocumentGenerationDisplayStatesInput): Record<DocumentType, DocumentGenerationDisplayState> {
  const queueByType = new Map(queueItems.map((item) => [item.docType, item]))

  return Object.fromEntries(
    documentTypes.map((docType) => {
      const label = labels[docType] ?? docType
      const queueItem = queueByType.get(docType)
      const queueStatus = queueItem?.status
      if (hasContent[docType]) {
        return [docType, {
          docType,
          displayStatus: "ready",
          navStatus: "done",
          label,
          message: "Ready",
          queueStatus,
        }]
      }

      if (queueStatus === "generating" || locallyGenerating[docType]) {
        return [docType, {
          docType,
          displayStatus: "generating",
          navStatus: "in_progress",
          label,
          message: queueItem?.stageMessage ?? DEFAULT_MESSAGES[docType],
          detail: docType === "mockups"
            ? "Design mockups will appear here when the generated concepts are ready."
            : "This may take a moment.",
          queueStatus,
          stageMessage: queueItem?.stageMessage,
          mockupOptionStatuses: docType === "mockups" ? mockupOptionStatuses : undefined,
          mockupPreviewImages: docType === "mockups" ? mockupPreviewImages : undefined,
        }]
      }

      if (queueStatus === "blocked") {
        const blockingDependency = getBlockingDependency(docType)
        const isDependencyReady = blockingDependency ? Boolean(hasContent[blockingDependency]) : false

        if (isDependencyReady) {
          return [docType, {
            docType,
            displayStatus: "idle",
            navStatus: "pending",
            label,
            message: "",
            queueStatus,
          }]
        }

        return [docType, {
          docType,
          displayStatus: "waiting",
          navStatus: "pending",
          label,
          message: "Waiting",
          detail: DEPENDENCY_DETAILS[docType] ?? "This is waiting for an earlier document to finish.",
          queueStatus,
          error: sanitizeGenerationErrorDetail(queueItem?.error),
        }]
      }

      if (queueStatus === "error" || queueStatus === "cancelled") {
        const errorDetail = sanitizeGenerationErrorDetail(queueItem?.error)
        return [docType, {
          docType,
          displayStatus: "needs_retry",
          navStatus: "needs_retry",
          label,
          message: "Needs retry",
          detail: errorDetail ?? GENERIC_RETRY_DETAIL,
          queueStatus,
          error: errorDetail,
        }]
      }

      if (queueStatus === "pending") {
        return [docType, {
          docType,
          displayStatus: "queued",
          navStatus: "pending",
          label,
          message: "Queued",
          detail: QUEUED_DETAILS[docType] ?? "This will start automatically.",
          queueStatus,
        }]
      }

      if (queueStatus === "done" || queueStatus === "skipped") {
        return [docType, {
          docType,
          displayStatus: "generating",
          navStatus: "in_progress",
          label,
          message: "Loading saved content",
          detail: "The document is ready. Loading the saved version now.",
          queueStatus,
        }]
      }

      return [docType, {
        docType,
        displayStatus: "idle",
        navStatus: "pending",
        label,
        message: "",
        queueStatus,
      }]
    }),
  ) as Record<DocumentType, DocumentGenerationDisplayState>
}

import type { DocumentType } from "@/lib/document-definitions"
import type { QueueItem, QueueItemStatus } from "@/lib/generate-all-helpers"

export type DocumentDisplayStatus =
  | "idle"
  | "ready"
  | "queued"
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
}

export interface BuildDocumentGenerationDisplayStatesInput {
  documentTypes: DocumentType[]
  labels: Partial<Record<DocumentType, string>>
  hasContent: Partial<Record<DocumentType, boolean>>
  queueItems?: QueueItem[]
  locallyGenerating?: Partial<Record<DocumentType, boolean>>
  mockupOptionStatuses?: MockupOptionStatus[]
}

const DEFAULT_MESSAGES: Record<DocumentType, string> = {
  prompt: "Ready",
  competitive: "Finding market patterns",
  prd: "Drafting product requirements",
  mvp: "Planning launchable scope",
  mockups: "Generating visual directions",
  techspec: "Drafting technical specifications",
  deploy: "Preparing deployment",
  launch: "Mapping launch channels",
}

const QUEUED_DETAILS: Partial<Record<DocumentType, string>> = {
  prd: "This will start automatically after market research is ready.",
  mvp: "This will start automatically after PRD is ready.",
  mockups: "Visual directions will generate after the MVP plan is ready.",
  launch: "This will start automatically.",
}

export function buildDocumentGenerationDisplayStates({
  documentTypes,
  labels,
  hasContent,
  queueItems = [],
  locallyGenerating = {},
  mockupOptionStatuses,
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
            ? "Mockups will appear here when the generated concepts are ready."
            : "This may take a moment.",
          queueStatus,
          stageMessage: queueItem?.stageMessage,
          mockupOptionStatuses: docType === "mockups" ? mockupOptionStatuses : undefined,
        }]
      }

      if (queueStatus === "error" || queueStatus === "blocked" || queueStatus === "cancelled") {
        return [docType, {
          docType,
          displayStatus: "needs_retry",
          navStatus: "needs_retry",
          label,
          message: "Needs retry",
          detail: queueItem?.error ?? "Generation did not complete.",
          queueStatus,
          error: queueItem?.error,
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

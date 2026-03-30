/**
 * Pure helper functions for the Generate All feature.
 * Extracted from generate-all-context.tsx so they can be imported
 * and tested in Node.js without pulling in React hooks/JSX.
 */

import {
  GENERATE_ALL_QUEUE_ORDER,
  DOCUMENT_DEFINITION_MAP,
  type DocumentType,
} from "./document-definitions"
import { GENERATE_ALL_ACTION_MAP, getTokenCost } from "./token-economics"

// ---------------------------------------------------------------------------
// Types (re-exported so consumers can import from either this file or context)
// ---------------------------------------------------------------------------

export type QueueItemStatus =
  | "pending"
  | "generating"
  | "done"
  | "skipped"
  | "cancelled"
  | "error"

export interface QueueItem {
  docType: DocumentType
  label: string
  status: QueueItemStatus
  creditCost: number
  stageMessage?: string
  error?: string
}

// ---------------------------------------------------------------------------
// localStorage key for the active-generation flag
// ---------------------------------------------------------------------------

export const LOCAL_STORAGE_KEY = (projectId: string) =>
  `generate_all_active_${projectId}`

// ---------------------------------------------------------------------------
// Build the idle-state queue from current model selections + document statuses
// ---------------------------------------------------------------------------

export function buildQueue(
  modelSelections: Record<string, string>,
  getDocumentStatus: (type: DocumentType) => "done" | "in_progress" | "pending",
): QueueItem[] {
  return GENERATE_ALL_QUEUE_ORDER.map((docType) => {
    const isDone = getDocumentStatus(docType) === "done"
    const action = GENERATE_ALL_ACTION_MAP[docType]
    const cost = isDone ? 0 : getTokenCost(action, modelSelections[docType])
    return {
      docType,
      label: DOCUMENT_DEFINITION_MAP[docType].label,
      status: isDone ? ("skipped" as const) : ("pending" as const),
      creditCost: cost,
    }
  })
}

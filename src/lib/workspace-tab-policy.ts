import { isDocumentType, type DocumentType } from "@/lib/document-definitions"

export const DEFAULT_WORKSPACE_DOCUMENT: DocumentType = "competitive"

export function isWorkspaceDocumentType(value: string | null | undefined): value is DocumentType {
  return isDocumentType(value) && value !== "prompt"
}

export function resolveWorkspaceDocumentTab(value: string | null | undefined): DocumentType {
  return isWorkspaceDocumentType(value) ? value : DEFAULT_WORKSPACE_DOCUMENT
}

export function shouldRedirectBlockedWorkspaceTab(value: string | null | undefined) {
  return value === "prompt"
}

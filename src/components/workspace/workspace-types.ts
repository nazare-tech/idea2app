import type { DocumentType } from "@/lib/document-definitions"

export interface Project {
  id: string
  name: string
  description: string | null
  status: string | null
}

export interface Analysis {
  id: string
  type: string
  content: string
  created_at: string | null
  metadata?: Record<string, unknown> | null
}

export interface PRD {
  id: string
  content: string
  created_at: string | null
}

export interface TechSpec {
  id: string
  content: string
  created_at: string | null
}

export interface MvpPlan {
  id: string
  content: string
  created_at: string | null
}

export interface Mockup {
  id: string
  content: string
  model_used: string | null
  created_at: string | null
}

export interface Deployment {
  id: string
  deployment_url: string | null
  github_repo_url: string | null
  status: string | null
  build_logs: string | null
  error_message: string | null
  created_at: string | null
}

export interface ProjectWorkspaceProps {
  project: Project
  initialDocument?: DocumentType
  initialDocuments?: Partial<Record<DocumentType, unknown[]>>
  user: unknown
  /** Paid-plan gate for the "Ask this project" composer (resolved server-side). */
  composerEnabled?: boolean
}

export interface WorkspaceDocumentCollections {
  competitive: Analysis[]
  prd: PRD[]
  mvp: MvpPlan[]
  mockups: Mockup[]
  techspec: TechSpec[]
  deploy: Deployment[]
}

export type WorkspaceGenerationCounts = Partial<Record<DocumentType, number>>
export type LegacyDocumentStatus = "done" | "in_progress" | "pending"

export type PromptLabOutputKind = "text" | "markdown" | "json" | "image"

export type PromptLabPreviewKind = "text" | "markdown" | "json" | "image"

export interface PromptLabPromptPair {
  system: string
  user: string
}

export interface PromptLabProject {
  id: string
  label: string
  description?: string
  metadata?: Record<string, unknown>
}

export interface PromptLabProjectAdapter<TProject extends PromptLabProject = PromptLabProject> {
  listProjects(): Promise<TProject[]>
  getProject(projectId: string): Promise<TProject | null>
  getProjectContext(projectId: string): Promise<Record<string, unknown>>
}

export type PromptLabContextSourceType = "artifact" | "project" | "text" | "record" | "image"

export type PromptLabContentType =
  | "text/plain"
  | "text/markdown"
  | "application/json"
  | "image/png"
  | "image/jpeg"

export type PromptLabContextPayload =
  | { kind: "text"; content: string }
  | { kind: "json"; value: unknown }
  | { kind: "image"; url: string; alt?: string }

export interface PromptLabContextSource {
  id: string
  type: PromptLabContextSourceType
  label: string
  description?: string
  contentType: PromptLabContentType
  load(): Promise<PromptLabContextPayload>
}

export interface PromptLabContextAdapter {
  listContextSources(projectId: string, projectContext: Record<string, unknown>): Promise<PromptLabContextSource[]>
}

export interface PromptLabResolvedContextSource extends Omit<PromptLabContextSource, "load"> {
  payload: PromptLabContextPayload
}

export interface PromptLabBuildPromptInput<TProject extends PromptLabProject = PromptLabProject> {
  project: TProject
  projectContext: Record<string, unknown>
  contextSources: PromptLabContextSource[]
  selectedContext: PromptLabResolvedContextSource[]
  artifact: PromptLabArtifactDefinition<TProject>
}

export interface PromptLabRunInput<TProject extends PromptLabProject = PromptLabProject> {
  project: TProject
  artifact: PromptLabArtifactDefinition<TProject>
  systemPrompt: string
  userPrompt: string
  model: string
  selectedContext: PromptLabResolvedContextSource[]
}

export type PromptLabRunResult =
  | { kind: "text"; content: string; metadata?: Record<string, unknown> }
  | { kind: "json"; value: unknown; metadata?: Record<string, unknown> }
  | {
      kind: "image"
      images: Array<{ url: string; alt?: string; metadata?: Record<string, unknown> }>
      metadata?: Record<string, unknown>
    }

export interface PromptLabArtifactDefinition<TProject extends PromptLabProject = PromptLabProject> {
  id: string
  label: string
  outputKind: PromptLabOutputKind
  defaultModel: string
  preview: PromptLabPreviewKind
  buildPrompt(input: PromptLabBuildPromptInput<TProject>): Promise<PromptLabPromptPair>
  run(input: PromptLabRunInput<TProject>): Promise<PromptLabRunResult>
}

export interface PromptLabConfig<TProject extends PromptLabProject = PromptLabProject> {
  artifacts: Array<PromptLabArtifactDefinition<TProject>>
  projects: PromptLabProjectAdapter<TProject>
  contextSources?: PromptLabContextAdapter
  persistence?: PromptLabPersistenceAdapter
}

export interface PromptLabDraftInput {
  artifactId: string
  title: string
  model: string
  systemPrompt: string
  userPrompt: string
  notes?: string
}

export interface PromptLabDraft extends PromptLabDraftInput {
  id: string
  createdAt: string
  updatedAt: string
}

export interface PromptLabRunRecordInput {
  artifactId: string
  title: string
  model: string
  systemPrompt: string
  userPrompt: string
  result?: PromptLabRunResult
  status: "completed" | "failed"
  errorMessage?: string
  notes?: string
}

export interface PromptLabRunRecord extends PromptLabRunRecordInput {
  id: string
  createdAt: string
  updatedAt: string
}

export interface PromptLabPersistenceListInput {
  artifactId?: string
}

export interface PromptLabPersistenceAdapter {
  listDrafts(input?: PromptLabPersistenceListInput): Promise<PromptLabDraft[]>
  saveDraft(input: PromptLabDraftInput): Promise<PromptLabDraft>
  deleteDraft(id: string): Promise<void>
  listRuns(input?: PromptLabPersistenceListInput): Promise<PromptLabRunRecord[]>
  saveRun(input: PromptLabRunRecordInput): Promise<PromptLabRunRecord>
}

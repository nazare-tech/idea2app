import { validatePromptLabConfig } from "./config.js"
import type {
  PromptLabArtifactDefinition,
  PromptLabConfig,
  PromptLabContextSource,
  PromptLabProject,
  PromptLabPromptPair,
  PromptLabResolvedContextSource,
  PromptLabRunRecord,
  PromptLabRunResult,
} from "./types.js"

export interface PromptLabBuildPromptRequest {
  projectId: string
  artifactId: string
  selectedContextIds?: string[]
}

export interface PromptLabRunArtifactRequest extends PromptLabBuildPromptRequest {
  title?: string
  model?: string
  systemPrompt?: string
  userPrompt?: string
  notes?: string
}

export interface PromptLabRunArtifactResponse {
  result: PromptLabRunResult
  record?: PromptLabRunRecord
}

export function createPromptLabRuntime<TProject extends PromptLabProject>(
  config: PromptLabConfig<TProject>,
) {
  validatePromptLabConfig(config)

  return {
    listProjects: () => config.projects.listProjects(),

    async listContextSources(projectId: string) {
      const projectContext = await config.projects.getProjectContext(projectId)
      return config.contextSources?.listContextSources(projectId, projectContext) ?? []
    },

    async buildPrompt(request: PromptLabBuildPromptRequest): Promise<PromptLabPromptPair> {
      const { project, artifact, projectContext, contextSources, selectedContext } =
        await resolveRuntimeInput(config, request)

      return artifact.buildPrompt({
        project,
        artifact,
        projectContext,
        contextSources,
        selectedContext,
      })
    },

    async runArtifact(request: PromptLabRunArtifactRequest): Promise<PromptLabRunArtifactResponse> {
      const { project, artifact, projectContext, contextSources, selectedContext } =
        await resolveRuntimeInput(config, request)
      const model = request.model?.trim() || artifact.defaultModel
      const prompt = request.systemPrompt && request.userPrompt
        ? { system: request.systemPrompt, user: request.userPrompt }
        : await artifact.buildPrompt({
            project,
            artifact,
            projectContext,
            contextSources,
            selectedContext,
          })

      try {
        const result = await artifact.run({
          project,
          artifact,
          selectedContext,
          model,
          systemPrompt: prompt.system,
          userPrompt: prompt.user,
        })
        const record = await config.persistence?.saveRun({
          artifactId: artifact.id,
          title: request.title?.trim() || `${artifact.label} run`,
          model,
          systemPrompt: prompt.system,
          userPrompt: prompt.user,
          result,
          status: "completed",
          notes: request.notes,
        })

        return { result, record }
      } catch (error) {
        await config.persistence?.saveRun({
          artifactId: artifact.id,
          title: request.title?.trim() || `${artifact.label} run`,
          model,
          systemPrompt: prompt.system,
          userPrompt: prompt.user,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          notes: request.notes,
        })
        throw error
      }
    },
  }
}

async function resolveRuntimeInput<TProject extends PromptLabProject>(
  config: PromptLabConfig<TProject>,
  request: PromptLabBuildPromptRequest,
) {
  const artifact = findArtifact(config.artifacts, request.artifactId)
  const project = await config.projects.getProject(request.projectId)
  if (!project) throw new Error(`Project not found: ${request.projectId}`)

  const projectContext = await config.projects.getProjectContext(request.projectId)
  const contextSources = await config.contextSources?.listContextSources(request.projectId, projectContext) ?? []
  const selectedContext = await resolveSelectedContext(contextSources, request.selectedContextIds ?? [])

  return {
    artifact,
    project,
    projectContext,
    contextSources,
    selectedContext,
  }
}

function findArtifact<TProject extends PromptLabProject>(
  artifacts: Array<PromptLabArtifactDefinition<TProject>>,
  artifactId: string,
) {
  const artifact = artifacts.find((item) => item.id === artifactId)
  if (!artifact) throw new Error(`Artifact not found: ${artifactId}`)
  return artifact
}

async function resolveSelectedContext(
  contextSources: PromptLabContextSource[],
  selectedContextIds: string[],
): Promise<PromptLabResolvedContextSource[]> {
  const selected: PromptLabResolvedContextSource[] = []

  for (const sourceId of selectedContextIds) {
    const source = contextSources.find((item) => item.id === sourceId)
    if (!source) throw new Error(`Context source not found: ${sourceId}`)
    const { load, ...sourceDetails } = source
    selected.push({
      ...sourceDetails,
      payload: await load(),
    })
  }

  return selected
}

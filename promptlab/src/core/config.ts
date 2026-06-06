import type {
  PromptLabArtifactDefinition,
  PromptLabConfig,
  PromptLabOutputKind,
  PromptLabPreviewKind,
  PromptLabProject,
} from "./types.js"

const SUPPORTED_OUTPUT_KINDS = new Set<PromptLabOutputKind>(["text", "markdown", "json", "image"])
const SUPPORTED_PREVIEW_KINDS = new Set<PromptLabPreviewKind>(["text", "markdown", "json", "image"])

export function definePromptLab<TProject extends PromptLabProject>(
  config: PromptLabConfig<TProject>,
): PromptLabConfig<TProject> {
  validatePromptLabConfig(config)
  return config
}

export function validatePromptLabConfig(config: PromptLabConfig): void {
  if (!config || typeof config !== "object") {
    throw new Error("PromptLab config is required")
  }

  if (!Array.isArray(config.artifacts) || config.artifacts.length === 0) {
    throw new Error("PromptLab config must define at least one artifact")
  }

  if (!config.projects || typeof config.projects !== "object") {
    throw new Error("PromptLab config must define a projects adapter")
  }

  const ids = new Set<string>()
  for (const artifact of config.artifacts) {
    validateArtifact(artifact)

    if (ids.has(artifact.id)) {
      throw new Error(`Duplicate artifact id: ${artifact.id}`)
    }
    ids.add(artifact.id)
  }
}

function validateArtifact(artifact: PromptLabArtifactDefinition) {
  if (!artifact.id?.trim()) throw new Error("Artifact id is required")
  if (!artifact.label?.trim()) throw new Error(`Artifact ${artifact.id} must define a label`)
  if (!artifact.defaultModel?.trim()) throw new Error(`Artifact ${artifact.id} must define a default model`)
  if (!SUPPORTED_OUTPUT_KINDS.has(artifact.outputKind)) {
    throw new Error(`Artifact ${artifact.id} has unsupported output kind: ${artifact.outputKind}`)
  }
  if (!SUPPORTED_PREVIEW_KINDS.has(artifact.preview)) {
    throw new Error(`Artifact ${artifact.id} has unsupported preview kind: ${artifact.preview}`)
  }
  if (artifact.outputKind === "image" && artifact.preview !== "image") {
    throw new Error(`Artifact ${artifact.id} must use image preview for image outputs`)
  }
  if (artifact.outputKind !== "image" && artifact.preview === "image") {
    throw new Error(`Artifact ${artifact.id} cannot use image preview for ${artifact.outputKind} output`)
  }
  if (typeof artifact.buildPrompt !== "function") {
    throw new Error(`Artifact ${artifact.id} must define buildPrompt`)
  }
  if (typeof artifact.run !== "function") {
    throw new Error(`Artifact ${artifact.id} must define run`)
  }
}

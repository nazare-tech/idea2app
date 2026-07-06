import type { PromptLabArtifact } from "@/lib/prompt-lab/shared"

export interface PromptLabDefaultProductionStateInput {
  artifact: PromptLabArtifact
  promptSource: "default" | "custom"
  systemPrompt: string
  userPrompt: string
  model: string
  defaultSystemPrompt?: string
  defaultUserPrompt?: string
  defaultModel?: string
}

const PRODUCTION_DEFAULT_ARTIFACTS: PromptLabArtifact[] = ["prd", "mvp"]

export function isPromptLabDefaultProductionState({
  artifact,
  promptSource,
  systemPrompt,
  userPrompt,
  model,
  defaultSystemPrompt,
  defaultUserPrompt,
  defaultModel,
}: PromptLabDefaultProductionStateInput) {
  return (
    PRODUCTION_DEFAULT_ARTIFACTS.includes(artifact) &&
    promptSource === "default" &&
    systemPrompt === defaultSystemPrompt &&
    userPrompt === defaultUserPrompt &&
    model === defaultModel
  )
}

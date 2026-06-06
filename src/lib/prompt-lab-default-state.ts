import type { PromptLabArtifact } from "@/lib/prompt-lab-shared"

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
    artifact === "prd" &&
    promptSource === "default" &&
    systemPrompt === defaultSystemPrompt &&
    userPrompt === defaultUserPrompt &&
    model === defaultModel
  )
}

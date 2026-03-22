"use client"

import { AVAILABLE_MODELS } from "@/lib/prompt-chat-config"
import { ModelSelector } from "@/components/ui/model-selector"

interface PromptModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
}

function getModelDisplayName(modelId: string): string {
  return AVAILABLE_MODELS.find((model) => model.id === modelId)?.name ?? modelId
}

export function PromptModelSelector({
  selectedModel,
  onModelChange,
}: PromptModelSelectorProps) {
  const displayName = getModelDisplayName(selectedModel)

  return (
    <ModelSelector
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      displayName={displayName}
      groups={[{ options: AVAILABLE_MODELS }]}
    />
  )
}

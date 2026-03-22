"use client"

import {
  DOCUMENT_PRIMARY_MODELS,
  DOCUMENT_MORE_MODELS,
} from "@/lib/prompt-chat-config"
import { ModelSelector } from "@/components/ui/model-selector"

interface DocumentModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
}

function getModelDisplayName(modelId: string): string {
  const all = [...DOCUMENT_PRIMARY_MODELS, ...DOCUMENT_MORE_MODELS]
  return all.find((m) => m.id === modelId)?.name ?? modelId.split("/").pop() ?? modelId
}

export function DocumentModelSelector({ selectedModel, onModelChange }: DocumentModelSelectorProps) {
  const displayName = getModelDisplayName(selectedModel)

  return (
    <ModelSelector
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      displayName={displayName}
      groups={[
        { options: DOCUMENT_PRIMARY_MODELS },
        { label: "More models", options: DOCUMENT_MORE_MODELS, compact: true },
      ]}
    />
  )
}

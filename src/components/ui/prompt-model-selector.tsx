"use client"

import { useState } from "react"
import { Check, ChevronDown, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AVAILABLE_MODELS } from "@/lib/prompt-chat-config"

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
  const [open, setOpen] = useState(false)
  const displayName = getModelDisplayName(selectedModel)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="group flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/80 px-3 py-1.5 transition-all duration-200 hover:border-border hover:bg-secondary hover:shadow-sm">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70">
            <Sparkles className="h-2 w-2 text-primary-foreground" />
          </div>
          <span className="max-w-[160px] truncate text-xs font-medium text-foreground/80 group-hover:text-foreground">
            {displayName}
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 text-muted-foreground/60 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 rounded-xl border-border/50 p-2 shadow-xl">
        {AVAILABLE_MODELS.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => {
              onModelChange(model.id)
              setOpen(false)
            }}
            className={cn(
              "flex items-start gap-3 rounded-lg p-3 transition-colors",
              selectedModel === model.id && "bg-primary/5"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                selectedModel === model.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground/60"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{model.name}</span>
                {selectedModel === model.id && (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                )}
              </div>
              <span className="line-clamp-1 text-xs text-muted-foreground">
                {model.description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

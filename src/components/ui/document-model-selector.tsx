"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, Sparkles, Zap, CircleDollarSign, Brain, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DOCUMENT_PRIMARY_MODELS,
  DOCUMENT_MORE_MODELS,
  DEFAULT_DOCUMENT_MODEL,
  type DocumentModel,
} from "@/lib/prompt-chat-config"

interface DocumentModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
}

const badgeIcons: Record<string, React.ElementType> = {
  Fastest: Zap,
  Efficient: CircleDollarSign,
  Thinking: Brain,
}

function getModelDisplayName(modelId: string): string {
  const all = [...DOCUMENT_PRIMARY_MODELS, ...DOCUMENT_MORE_MODELS]
  return all.find((m) => m.id === modelId)?.name ?? modelId.split("/").pop() ?? modelId
}

export function DocumentModelSelector({ selectedModel, onModelChange }: DocumentModelSelectorProps) {
  const [open, setOpen] = useState(false)

  const displayName = getModelDisplayName(selectedModel)
  const isPrimary = DOCUMENT_PRIMARY_MODELS.some((m) => m.id === selectedModel)
  const primaryModel = DOCUMENT_PRIMARY_MODELS.find((m) => m.id === selectedModel)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border/50 hover:border-border transition-all duration-200 hover:shadow-sm">
          <div className="h-4 w-4 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Sparkles className="h-2 w-2 text-primary-foreground" />
          </div>
          <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground max-w-[140px] truncate">
            {displayName}
          </span>
          {isPrimary && primaryModel?.badge && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {primaryModel.badge}
            </span>
          )}
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground/60 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2 rounded-xl border-border/50 shadow-xl">
        {/* Primary models */}
        {DOCUMENT_PRIMARY_MODELS.map((model) => {
          const BadgeIcon = model.badge ? badgeIcons[model.badge] : null
          return (
            <DropdownMenuItem
              key={model.id}
              onClick={() => {
                onModelChange(model.id)
                setOpen(false)
              }}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                selectedModel === model.id ? "bg-primary/5" : ""
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  selectedModel === model.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground/60"
                )}
              >
                {BadgeIcon ? <BadgeIcon className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{model.name}</span>
                    {model.badge && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {model.badge}
                      </span>
                    )}
                  </div>
                  {selectedModel === model.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-1">{model.description}</span>
              </div>
            </DropdownMenuItem>
          )
        })}

        {/* Separator + More models */}
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuLabel className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <MoreHorizontal className="h-3 w-3" />
          More models
        </DropdownMenuLabel>

        <div className="max-h-[240px] overflow-y-auto">
          {DOCUMENT_MORE_MODELS.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => {
                onModelChange(model.id)
                setOpen(false)
              }}
              className={cn(
                "flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                selectedModel === model.id ? "bg-primary/5" : ""
              )}
            >
              <div
                className={cn(
                  "h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                  selectedModel === model.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground/60"
                )}
              >
                <Sparkles className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{model.name}</span>
                  {selectedModel === model.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-1">{model.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

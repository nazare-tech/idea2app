"use client"

import type { ElementType } from "react"
import { useState } from "react"
import {
  Brain,
  Check,
  ChevronDown,
  CircleDollarSign,
  MoreHorizontal,
  Sparkles,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface ModelSelectorOption {
  id: string
  name: string
  description: string
  badge?: string
}

interface ModelSelectorGroup {
  label?: string
  options: ModelSelectorOption[]
  compact?: boolean
}

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  groups: ModelSelectorGroup[]
  displayName: string
  widthClassName?: string
}

const badgeIcons: Record<string, ElementType> = {
  Fastest: Zap,
  Efficient: CircleDollarSign,
  Thinking: Brain,
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  groups,
  displayName,
  widthClassName = "w-72",
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const selectedOption = groups.flatMap((group) => group.options).find((option) => option.id === selectedModel)

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
          {selectedOption?.badge && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3 w-3 text-muted-foreground/60 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={cn(widthClassName, "rounded-xl border-border/50 p-2 shadow-xl")}>
        {groups.map((group, groupIndex) => (
          <div key={group.label || groupIndex}>
            {groupIndex > 0 && <DropdownMenuSeparator className="my-2" />}
            {group.label && (
              <DropdownMenuLabel className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <MoreHorizontal className="h-3 w-3" />
                {group.label}
              </DropdownMenuLabel>
            )}
            <div className={cn(group.compact && "max-h-[240px] overflow-y-auto")}>
              {group.options.map((model) => {
                const BadgeIcon = model.badge ? badgeIcons[model.badge] : Sparkles
                const isSelected = selectedModel === model.id
                const isCompact = group.compact

                return (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-lg transition-colors",
                      isCompact ? "p-2.5" : "p-3",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex shrink-0 items-center justify-center",
                        isCompact ? "h-7 w-7 rounded-md" : "h-8 w-8 rounded-lg",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground/60"
                      )}
                    >
                      <BadgeIcon className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{model.name}</span>
                          {model.badge && !isCompact && (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {model.badge}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </div>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </div>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

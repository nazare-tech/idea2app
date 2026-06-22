"use client"

import { CircleHelp } from "lucide-react"
import { type ReactNode, useState } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getExplainableTerm,
  getExplainableTermKeyByLabel,
  type ExplainableTermKey,
} from "@/lib/explainable-terms"
import { cn } from "@/lib/utils"

export function ExplainTermButton({
  termKey,
  label,
  compact = false,
  className,
}: {
  termKey?: ExplainableTermKey
  label?: string
  compact?: boolean
  className?: string
}) {
  const [isHoverFocusOpen, setIsHoverFocusOpen] = useState(false)
  const [isPinnedOpen, setIsPinnedOpen] = useState(false)
  const isOpen = isHoverFocusOpen || isPinnedOpen

  if (!termKey) return null

  const term = getExplainableTerm(termKey)
  const accessibleLabel = label ?? term.label

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip open={isOpen} onOpenChange={setIsHoverFocusOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Explain ${accessibleLabel}`}
            aria-expanded={isOpen}
            onClick={(event) => {
              event.preventDefault()
              setIsPinnedOpen((current) => {
                if (current) {
                  setIsHoverFocusOpen(false)
                }
                return !current
              })
            }}
            onBlur={() => {
              setIsHoverFocusOpen(false)
              setIsPinnedOpen(false)
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return
              setIsHoverFocusOpen(false)
              setIsPinnedOpen(false)
            }}
            className={cn(
              "inline-grid shrink-0 place-items-center rounded-full border border-[#E8DDD5] bg-[#FAFAFA] text-[#8A8480] transition-colors hover:border-[#D8CEC5] hover:bg-[#F5F0EB] hover:text-[#4A4040] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              compact ? "h-4 w-4" : "h-5 w-5",
              className,
            )}
          >
            <CircleHelp
              className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3")}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[#D9D3CE]">
            {term.label}
          </span>
          <span className="mt-1 block text-[#FAFAFA]">{term.description}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function ExplainableLabel({
  children,
  termKey,
  label,
  className,
  compact = true,
}: {
  children: ReactNode
  termKey?: ExplainableTermKey
  label?: string
  className?: string
  compact?: boolean
}) {
  const resolvedLabel = label ?? (typeof children === "string" ? children : undefined)
  const resolvedTermKey = termKey ?? (resolvedLabel ? getExplainableTermKeyByLabel(resolvedLabel) : undefined)

  if (!resolvedTermKey) return <>{children}</>

  const buttonLabel = resolvedLabel ?? getExplainableTerm(resolvedTermKey).label

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="border-b border-dotted border-[#8A8480]">
        {children}
      </span>
      <ExplainTermButton
        termKey={resolvedTermKey}
        label={buttonLabel}
        compact={compact}
      />
    </span>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  ChevronDown,
  Loader2,
  MoreHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useGenerateAllStore, type QueueItemStatus } from "@/stores/generate-all-store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DOCUMENT_PRIMARY_MODELS,
  DOCUMENT_MORE_MODELS,
} from "@/lib/prompt-chat-config"

// ---------------------------------------------------------------------------
// Tab navigation map — each docType maps to its URL search param value
// ---------------------------------------------------------------------------

const TAB_MAP: Record<string, string> = {
  competitive: "competitive",
  prd: "prd",
  mvp: "mvp",
  mockups: "mockups",
  launch: "launch",
}

// ---------------------------------------------------------------------------
// Fixed method labels — items that use a specific tool rather than an AI model
// ---------------------------------------------------------------------------

const FIXED_METHOD: Partial<Record<string, string>> = {
  mockups: "Stitch SDK",
  launch: "Template",
}

const ALL_MODELS = [...DOCUMENT_PRIMARY_MODELS, ...DOCUMENT_MORE_MODELS]

function getModelOption(modelId: string) {
  return ALL_MODELS.find((m) => m.id === modelId)
}

function getDotColor(badge?: string): string {
  switch (badge) {
    case "Fastest":  return "bg-red-500"
    case "Efficient": return "bg-emerald-500"
    case "Thinking": return "bg-blue-500"
    default:         return "bg-muted-foreground/30"
  }
}

function getBadgeColor(badge: string): string {
  switch (badge) {
    case "Fastest":  return "text-red-500"
    case "Efficient": return "text-emerald-500"
    case "Thinking": return "text-blue-500"
    default:         return "text-muted-foreground"
  }
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  index,
  status,
}: {
  index: number
  status: QueueItemStatus
}) {
  if (status === "done" || status === "skipped") {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5]">
        <Check className="h-3.5 w-3.5 text-[#22C55E]" />
      </div>
    )
  }
  if (status === "generating") {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF]">
        <Loader2 className="h-3.5 w-3.5 text-[#3B82F6] animate-spin" />
      </div>
    )
  }
  if (status === "error") {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50">
        <X className="h-3.5 w-3.5 text-red-500" />
      </div>
    )
  }
  // pending / cancelled
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border">
      <span className="text-[11px] font-semibold text-muted-foreground font-heading">
        {index + 1}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Model pill — shows the selected model or a fixed method label
// ---------------------------------------------------------------------------

function ModelPill({
  docType,
  selectedModel,
  status,
  onModelChange,
}: {
  docType: string
  selectedModel: string
  status: QueueItemStatus
  onModelChange: (model: string) => void
}) {
  const fixedMethod = FIXED_METHOD[docType]

  // Fixed items (Stitch SDK, Template) — never interactive
  if (fixedMethod) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/60 px-2.5 py-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <span className="text-[11px] text-muted-foreground">{fixedMethod}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
          FIXED
        </span>
      </div>
    )
  }

  const option = getModelOption(selectedModel)
  const dotColor = getDotColor(option?.badge)
  const badgeColor = option?.badge ? getBadgeColor(option.badge) : ""

  // Interactive dropdown — shown when idle or when running and still pending
  const isInteractive = status === "pending"

  if (!isInteractive) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/60 px-2.5 py-1.5 opacity-60">
        <div className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
        <span className="text-[11px] text-muted-foreground">
          {option?.name ?? selectedModel.split("/").pop()}
        </span>
        {option?.badge && (
          <span className={cn("text-[10px] font-bold uppercase tracking-wide", badgeColor)}>
            {option.badge}
          </span>
        )}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/60 px-2.5 py-1.5 transition-colors hover:bg-secondary">
          <div className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
          <span className="text-[11px] text-foreground/80">
            {option?.name ?? selectedModel.split("/").pop()}
          </span>
          {option?.badge && (
            <span className={cn("text-[10px] font-bold uppercase tracking-wide", badgeColor)}>
              {option.badge}
            </span>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl border-border/50 p-2 shadow-xl">
        {[
          { options: DOCUMENT_PRIMARY_MODELS },
          { label: "More models", options: DOCUMENT_MORE_MODELS, compact: true },
        ].map((group, groupIndex) => (
          <div key={group.label ?? groupIndex}>
            {groupIndex > 0 && <DropdownMenuSeparator className="my-2" />}
            {group.label && (
              <DropdownMenuLabel className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <MoreHorizontal className="h-3 w-3" />
                {group.label}
              </DropdownMenuLabel>
            )}
            <div className={cn(group.compact && "max-h-[200px] overflow-y-auto")}>
              {group.options.map((model) => {
                const mDot = getDotColor(model.badge)
                const mBadge = model.badge ? getBadgeColor(model.badge) : ""
                const isSelected = selectedModel === model.id
                return (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => onModelChange(model.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg p-2.5",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    <div className={cn("h-2 w-2 shrink-0 rounded-full", mDot)} />
                    <span className="flex-1 text-sm font-medium">{model.name}</span>
                    {model.badge && (
                      <span className={cn("text-[10px] font-bold uppercase tracking-wide", mBadge)}>
                        {model.badge}
                      </span>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
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

// ---------------------------------------------------------------------------
// Elapsed timer hook
// ---------------------------------------------------------------------------

function useElapsedTime(startedAt: Date | null, isRunning: boolean) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isRunning || !startedAt) {
      if (startedAt && !isRunning) {
        setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
      }
      return
    }
    const update = () => setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startedAt, isRunning])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GenerateAllBlock({
  projectId,
  credits,
}: {
  projectId: string
  credits: number
}) {
  const {
    status,
    queue,
    modelSelections,
    totalCredits,
    creditsUsed,
    startedAt,
    error,
    startGenerateAll,
    cancelGenerateAll,
    updateModelSelection,
  } = useGenerateAllStore(projectId)

  const isRunning     = status === "running"
  const isCompleted   = status === "completed"
  const isCancelled   = status === "cancelled"
  const isInterrupted = status === "interrupted"
  const isError       = status === "error"
  const isIdle        = status === "idle"
  const isLoading     = status === "loading"

  const elapsedTime = useElapsedTime(startedAt, isRunning)

  const completedCount  = queue.filter((item) => item.status === "done").length
  const totalActionable = queue.filter((item) => item.status !== "skipped").length
  const allSkipped      = queue.length > 0 && queue.every((item) => item.status === "skipped")
  const hasInsufficientCredits = totalCredits > credits

  const progressPercent = totalActionable > 0
    ? Math.round((completedCount / totalActionable) * 100)
    : 0

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 p-5">
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          <span className="text-sm text-muted-foreground">Loading generation status...</span>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // All documents already up to date
  // -------------------------------------------------------------------------
  if (isIdle && allSkipped) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECFDF5]">
              <Check className="h-4 w-4 text-[#22C55E]" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold font-heading text-foreground">
                All Documents Generated
              </h3>
              <p className="text-[12px] text-muted-foreground">All documents are up to date</p>
            </div>
          </div>
          <div className="divide-y divide-border/40">
            {queue.map((item, i) => (
              <div key={item.docType} className="flex items-center gap-3 py-3">
                <StepIndicator index={i} status={item.status} />
                <span className="flex-1 text-[13px] font-semibold font-heading text-muted-foreground">
                  {item.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#22C55E]">Done</span>
                  {TAB_MAP[item.docType] && (
                    <Link href={`?tab=${TAB_MAP[item.docType]}`}>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            {isCompleted ? (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5]">
                <Check className="h-4 w-4 text-[#22C55E]" />
              </div>
            ) : isError ? (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
            ) : isInterrupted ? (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
            )}

            <div>
              <h3 className="text-[15px] font-bold font-heading text-foreground leading-tight">
                {isRunning
                  ? "Generating Documents"
                  : isCompleted
                    ? "All Documents Generated"
                    : isError
                      ? "Generation Error"
                      : isCancelled
                        ? "Generation Cancelled"
                        : isInterrupted
                          ? "Generation Interrupted"
                          : "Generate All Documents"}
              </h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {isRunning
                  ? `${completedCount} / ${totalActionable} documents`
                  : isCompleted
                    ? "All documents have been generated successfully"
                    : isError
                      ? error || "An error occurred during generation"
                      : isCancelled
                        ? `${completedCount} / ${totalActionable} completed before cancellation`
                        : isInterrupted
                          ? `${completedCount} / ${totalActionable} completed — page was refreshed mid-generation`
                          : "Create your complete business plan in one click"}
              </p>
            </div>
          </div>

          {/* Stop button during generation */}
          {isRunning && (
            <Button
              variant="outline"
              size="sm"
              onClick={cancelGenerateAll}
              className="shrink-0 border-primary/30 text-primary hover:bg-primary/5 text-xs h-7"
            >
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar (running only) */}
      {isRunning && (
        <div className="px-5 pt-3 pb-1">
          <div className="h-[3px] w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue list */}
      <div className="px-5 pt-3 pb-2 divide-y divide-border/40">
        {queue.map((item, i) => {
          const isGenerating = item.status === "generating"
          const isDone       = item.status === "done" || item.status === "skipped"
          const showModelPill = item.status !== "skipped"
          const showNavLink  =
            isDone && TAB_MAP[item.docType]

          return (
            <div
              key={item.docType}
              className={cn(
                "flex items-center gap-3 py-3",
                isGenerating && "bg-[#EFF6FF]/20 -mx-1 px-1 rounded-xl",
              )}
            >
              <StepIndicator index={i} status={item.status} />

              {/* Doc name + subtext */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "block text-[13px] font-semibold font-heading leading-tight",
                    isDone
                      ? "text-muted-foreground"
                      : item.status === "error"
                        ? "text-red-600"
                        : "text-foreground",
                  )}
                >
                  {item.label}
                </span>

                {/* Subtext: streaming message, status, or credit cost */}
                {isGenerating ? (
                  <span className="block text-[11px] text-[#3B82F6] mt-0.5 font-mono">
                    {item.stageMessage || "Generating…"}
                  </span>
                ) : item.status === "error" ? (
                  <span className="block text-[11px] text-red-500 mt-0.5">
                    {item.error || "Failed"}
                  </span>
                ) : item.status === "cancelled" ? (
                  <span className="block text-[11px] text-muted-foreground mt-0.5">Cancelled</span>
                ) : isDone ? (
                  <span className="block text-[11px] text-[#22C55E] mt-0.5">Done</span>
                ) : (
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    {item.creditCost} credits
                  </span>
                )}
              </div>

              {/* Right: model pill + optional nav link */}
              <div className="flex shrink-0 items-center gap-2">
                {showModelPill && (
                  <ModelPill
                    docType={item.docType}
                    selectedModel={modelSelections[item.docType]}
                    status={item.status}
                    onModelChange={(model) => updateModelSelection(item.docType, model)}
                  />
                )}
                {showNavLink && (
                  <Link href={`?tab=${TAB_MAP[item.docType]}`}>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-secondary/40 px-5 py-4">
        {isIdle && (
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="block text-[11px] text-muted-foreground">Estimated total</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[18px] font-bold text-foreground leading-none">
                  {totalCredits}
                </span>
                <span className="text-[12px] text-muted-foreground">credits</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasInsufficientCredits && (
                <span className="text-[11px] text-red-500">
                  Need {totalCredits}, have {credits}
                </span>
              )}
              <Button
                size="sm"
                onClick={startGenerateAll}
                disabled={hasInsufficientCredits || totalActionable === 0}
                className="bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold h-9 px-5 rounded-lg gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate All
              </Button>
            </div>
          </div>
        )}

        {isRunning && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground font-mono">
              Elapsed: {elapsedTime}
            </span>
            <span className="text-[12px] text-muted-foreground font-mono">
              {creditsUsed} credits used
            </span>
          </div>
        )}

        {isCompleted && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground font-mono">
              Completed in {elapsedTime} · {creditsUsed} credits used
            </span>
          </div>
        )}

        {(isError || isCancelled) && (
          <div className="flex items-end justify-between gap-3">
            <span className="text-[12px] text-muted-foreground font-mono">
              {completedCount} / {totalActionable} completed · {creditsUsed} credits used
            </span>
            <Button
              size="sm"
              onClick={startGenerateAll}
              disabled={hasInsufficientCredits}
              className="bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold h-9 px-5 rounded-lg gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isError ? "Retry" : "Resume"}
            </Button>
          </div>
        )}

        {isInterrupted && (
          <div className="flex items-end justify-between gap-3">
            <span className="text-[12px] text-muted-foreground font-mono">
              {completedCount} / {totalActionable} completed · resume to continue
            </span>
            <Button
              size="sm"
              onClick={startGenerateAll}
              disabled={hasInsufficientCredits}
              className="bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold h-9 px-5 rounded-lg gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Resume
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

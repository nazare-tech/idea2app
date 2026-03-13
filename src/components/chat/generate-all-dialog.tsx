"use client"

import { cn } from "@/lib/utils"
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
  RotateCcw,
  ChevronRight,
} from "lucide-react"
import type { DocumentType } from "@/components/layout/document-nav"

export type GenerateAllProgressStatus = "queued" | "generating" | "done" | "error"

export interface GenerateAllProgress {
  competitive: GenerateAllProgressStatus
  prd: GenerateAllProgressStatus
  mvp: GenerateAllProgressStatus
  techspec: GenerateAllProgressStatus
  mockups: GenerateAllProgressStatus
}

interface GenerateAllDialogProps {
  creditCost: number
  credits: number
  onAccept: () => void
  onDismiss: () => void
  /** null = confirmation state; non-null = in-progress / complete state */
  progress: GenerateAllProgress | null
  onNavigate?: (type: DocumentType) => void
  onRetry?: (type: DocumentType) => void
}

const ARTIFACT_LABELS: Array<{
  key: keyof GenerateAllProgress
  label: string
  type: DocumentType
}> = [
  { key: "competitive", label: "Competitive Research", type: "competitive" },
  { key: "prd",         label: "PRD",                  type: "prd" },
  { key: "mvp",         label: "MVP Plan",              type: "mvp" },
  { key: "techspec",    label: "Tech Spec",             type: "techspec" },
  { key: "mockups",     label: "Mockups",               type: "mockups" },
]

function StatusIcon({ status }: { status: GenerateAllProgressStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
    case "generating":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
    case "error":
      return <XCircle className="h-4 w-4 shrink-0 text-destructive" />
    default:
      return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
  }
}

function statusLabel(status: GenerateAllProgressStatus): string {
  switch (status) {
    case "done":      return "Done"
    case "generating": return "Generating..."
    case "error":     return "Failed"
    default:          return "Queued"
  }
}

export function GenerateAllDialog({
  creditCost,
  credits,
  onAccept,
  onDismiss,
  progress,
  onNavigate,
  onRetry,
}: GenerateAllDialogProps) {
  const hasEnoughCredits = credits >= creditCost

  // --- Progress state ---
  if (progress !== null) {
    const doneCount = ARTIFACT_LABELS.filter(a => progress[a.key] === "done").length
    const allDone = doneCount === ARTIFACT_LABELS.length
    const progressPct = Math.round((doneCount / ARTIFACT_LABELS.length) * 100)

    return (
      <div className="mx-auto max-w-3xl px-4 pb-4">
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/40">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {allDone ? "Blueprint complete!" : "Generating your business blueprint..."}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {doneCount} of {ARTIFACT_LABELS.length} complete
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Artifact rows */}
          <div className="divide-y divide-border/30">
            {ARTIFACT_LABELS.map(({ key, label, type }) => {
              const status = progress[key]
              const isDone = status === "done"
              const isError = status === "error"

              return (
                <div key={key} className="flex items-center gap-3 px-5 py-3">
                  <StatusIcon status={status} />
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      isDone ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {isDone && onNavigate ? (
                      <button
                        type="button"
                        onClick={() => onNavigate(type)}
                        className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {label}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    ) : (
                      label
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      isDone ? "text-emerald-500" : isError ? "text-destructive" : "text-muted-foreground/60"
                    )}
                  >
                    {isError && onRetry ? (
                      <button
                        type="button"
                        onClick={() => onRetry(type)}
                        className="inline-flex items-center gap-1 text-destructive hover:underline"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </button>
                    ) : (
                      statusLabel(status)
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          {/* CTA when all done */}
          {allDone && onNavigate && (
            <div className="px-5 py-4 border-t border-border/40">
              <button
                type="button"
                onClick={() => onNavigate("competitive")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                View Competitive Research
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Confirmation state ---
  return (
    <div className="mx-auto max-w-3xl px-4 pb-4">
      <div className="rounded-2xl border border-primary/20 bg-card shadow-sm">
        <div className="px-5 py-5">
          {/* Icon + Title */}
          <div className="flex items-start gap-3 mb-3">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-snug">
                Your idea is ready — generate your full business blueprint
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                We&apos;ll create 5 documents to take your idea further:{" "}
                <span className="text-foreground/70">
                  Competitive Research, PRD, MVP Plan, Tech Spec, and Mockups.
                </span>
              </p>
            </div>
          </div>

          {/* Credit cost line */}
          <div className="ml-11 mb-4">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1",
                hasEnoughCredits
                  ? "bg-muted/60 text-muted-foreground"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}
            >
              {hasEnoughCredits ? (
                <>Estimated cost: ~{creditCost} credits</>
              ) : (
                <>
                  Insufficient credits — need {creditCost}, you have {credits}
                </>
              )}
            </span>
          </div>

          {/* Buttons */}
          <div className="ml-11 flex items-center gap-3">
            <button
              type="button"
              onClick={onAccept}
              disabled={!hasEnoughCredits}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                hasEnoughCredits
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              )}
              title={!hasEnoughCredits ? `Need ${creditCost} credits, you have ${credits}` : undefined}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate All — {creditCost} credits
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              I&apos;ll do it manually
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useRef, useState, type ElementType } from "react"
import {
  ChartNoAxesColumn,
  ClipboardList,
  FileText,
  LayoutGrid,
  Rocket,
  Sparkles,
} from "lucide-react"

import type {
  OnboardingGenerationStatus,
  OnboardingLoadingRowKey,
} from "@/lib/onboarding-generation"
import { cn } from "@/lib/utils"

export interface IntakeLoadingRow {
  key: OnboardingLoadingRowKey
  label: string
  message: string
  status: OnboardingGenerationStatus
}

interface IntakeSubmissionLoadingPanelProps {
  rows?: IntakeLoadingRow[]
}

export const INTAKE_FAKE_PROGRESS_DURATION_MS = 40000
export const INTAKE_MAX_FAKE_PROGRESS = 90
export const INTAKE_MIN_ANIMATED_PROGRESS = 12

const DEFAULT_ROWS: IntakeLoadingRow[] = [
  {
    key: "executive-summary",
    label: "Executive Summary",
    message: "Finding market patterns",
    status: "generating",
  },
  {
    key: "market-research",
    label: "Market research",
    message: "Scoping opportunity",
    status: "generating",
  },
  {
    key: "prd",
    label: "Product Plan",
    message: "Drafting requirements",
    status: "pending",
  },
  {
    key: "mvp",
    label: "First version plan",
    message: "Planning launchable scope",
    status: "pending",
  },
  {
    key: "mockups",
    label: "Design mockups",
    message: "Generating visual directions",
    status: "pending",
  },
  {
    key: "ai-prompts",
    label: "AI Prompts",
    message: "Assembling AI handoff",
    status: "pending",
  },
]

const ROW_ICONS: Record<OnboardingLoadingRowKey, ElementType> = {
  "executive-summary": FileText,
  "market-research": ChartNoAxesColumn,
  prd: ClipboardList,
  mvp: Rocket,
  mockups: LayoutGrid,
  "ai-prompts": Sparkles,
}

export function IntakeSubmissionLoadingPanel({
  rows = DEFAULT_ROWS,
}: IntakeSubmissionLoadingPanelProps) {
  const startedAtRef = useRef(0)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const normalizedRows = useMemo(() => (rows.length > 0 ? rows : DEFAULT_ROWS), [rows])

  useEffect(() => {
    if (startedAtRef.current === 0) {
      startedAtRef.current = Date.now()
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    function updateProgress() {
      const elapsedMs = Date.now() - startedAtRef.current
      const timedProgress = getTimedIntakeProgress(elapsedMs, prefersReducedMotion)

      setProgress((current) => {
        const next = { ...current }
        for (const row of normalizedRows) {
          next[row.key] = getNextIntakeProgressValue(row.status, current[row.key], timedProgress)
        }
        return next
      })
    }

    updateProgress()
    if (prefersReducedMotion) return

    const interval = window.setInterval(updateProgress, 250)
    return () => window.clearInterval(interval)
  }, [normalizedRows])

  return (
    <div
      className="min-h-full bg-[#FAFAFA] text-[#1C1917]"
      data-testid="intake-submission-loading"
      aria-live="polite"
      aria-busy="true"
    >
      <main className="flex min-h-full items-center justify-center px-4 py-8">
        <section className="w-full max-w-[800px] bg-white px-6 py-8 sm:px-10" aria-label="Project generation progress">
          <div>
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[#8A8480]">
              Analyzing your inputs
            </p>
            <h1 className="mt-2 font-[family:var(--font-display)] text-4xl font-bold leading-none text-[#1C1917] sm:text-5xl">
              Creating your project plan
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#4A4040]">
              Generating market research, product scope, and mockup directions.
            </p>
          </div>

          <div className="mt-7 divide-y divide-[#E8DDD5] border-y border-[#E8DDD5]">
            {normalizedRows.map((row) => {
              const Icon = ROW_ICONS[row.key]
              const value = progress[row.key] ?? 0
              const isAnimated = shouldAnimateIntakeProgress(row.status, value)
              return (
                <div key={row.key} className="flex gap-4 py-[18px] sm:gap-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[rgba(121,116,126,0.16)] bg-[#FAFAFA] sm:size-12">
                    <Icon className="size-5 text-[#1C1917] sm:size-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <p className="font-[family:var(--font-display)] text-lg font-bold text-[#0D1320] sm:text-xl">
                        {row.label}
                      </p>
                      <p
                        className={cn(
                          "text-sm text-[#4A4040] sm:text-right",
                          row.status === "error" && "text-destructive",
                          row.status === "done" && "text-[#166534]",
                        )}
                      >
                        {statusMessage(row)}
                      </p>
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-[#E5E7EB]">
                      <div
                        className={cn(
                          "intake-progress-fill relative h-full overflow-hidden bg-[#0D1320] transition-[width] duration-500 ease-out",
                          isAnimated && "intake-progress-fill--active",
                          row.status === "error" && "bg-destructive",
                          row.status === "done" && "bg-[#166534]",
                        )}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

export function getTimedIntakeProgress(elapsedMs: number, prefersReducedMotion: boolean) {
  if (prefersReducedMotion) return 85

  return Math.min(
    INTAKE_MAX_FAKE_PROGRESS,
    (Math.max(0, elapsedMs) / INTAKE_FAKE_PROGRESS_DURATION_MS) * INTAKE_MAX_FAKE_PROGRESS,
  )
}

export function getNextIntakeProgressValue(
  status: OnboardingGenerationStatus,
  currentValue: number | undefined,
  timedProgress: number,
) {
  if (status === "done") return 100
  if (status === "error" || status === "cancelled") {
    return Math.min(currentValue ?? timedProgress, INTAKE_MAX_FAKE_PROGRESS)
  }
  if (status === "generating") {
    return Math.max(currentValue ?? 0, timedProgress)
  }

  return 0
}

export function shouldAnimateIntakeProgress(status: OnboardingGenerationStatus, value: number) {
  return status === "generating" && value >= INTAKE_MIN_ANIMATED_PROGRESS
}

export function statusMessage(row: IntakeLoadingRow) {
  if (row.status === "done") return "Ready"
  if (row.status === "error") return "Needs retry"
  if (row.status === "cancelled") return "Cancelled"
  if (row.status === "pending" || row.status === "skipped") return "Waiting"
  return row.message
}

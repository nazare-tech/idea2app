"use client"

import { useEffect, useMemo, useRef, useState, type ElementType } from "react"
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  FileText,
  Megaphone,
  Rocket,
} from "lucide-react"

import type {
  OnboardingGenerationStatus,
  OnboardingLoadingRowKey,
} from "@/lib/onboarding-generation"
import { APP_BRAND_NAME } from "@/lib/app-brand"
import { cn } from "@/lib/utils"

export interface IntakeLoadingRow {
  key: OnboardingLoadingRowKey
  label: string
  message: string
  status: OnboardingGenerationStatus
}

interface IntakeSubmissionLoadingPanelProps {
  rows?: IntakeLoadingRow[]
  userInitials?: string
  userLabel?: string
}

const DEFAULT_ROWS: IntakeLoadingRow[] = [
  {
    key: "overview",
    label: "Overview",
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
    label: "PRD",
    message: "Drafting requirements",
    status: "pending",
  },
  {
    key: "mvp",
    label: "MVP plan",
    message: "Planning launchable scope",
    status: "pending",
  },
  {
    key: "launch",
    label: "Marketing",
    message: "Mapping launch channels",
    status: "pending",
  },
]

const ROW_ICONS: Record<OnboardingLoadingRowKey, ElementType> = {
  overview: FileText,
  "market-research": BarChart3,
  prd: ClipboardList,
  mvp: Rocket,
  launch: Megaphone,
}

export function IntakeSubmissionLoadingPanel({
  rows = DEFAULT_ROWS,
  userInitials = "ME",
  userLabel = "Account",
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
      const timedProgress = prefersReducedMotion
        ? 85
        : Math.min(90, (elapsedMs / 20000) * 90)

      setProgress((current) => {
        const next = { ...current }
        for (const row of normalizedRows) {
          if (row.status === "done") {
            next[row.key] = 100
          } else if (row.status === "error" || row.status === "cancelled") {
            next[row.key] = Math.min(current[row.key] ?? timedProgress, 90)
          } else {
            next[row.key] = Math.max(current[row.key] ?? 0, timedProgress)
          }
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
      className="min-h-screen bg-[#FAFAFA] text-[#1C1917]"
      data-testid="intake-submission-loading"
      aria-live="polite"
      aria-busy="true"
    >
      <header className="flex h-16 items-center justify-between border border-[#E8DDD5] bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center rounded bg-[#DC2626] font-[family:var(--font-display)] text-[13px] font-bold text-white">
            M
          </div>
          <p className="text-sm font-semibold text-[#4A4040]">{APP_BRAND_NAME}</p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-[#E8DDD5] bg-[#FAFAFA] py-2 pr-3 pl-2 sm:flex">
          <div className="flex size-7 items-center justify-center rounded-full bg-[#111111] text-[11px] font-bold text-white">
            {userInitials}
          </div>
          <p className="text-[13px] font-semibold text-[#1C1917]">{userLabel}</p>
          <ChevronDown className="size-4 text-[#4A4040]" aria-hidden="true" />
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
        <section className="w-full max-w-[800px] bg-white px-6 py-8 sm:px-10" aria-label="Project generation progress">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8480]">
              Analyzing your inputs
            </p>
            <h1 className="mt-2 font-[family:var(--font-display)] text-4xl font-bold leading-none text-[#1C1917] sm:text-5xl">
              Building your strategic brief
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#4A4040]">
              We&apos;re pulling together insights, structure, and signals to build your strategic plan
            </p>
          </div>

          <div className="mt-7 divide-y divide-[#E8DDD5] border-y border-[#E8DDD5]">
            {normalizedRows.map((row) => {
              const Icon = ROW_ICONS[row.key]
              const value = progress[row.key] ?? 0
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
                          "h-full bg-[#0D1320] transition-[width] duration-500 ease-out",
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

function statusMessage(row: IntakeLoadingRow) {
  if (row.status === "done") return "Ready"
  if (row.status === "error") return "Needs retry"
  if (row.status === "cancelled") return "Cancelled"
  return row.message
}

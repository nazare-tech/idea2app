// src/components/layout/nav-status.tsx
// Document status primitives shared by the desktop anchor rail and the mobile
// bottom chrome (peek bar + documents sheet), so status colors and labels stay
// defined once.
"use client"

import { cn } from "@/lib/utils"
import type { DocumentGenerationDisplayState } from "@/lib/document-generation-display-status"

export type NavStatus = "done" | "in_progress" | "pending" | "needs_retry"

export function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("animate-spin", className)}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
    >
      <circle
        cx="6"
        cy="6"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="20"
        strokeDashoffset="5"
      />
    </svg>
  )
}

export function StatusMarker({
  status,
}: {
  status: NavStatus
}) {
  const markerColor = status === "done"
    ? "bg-[#22C55E]"
    : status === "in_progress"
      ? "bg-primary"
      : status === "needs_retry"
        ? "bg-destructive"
      : "bg-[#C9C1B8]"

  return <span aria-hidden="true" className={cn("h-4 w-1 shrink-0 rounded-sm", markerColor)} />
}

export function StatusText({
  status,
  displayState,
  derived = false,
}: {
  status: NavStatus
  displayState?: DocumentGenerationDisplayState
  derived?: boolean
}) {
  if (status === "in_progress") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">
        <SpinnerIcon className="h-3 w-3" />
        <span>Generating</span>
      </span>
    )
  }

  // Derived items have no queue item to retry; the honest label is that the
  // assembled content is incomplete, not that a generation step failed.
  if (status === "needs_retry") return <span>{derived ? "Incomplete" : "Needs retry"}</span>
  if (displayState?.displayStatus === "waiting") return <span>Waiting</span>
  if (displayState?.displayStatus === "queued") return <span>Queued</span>
  if (status === "done") return <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#22C55E] opacity-60" />
  return null
}

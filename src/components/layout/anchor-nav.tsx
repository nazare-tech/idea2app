// src/components/layout/anchor-nav.tsx
"use client"

import { forwardRef } from "react"
import { AlertCircle, CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { SCROLLABLE_NAV_ITEMS, type DocumentNavItem } from "@/lib/document-sections"
import type { DocumentGenerationDisplayState } from "@/lib/document-generation-display-status"

type NavStatus = "done" | "in_progress" | "pending" | "needs_retry"

interface AnchorNavProps {
  /** Status per sourceType (e.g., { competitive: "done", prd: "pending" }) */
  documentStatuses: Record<string, NavStatus>
  /** Rich status per visible nav key (overview, market-research, prd, etc.) */
  documentDisplayStates?: Record<string, DocumentGenerationDisplayState>
  /** Currently visible section key (set by IntersectionObserver) */
  activeKey: string | null
  /** Currently visible sub-section ID */
  activeSectionId: string | null
  /** Callback when user clicks a tab or sub-tab */
  onNavigate: (sectionId: string) => void
}

function SpinnerIcon({ className }: { className?: string }) {
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

function StatusIcon({
  status,
  isActive,
  displayState,
}: {
  status: NavStatus
  isActive?: boolean
  displayState?: DocumentGenerationDisplayState
}) {
  if (status === "done") {
    return (
      <CheckCircle2
        aria-hidden="true"
        className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-[#22C55E]")}
      />
    )
  }

  if (status === "in_progress") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-primary/10 px-2 py-1 font-mono text-[10px] font-medium text-primary">
        <SpinnerIcon className="h-3.5 w-3.5" />
        <span>Generating</span>
      </span>
    )
  }

  if (status === "needs_retry") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-red-50 px-2 py-1 font-mono text-[10px] font-medium text-red-600">
        <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
        <span>Needs retry</span>
      </span>
    )
  }

  if (displayState?.displayStatus === "queued") {
    return (
      <span className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[10px] font-medium",
        isActive ? "bg-primary/10 text-primary" : "bg-[#F1F1F1] text-[#777777]",
      )}>
        <Circle aria-hidden="true" className="h-3 w-3" />
        <span>Queued</span>
      </span>
    )
  }

  return (
    <Circle
      aria-hidden="true"
      className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-[#999999]")}
    />
  )
}

function NavTab({
  item,
  status,
  isActive,
  activeSectionId,
  displayState,
  onNavigate,
}: {
  item: DocumentNavItem
  status: NavStatus
  isActive: boolean
  activeSectionId: string | null
  displayState?: DocumentGenerationDisplayState
  onNavigate: (id: string) => void
}) {
  const isInProgress = status === "in_progress"
  const isPending = status === "pending"
  const hasIssue = status === "needs_retry"

  const containerStyle = isActive
    ? "border-primary/35 bg-primary/10"
    : isInProgress
      ? "border-primary/25 bg-primary/5"
      : hasIssue
        ? "border-red-200 bg-red-50/60"
      : "border-[#E5E5E5] bg-white hover:border-[#D6D0CA] hover:bg-[#F5F0EB]"

  const titleColor = isActive || isInProgress
    ? "text-[#0A0A0A]"
    : hasIssue
      ? "text-red-700"
    : isPending
      ? "text-[#777777]"
      : "text-[#0A0A0A]"

  const subColor = isPending ? "text-[#999999]" : "text-[#777777]"

  return (
    <div className={cn("min-w-[168px] shrink-0 rounded-md border p-2 transition-colors lg:min-w-0 lg:shrink", containerStyle)}>
      {/* Tab title row */}
      <button
        type="button"
        data-nav-target={item.key}
        onClick={() => onNavigate(item.key)}
        aria-current={isActive ? "location" : undefined}
        aria-label={`${item.label}, ${status.replace("_", " ")}`}
        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
      >
        <span className={cn("flex-1 text-base", isActive ? "font-extrabold" : "font-bold", titleColor)}>
          {item.label}
        </span>
        <StatusIcon status={status} isActive={isActive} displayState={displayState} />
      </button>

      {/* Sub-tabs */}
      <div className="mt-1 ml-2 hidden border-l border-[#E5E5E5] pl-2 lg:block">
        {item.sections.map((section, idx) => {
          const isActiveSub = activeSectionId === section.id
          // In-progress items: vary opacity by position
          const inProgressOpacity = isInProgress
            ? idx < 3 ? "opacity-90" : idx < 6 ? "opacity-55" : "opacity-45"
            : ""

          return (
            <button
              key={section.id}
              type="button"
              data-nav-target={section.id}
              onClick={() => onNavigate(section.id)}
              aria-current={isActiveSub ? "location" : undefined}
              className={cn(
                "block min-h-11 w-full cursor-pointer rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-[#F5F0EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0",
                isActiveSub
                  ? "bg-primary/10 font-semibold text-primary"
                  : cn(subColor, inProgressOpacity)
              )}
            >
              {section.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const AnchorNav = forwardRef<HTMLElement, AnchorNavProps>(function AnchorNav({
  documentStatuses,
  documentDisplayStates = {},
  activeKey,
  activeSectionId,
  onNavigate,
}, ref) {
  const getStatus = (item: DocumentNavItem): NavStatus => {
    return documentStatuses[item.sourceType] || "pending"
  }

  return (
    <nav
      ref={ref}
      className="workspace-anchor-nav flex w-full shrink-0 gap-2 overflow-x-auto border-b border-[#E2DDD6] bg-[#F8F6F3] px-4 py-3 lg:sticky lg:top-0 lg:h-[calc(100vh-64px)] lg:w-[300px] lg:flex-col lg:gap-2.5 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-6 lg:py-5"
    >
      {/* Document tabs */}
      {SCROLLABLE_NAV_ITEMS.map((item) => (
        <NavTab
          key={item.key}
          item={item}
          status={getStatus(item)}
          isActive={activeKey === item.key}
          activeSectionId={activeSectionId}
          displayState={documentDisplayStates[item.key]}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
})

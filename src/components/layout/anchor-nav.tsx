// src/components/layout/anchor-nav.tsx
"use client"

import { forwardRef } from "react"
import { Play, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { SCROLLABLE_NAV_ITEMS, type DocumentNavItem } from "@/lib/document-sections"
import type { DocumentType } from "@/lib/document-definitions"
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
  /** Callback when user manually generates or retries a document module. */
  onGenerateDocument?: (docType: DocumentType) => void
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

function StatusMarker({
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

function StatusText({
  status,
  displayState,
}: {
  status: NavStatus
  displayState?: DocumentGenerationDisplayState
}) {
  if (status === "in_progress") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">
        <SpinnerIcon className="h-3 w-3" />
        <span>Generating</span>
      </span>
    )
  }

  if (status === "needs_retry") return <span>Needs retry</span>
  if (displayState?.displayStatus === "queued") return <span>Queued</span>
  if (status === "done") return <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#22C55E] opacity-60" />
  return null
}

function NavTab({
  item,
  status,
  isActive,
  activeSectionId,
  displayState,
  onNavigate,
  onGenerateDocument,
}: {
  item: DocumentNavItem
  status: NavStatus
  isActive: boolean
  activeSectionId: string | null
  displayState?: DocumentGenerationDisplayState
  onNavigate: (id: string) => void
  onGenerateDocument?: (docType: DocumentType) => void
}) {
  const isInProgress = status === "in_progress"
  const isPending = status === "pending"
  const hasIssue = status === "needs_retry"
  const showGenerateAction = displayState?.displayStatus === "idle" && isPending
  const showRetryAction = hasIssue
  const actionLabel = showRetryAction ? "Retry" : showGenerateAction ? "Generate" : null
  const ActionIcon = showRetryAction ? RotateCcw : Play

  const containerStyle = isActive
    ? "bg-[#1C1917]"
    : isInProgress
      ? "bg-[#1C1917]"
      : hasIssue
        ? "bg-[#FFF4F1]"
        : "bg-[#FFFFFE] hover:bg-[#F5F0EB]"

  const titleColor = isActive || isInProgress
    ? "text-[#FAFAFA]"
    : hasIssue
      ? "text-destructive"
    : isPending
      ? "text-[#8A8480]"
      : "text-[#1C1917]"

  const subColor = isActive || isInProgress
    ? "text-[#FAFAFA]/70"
    : isPending
      ? "text-[#8A8480]"
      : "text-[#5D5551]"
  const connectorColor = isActive || isInProgress ? "border-[#FAFAFA]/20" : "border-[#E5DCD4]"
  const activeSubColor = isActive || isInProgress ? "text-[#FAFAFA]" : "text-primary"

  return (
    <div className={cn("min-w-[168px] shrink-0 rounded-md p-2 transition-colors lg:min-w-0 lg:shrink", containerStyle)}>
      {/* Tab title row */}
      <div className="flex min-h-8 w-full items-center gap-2">
        <StatusMarker status={status} />
        <button
          type="button"
          data-nav-target={item.key}
          onClick={() => onNavigate(item.key)}
          aria-current={isActive ? "location" : undefined}
          aria-label={`${item.label}, ${status.replace("_", " ")}`}
          className="min-w-0 flex-1 cursor-pointer rounded-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
        >
          <span className={cn("block truncate text-base font-bold", titleColor)}>
            {item.label}
          </span>
        </button>
        {actionLabel && onGenerateDocument ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onGenerateDocument(item.sourceType)
          }}
          className={cn(
            "inline-flex h-6 shrink-0 items-center justify-center gap-1.5 rounded-sm border px-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            hasIssue
              ? "border-destructive bg-destructive text-primary-foreground hover:bg-destructive/90"
              : isActive || isInProgress
                ? "border-[#FAFAFA]/25 bg-[#FAFAFA]/10 text-[#FAFAFA] hover:bg-[#FAFAFA]/15"
                : "border-[#D8CEC5] bg-[#FFFFFE] text-[#5D5551] hover:border-primary/50 hover:text-primary",
          )}
        >
          <ActionIcon aria-hidden="true" className="h-3 w-3" />
          <span>{actionLabel}</span>
        </button>
        ) : (
          <span className={cn(
            "shrink-0 text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
            isActive || isInProgress ? "text-[#FAFAFA]/75" : hasIssue ? "text-destructive" : "text-[#8A8480]",
          )}>
            <StatusText status={status} displayState={displayState} />
          </span>
        )}
      </div>

      {/* Sub-tabs */}
      <div className={cn("mt-1 ml-[11px] hidden border-l pl-2 lg:block", connectorColor)}>
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
                "block w-full cursor-pointer rounded-sm px-2 py-[2px] text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0",
                isActiveSub
                  ? cn("font-semibold", activeSubColor)
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
  onGenerateDocument,
}, ref) {
  const getStatus = (item: DocumentNavItem): NavStatus => {
    return documentStatuses[item.sourceType] || "pending"
  }

  return (
    <nav
      ref={ref}
      className="workspace-anchor-nav flex w-full shrink-0 gap-2 overflow-x-auto border-b border-[#E2DDD6] bg-[#FAFAFA] px-4 py-3 lg:sticky lg:top-0 lg:h-[calc(100vh-64px)] lg:w-[300px] lg:flex-col lg:gap-2.5 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-6 lg:py-5"
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
          onGenerateDocument={onGenerateDocument}
        />
      ))}
    </nav>
  )
})

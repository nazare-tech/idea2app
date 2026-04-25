// src/components/layout/anchor-nav.tsx
"use client"

import { cn } from "@/lib/utils"
import { SCROLLABLE_NAV_ITEMS, type DocumentNavItem } from "@/lib/document-sections"
import type { DocumentType } from "@/lib/document-definitions"

type NavStatus = "done" | "in_progress" | "pending"

interface AnchorNavProps {
  /** Status per sourceType (e.g., { competitive: "done", prd: "pending" }) */
  documentStatuses: Record<string, NavStatus>
  /** Currently visible section key (set by IntersectionObserver) */
  activeKey: string | null
  /** Currently visible sub-section ID */
  activeSectionId: string | null
  /** Callback when user clicks a tab or sub-tab */
  onNavigate: (sectionId: string) => void
  /** Whether prompt/idea brief is complete */
  promptStatus: NavStatus
  /** Callback to switch to prompt view */
  onSwitchToPrompt: () => void
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
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

function NavTab({
  item,
  status,
  isActive,
  activeSectionId,
  onNavigate,
}: {
  item: DocumentNavItem
  status: NavStatus
  isActive: boolean
  activeSectionId: string | null
  onNavigate: (id: string) => void
}) {
  const isDone = status === "done"
  const isInProgress = status === "in_progress"
  const isPending = status === "pending"

  // Bar color
  const barColor = isDone
    ? "bg-[#22C55E]"
    : isInProgress
      ? "bg-[#FF3B30]"
      : "bg-[#CCCCCC]"

  // Container styles — active (clicked) = black, hover = light gray
  const containerBg = isInProgress
    ? "bg-[#0A0A0A]"
    : isActive
      ? "bg-[#0A0A0A]"
      : "bg-white hover:bg-[#F0F0F0]"

  // Title color — white when active or in-progress (dark bg)
  const titleColor = isInProgress || isActive
    ? "text-white"
    : isPending
      ? "text-[#777777]"
      : "text-[#0A0A0A]"

  // Sub-tab color — white when active or in-progress (dark bg)
  const subColor = isInProgress || isActive
    ? "text-white/70"
    : isPending
      ? "text-[#999999]"
      : "text-[#777777]"

  // Connector line color — lighter on dark bg
  const connectorColor = isInProgress || isActive
    ? "border-white/20"
    : "border-[#E5E5E5]"

  return (
    <div className={cn("min-w-[168px] shrink-0 rounded-md p-2 transition-colors lg:min-w-0 lg:shrink", containerBg)}>
      {/* Tab title row */}
      <button
        type="button"
        onClick={() => onNavigate(item.key)}
        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className={cn("h-4 w-1 shrink-0 rounded-sm", barColor)} />
        <span className={cn("flex-1 text-left text-base font-bold", titleColor)}>
          {item.label}
        </span>
        {isDone && !isActive && (
          <div className="h-1.5 w-1.5 rounded-full bg-[#22C55E] opacity-45" />
        )}
        {isInProgress && (
          <SpinnerIcon className="text-[#FF3B30]" />
        )}
      </button>

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
              onClick={() => onNavigate(section.id)}
              className={cn(
                "block min-h-11 w-full cursor-pointer rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-[#F5F0EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isActiveSub
                  ? "font-semibold text-[#FF3B30]"
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

export function AnchorNav({
  documentStatuses,
  activeKey,
  activeSectionId,
  onNavigate,
  promptStatus,
  onSwitchToPrompt,
}: AnchorNavProps) {
  const getStatus = (item: DocumentNavItem): NavStatus => {
    return documentStatuses[item.sourceType] || "pending"
  }

  return (
    <nav className="flex w-full shrink-0 gap-2 overflow-x-auto border-b border-border-subtle bg-[#FAFAFA] px-4 py-3 lg:sticky lg:top-0 lg:h-[calc(100vh-64px)] lg:w-[300px] lg:flex-col lg:gap-2.5 lg:overflow-y-auto lg:border-b-0 lg:px-6 lg:py-5">
      {/* Prompt/Idea Brief tab */}
      <button
        type="button"
        onClick={onSwitchToPrompt}
        className={cn(
          "flex min-h-11 w-auto shrink-0 cursor-pointer items-center gap-2 rounded-md p-2 transition-colors lg:mb-2 lg:w-full",
          promptStatus === "done" ? "bg-[#F5F5F5]" : "bg-white",
          "hover:bg-[#F0F0F0]"
        )}
      >
        <div className={cn(
          "h-4 w-1 shrink-0 rounded-sm",
          promptStatus === "done" ? "bg-[#22C55E]" : "bg-[#CCCCCC]"
        )} />
        <span className={cn(
          "flex-1 text-left text-base font-bold",
          promptStatus === "done" ? "text-[#0A0A0A]" : "text-[#777777]"
        )}>
          Idea Brief
        </span>
        {promptStatus === "done" && (
          <div className="h-1.5 w-1.5 rounded-full bg-[#22C55E] opacity-45" />
        )}
      </button>
      <div className="hidden h-px bg-[#E5E5E5] mb-2 lg:block" />

      {/* Document tabs */}
      {SCROLLABLE_NAV_ITEMS.map((item) => (
        <NavTab
          key={item.key}
          item={item}
          status={getStatus(item)}
          isActive={activeKey === item.key}
          activeSectionId={activeSectionId}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}

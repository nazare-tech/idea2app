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

  // Container styles
  const containerBg = isInProgress
    ? "bg-[#0A0A0A]"
    : isActive && isDone
      ? "bg-[#F5F5F5]"
      : "bg-white"

  // Title color
  const titleColor = isInProgress
    ? "text-white"
    : isPending
      ? "text-[#777777]"
      : "text-[#0A0A0A]"

  // Sub-tab color
  const subColor = isInProgress
    ? "text-white"
    : isPending
      ? "text-[#999999]"
      : "text-[#777777]"

  return (
    <div className={cn("rounded-md p-2", containerBg)}>
      {/* Tab title row */}
      <button
        type="button"
        onClick={() => onNavigate(item.key)}
        className="flex w-full items-center gap-2"
      >
        <div className={cn("h-4 w-1 shrink-0 rounded-sm", barColor)} />
        <span className={cn("flex-1 text-left text-base font-bold", titleColor)}>
          {item.label}
        </span>
        {isDone && (
          <div className="h-1.5 w-1.5 rounded-full bg-[#22C55E] opacity-45" />
        )}
        {isInProgress && (
          <SpinnerIcon className="text-[#FF3B30]" />
        )}
      </button>

      {/* Sub-tabs */}
      <div className="mt-1 ml-[11px] border-l border-[#E5E5E5] pl-2">
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
                "block w-full text-left text-xs py-[1px]",
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
}: AnchorNavProps) {
  const getStatus = (item: DocumentNavItem): NavStatus => {
    return documentStatuses[item.sourceType] || "pending"
  }

  return (
    <nav className="sticky top-0 flex h-[calc(100vh-64px)] w-[300px] shrink-0 flex-col gap-2.5 overflow-y-auto bg-[#FAFAFA] px-6 py-5">
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

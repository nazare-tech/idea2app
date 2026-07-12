// src/components/layout/anchor-nav.tsx
"use client"

import { forwardRef, useCallback, useEffect, useRef, type MouseEvent, type MutableRefObject } from "react"
import { Play, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { SCROLLABLE_NAV_ITEMS, type DocumentNavItem } from "@/lib/document-sections"
import type { DocumentType } from "@/lib/document-definitions"
import type { DocumentGenerationDisplayState } from "@/lib/document-generation-display-status"
import {
  getDocumentAction,
  resolveNavStatus,
  StatusMarker,
  StatusText,
  type NavStatus,
} from "@/components/layout/nav-status"

interface AnchorNavProps {
  /** Navigation items after any document-pane visibility filtering */
  navItems?: DocumentNavItem[]
  /** Status per sourceType (e.g., { competitive: "done", prd: "pending" }) */
  documentStatuses: Record<string, NavStatus>
  /** Rich status per visible nav key (executive-summary, market-research, prd, etc.) */
  documentDisplayStates?: Record<string, DocumentGenerationDisplayState>
  /** Currently visible sub-section ID */
  activeSectionId: string | null
  /** Callback when user clicks a tab or sub-tab */
  onNavigate: (sectionId: string) => void
  /** Callback when user manually generates or retries a document module. */
  onGenerateDocument?: (docType: DocumentType) => void
}

/**
 * A single document tab with its sub-section links. Exported so the landing
 * page can render a live excerpt of the real workspace nav (FeatureNavPreview)
 * instead of a static screenshot.
 */
export function AnchorNavTab({
  item,
  status,
  activeSectionId,
  displayState,
  onNavigate,
  onGenerateDocument,
  expandSubTabs = false,
  onNavClick,
}: {
  item: DocumentNavItem
  status: NavStatus
  activeSectionId: string | null
  displayState?: DocumentGenerationDisplayState
  onNavigate: (id: string) => void
  onGenerateDocument?: (docType: DocumentType) => void
  /** Show sub-tabs at every viewport width (workspace hides them below lg) */
  expandSubTabs?: boolean
  /** Lets the rail suppress scroll-follow right after a click (workspace only) */
  onNavClick?: () => void
}) {
  const isInProgress = status === "in_progress"
  const isPending = status === "pending"
  const hasIssue = status === "needs_retry"
  const { showRetry: showRetryAction, actionLabel } = getDocumentAction(item, status, displayState)
  const ActionIcon = showRetryAction ? RotateCcw : Play

  const containerStyle = hasIssue
      ? "bg-[#FFF4F1]"
      : "bg-[#FFFFFE]"

  const titleColor = hasIssue
      ? "text-destructive"
    : isPending
      ? "text-[#8A8480]"
      : "text-[#1C1917]"

  const subColor = isPending
      ? "text-[#8A8480]"
      : "text-[#5D5551]"
  const connectorColor = "border-[#E5DCD4]"
  const handleNavClick = (event: MouseEvent<HTMLButtonElement>, targetId: string) => {
    onNavClick?.()
    const nav = event.currentTarget.closest("nav")
    const scrollTop = nav?.scrollTop ?? 0
    const scrollLeft = nav?.scrollLeft ?? 0

    onNavigate(targetId)

    if (!nav) return

    const restoreNavPosition = () => {
      nav.scrollTo({ top: scrollTop, left: scrollLeft, behavior: "auto" })
    }

    requestAnimationFrame(() => {
      restoreNavPosition()
      requestAnimationFrame(restoreNavPosition)
    })
    window.setTimeout(restoreNavPosition, 50)
    window.setTimeout(restoreNavPosition, 250)
    window.setTimeout(restoreNavPosition, 850)
  }

  return (
    <div className={cn("min-w-[168px] shrink-0 rounded-md p-2 transition-colors lg:min-w-0 lg:shrink", containerStyle)}>
      {/* Tab title row */}
      <div className="flex min-h-8 w-full items-center gap-2">
        <StatusMarker status={status} />
        <button
          type="button"
          data-nav-target={item.key}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => handleNavClick(event, item.key)}
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
              : "border-[#D8CEC5] bg-[#FFFFFE] text-[#5D5551] hover:border-primary/50 hover:text-primary",
          )}
        >
          <ActionIcon aria-hidden="true" className="h-3 w-3" />
          <span>{actionLabel}</span>
        </button>
        ) : (
          <span className={cn(
            "shrink-0 text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
            hasIssue ? "text-destructive" : "text-[#8A8480]",
          )}>
            <StatusText status={status} displayState={displayState} derived={item.derived} />
          </span>
        )}
      </div>

      {/* Sub-tabs */}
      <div className={cn("mt-1 ml-[11px] border-l pl-2", expandSubTabs ? "block" : "hidden lg:block", connectorColor)}>
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
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => handleNavClick(event, section.id)}
              aria-current={isActiveSub ? "location" : undefined}
              className={cn(
                "block w-full cursor-pointer rounded-sm px-2 py-1 text-left text-[13px] transition-[background-color,color] hover:bg-[#F5F0EB] hover:text-[#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0",
                isActiveSub
                  ? "bg-[#1C1917] font-semibold text-[#FAFAFA] hover:bg-[#1C1917] hover:text-[#FAFAFA]"
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
  navItems = SCROLLABLE_NAV_ITEMS,
  documentStatuses,
  documentDisplayStates = {},
  activeSectionId,
  onNavigate,
  onGenerateDocument,
}, ref) {
  const getStatus = (item: DocumentNavItem): NavStatus => resolveNavStatus(item, documentStatuses)

  const navRef = useRef<HTMLElement | null>(null)
  const setNavRef = useCallback((node: HTMLElement | null) => {
    navRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) (ref as MutableRefObject<HTMLElement | null>).current = node
  }, [ref])

  // Rail clicks already restore the rail's scroll position themselves; pause
  // scroll-follow briefly so the two mechanisms never fight over the rail.
  const suppressFollowUntilRef = useRef(0)
  const markNavClick = useCallback(() => {
    suppressFollowUntilRef.current = Date.now() + 1000
  }, [])

  // Keep the active subsection visible as the document pane scrolls: the rail
  // starts following two rows before the active row would touch either edge,
  // so it never sits against the header or the bottom of the viewport.
  useEffect(() => {
    if (!activeSectionId) return
    const nav = navRef.current
    if (!nav) return
    if (Date.now() < suppressFollowUntilRef.current) return

    let target = nav.querySelector<HTMLElement>(
      `[data-nav-target="${CSS.escape(activeSectionId)}"]`,
    )
    if (target && target.getBoundingClientRect().height === 0) {
      // Sub-tabs are hidden below lg; follow the owning document tab instead.
      const owner = navItems.find((item) =>
        item.sections.some((section) => section.id === activeSectionId),
      )
      target = owner
        ? nav.querySelector<HTMLElement>(`[data-nav-target="${CSS.escape(owner.key)}"]`)
        : null
    }
    if (!target) return

    const navRect = nav.getBoundingClientRect()
    const rect = target.getBoundingClientRect()
    if (rect.height === 0) return

    const marginY = rect.height * 2 + 8
    let top = 0
    if (rect.top < navRect.top + marginY) {
      top = rect.top - (navRect.top + marginY)
    } else if (rect.bottom > navRect.bottom - marginY) {
      top = rect.bottom - (navRect.bottom - marginY)
    }

    // Horizontal rail (small screens): keep the active tab a little clear of
    // the side edges too.
    const marginX = Math.min(rect.width, 48)
    let left = 0
    if (nav.scrollWidth > nav.clientWidth) {
      if (rect.left < navRect.left + marginX) {
        left = rect.left - (navRect.left + marginX)
      } else if (rect.right > navRect.right - marginX) {
        left = rect.right - (navRect.right - marginX)
      }
    }

    if (top === 0 && left === 0) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    nav.scrollBy({ top, left, behavior: reduceMotion ? "auto" : "smooth" })
  }, [activeSectionId, navItems])

  return (
    <nav
      ref={setNavRef}
      className="workspace-anchor-nav hidden w-full shrink-0 gap-2 overflow-x-auto border-b border-[#E2DDD6] bg-background px-4 py-3 lg:sticky lg:top-0 lg:flex lg:h-[calc(100vh-64px)] lg:w-[300px] lg:flex-col lg:gap-2.5 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-6 lg:py-5"
    >
      {/* Document tabs */}
      {navItems.map((item) => (
        <AnchorNavTab
          key={item.key}
          item={item}
          status={getStatus(item)}
          activeSectionId={activeSectionId}
          displayState={documentDisplayStates[item.key]}
          onNavigate={onNavigate}
          onGenerateDocument={onGenerateDocument}
          onNavClick={markNavClick}
        />
      ))}
    </nav>
  )
})

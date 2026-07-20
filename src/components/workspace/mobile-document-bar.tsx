// src/components/workspace/mobile-document-bar.tsx
// Mobile bottom chrome for the project workspace (below lg): a peeking bar
// naming the document in view, opening a bottom sheet that lists every
// document with its subsections and generation status. Replaces the desktop
// anchor rail on phones and portrait tablets.
"use client"

import { useCallback, useRef } from "react"
import { ChevronUp, Play, RotateCcw, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DocumentNavItem } from "@/lib/document-sections"
import type { DocumentType } from "@/lib/document-definitions"
import type { DocumentGenerationDisplayState } from "@/lib/document-generation-display-status"
import {
  getDocumentAction,
  resolveNavStatus,
  StatusMarker,
  StatusText,
  type NavStatus,
} from "@/components/layout/nav-status"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useSheetModalFocus } from "@/hooks/use-sheet-modal-focus"

interface MobileDocumentBarProps {
  navItems: DocumentNavItem[]
  documentStatuses: Record<string, NavStatus>
  documentDisplayStates: Record<string, DocumentGenerationDisplayState>
  activeItem: DocumentNavItem
  activeSectionId: string | null
  /** Chrome auto-hide state from useHideOnScrollChrome */
  hidden: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (sectionId: string) => void
  /** Generate/retry a document; mobile parity with the desktop rail action. */
  onGenerateDocument?: (docType: DocumentType) => void
}

export function MobileDocumentBar({
  navItems,
  documentStatuses,
  documentDisplayStates,
  activeItem,
  activeSectionId,
  hidden,
  open,
  onOpenChange,
  onNavigate,
  onGenerateDocument,
}: MobileDocumentBarProps) {
  const reduceMotion = useReducedMotion()
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const getStatus = (item: DocumentNavItem): NavStatus => resolveNavStatus(item, documentStatuses)

  const closeSheet = useCallback(() => onOpenChange(false), [onOpenChange])
  useSheetModalFocus(sheetRef, open, { onClose: closeSheet, initialFocusRef: closeButtonRef })

  const navigateAndClose = (targetId: string) => {
    onNavigate(targetId)
    onOpenChange(false)
  }

  return (
    <>
      {/* Peek bar: curved top like a resting bottom sheet */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 lg:hidden",
          !reduceMotion && "transition-transform duration-[280ms] ease-[var(--ease-out-expo)]",
          hidden && !open ? "translate-y-[120%]" : "translate-y-0",
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Open document list"
          aria-expanded={open}
          className="flex w-full items-center gap-2.5 rounded-t-2xl border border-b-0 border-border bg-card px-[18px] pt-[15px] pb-[max(0.875rem,env(safe-area-inset-bottom))] text-left shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
        >
          <StatusMarker status={getStatus(activeItem)} />
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
            {activeItem.label}
          </span>
          <ChevronUp aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
        </button>
      </div>

      {/* Documents bottom sheet */}
      {open && (
        <div className="absolute inset-0 z-40 lg:hidden">
          <style>{`
            @keyframes mobileSheetFade{from{opacity:0}to{opacity:1}}
          `}</style>
          <div
            aria-hidden="true"
            onClick={() => onOpenChange(false)}
            className="workspace-sheet-overlay"
            style={reduceMotion ? undefined : { animation: "mobileSheetFade .2s ease" }}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Project documents"
            className={cn(
              "absolute inset-x-0 bottom-0 flex h-[var(--workspace-document-sheet-height)] flex-col rounded-t-2xl bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.12)]",
            )}
            style={reduceMotion ? undefined : { animation: "workspace-sheet-up .3s var(--ease-out-expo)" }}
          >
            <div className="flex shrink-0 items-center gap-2 py-2 pl-[18px] pr-2">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-text-secondary">
                Project documents
              </span>
              <div className="flex-1" />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close document list"
                className="flex h-10 w-10 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
              {navItems.map((item) => {
                const status = getStatus(item)
                const isActiveDoc = activeItem.key === item.key
                const displayState = documentDisplayStates[item.key]
                const { showRetry, actionLabel } = getDocumentAction(item, status, displayState)
                const ActionIcon = showRetry ? RotateCcw : Play
                return (
                  <div key={item.key} className="mb-0.5">
                    <div
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md border px-2.5 transition-colors",
                        isActiveDoc
                          ? "border-primary/30 bg-primary/[0.08]"
                          : "border-transparent hover:bg-secondary",
                      )}
                    >
                      <StatusMarker status={status} />
                      <button
                        type="button"
                        onClick={() => navigateAndClose(item.key)}
                        aria-current={isActiveDoc && !activeSectionId ? "location" : undefined}
                        className={cn(
                          "min-w-0 flex-1 truncate py-3 text-left text-[15px] text-foreground",
                          isActiveDoc ? "font-bold" : "font-medium",
                        )}
                      >
                        {item.label}
                      </button>
                      {actionLabel && onGenerateDocument ? (
                        <button
                          type="button"
                          onClick={() => onGenerateDocument(item.sourceType)}
                          className={cn(
                            "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-sm border px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] transition-colors",
                            showRetry
                              ? "border-destructive bg-destructive text-primary-foreground"
                              : "border-[#D8CEC5] bg-card text-[#5D5551]",
                          )}
                        >
                          <ActionIcon aria-hidden="true" className="h-3 w-3" />
                          <span>{actionLabel}</span>
                        </button>
                      ) : (
                        <span
                          className={cn(
                            "shrink-0 text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
                            status === "needs_retry" ? "text-destructive" : "text-[#8A8480]",
                          )}
                        >
                          <StatusText
                            status={status}
                            displayState={displayState}
                            derived={item.derived}
                          />
                        </span>
                      )}
                    </div>

                    {item.sections.length > 0 && (
                      <div className="mb-1 ml-[15px] border-l border-[#E5DCD4] pl-2">
                        {item.sections.map((section) => {
                          const isActiveSub = activeSectionId === section.id
                          return (
                            <button
                              key={section.id}
                              type="button"
                              onClick={() => navigateAndClose(section.id)}
                              aria-current={isActiveSub ? "location" : undefined}
                              className={cn(
                                "block w-full rounded-sm px-2.5 py-[7px] text-left text-[13.5px] transition-colors",
                                isActiveSub
                                  ? "bg-[#1C1917] font-semibold text-[#FAFAFA]"
                                  : "text-[#5D5551] hover:bg-[#F5F0EB] hover:text-[#1C1917]",
                              )}
                            >
                              {section.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

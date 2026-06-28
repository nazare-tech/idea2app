"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { DocumentType } from "@/lib/document-definitions"
import { SCROLLABLE_NAV_ITEMS } from "@/lib/document-sections"
import {
  chooseActiveScrollCandidate,
  type ScrollSyncCandidate,
} from "@/lib/workspace-scroll-sync"

const SCROLL_SYNC_HYSTERESIS_PX = 32

function getSourceTypeForScrollTarget(targetId: string): DocumentType | null {
  const navItem = SCROLLABLE_NAV_ITEMS.find(
    (item) => item.key === targetId || item.sections.some((section) => section.id === targetId),
  )

  return navItem?.sourceType ?? null
}

function isScrollableSubsectionId(targetId: string) {
  return SCROLLABLE_NAV_ITEMS.some((item) =>
    item.sections.some((section) => section.id === targetId),
  )
}

function areStringSetsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  if (left.size !== right.size) return false

  for (const value of left) {
    if (!right.has(value)) return false
  }

  return true
}

export function useWorkspaceScrollSync({
  activeDocument,
  setActiveDocument,
  loadWorkspaceDocuments,
}: {
  activeDocument: DocumentType
  setActiveDocument: (docType: DocumentType) => void
  loadWorkspaceDocuments: (docTypes: DocumentType[], options?: { force?: boolean }) => Promise<void>
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const activeSectionIdRef = useRef<string | null>(null)
  const [renderedSectionIds, setRenderedSectionIds] = useState<ReadonlySet<string>>(() => new Set())
  const isScrollingProgrammatically = useRef(false)

  useEffect(() => {
    activeSectionIdRef.current = activeSectionId
  }, [activeSectionId])

  useEffect(() => {
    if (activeDocument === "prompt") return

    const container = scrollContainerRef.current
    if (!container) return

    let frameId: number | null = null

    const collectCandidates = (): ScrollSyncCandidate[] => {
      const candidates: ScrollSyncCandidate[] = []

      for (const item of SCROLLABLE_NAV_ITEMS) {
        for (const section of item.sections) {
          const element = container.querySelector<HTMLElement>(`#${CSS.escape(section.id)}`)
          if (!element) continue
          candidates.push({
            id: section.id,
            top: element.getBoundingClientRect().top,
          })
        }
      }

      return candidates
    }

    const updateActiveScrollTarget = () => {
      if (isScrollingProgrammatically.current) return

      const containerRect = container.getBoundingClientRect()
      const markerTop = containerRect.top + container.clientHeight * 0.22
      const activeCandidate = chooseActiveScrollCandidate(collectCandidates(), markerTop, {
        currentId: activeSectionIdRef.current,
        hysteresisPx: SCROLL_SYNC_HYSTERESIS_PX,
      })
      if (!activeCandidate) return

      const nextSectionId = isScrollableSubsectionId(activeCandidate.id) ? activeCandidate.id : null
      setActiveSectionId((current) => {
        activeSectionIdRef.current = nextSectionId
        return current === nextSectionId ? current : nextSectionId
      })

      const currentHash = decodeURIComponent(window.location.hash.replace(/^#/, ""))
      if (currentHash !== activeCandidate.id) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}#${activeCandidate.id}`,
        )
      }
    }

    const scheduleUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        updateActiveScrollTarget()
      })
    }

    scheduleUpdate()
    container.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
      container.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [activeDocument])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const navSectionIds = SCROLLABLE_NAV_ITEMS.flatMap((item) =>
      item.sections.map((section) => section.id),
    )

    const collectRenderedSectionIds = () => {
      const nextRenderedIds = new Set<string>()

      for (const sectionId of navSectionIds) {
        if (container.querySelector<HTMLElement>(`#${CSS.escape(sectionId)}`)) {
          nextRenderedIds.add(sectionId)
        }
      }

      setRenderedSectionIds((current) =>
        areStringSetsEqual(current, nextRenderedIds) ? current : nextRenderedIds,
      )
    }

    collectRenderedSectionIds()

    const observer = new MutationObserver(collectRenderedSectionIds)
    observer.observe(container, {
      attributes: true,
      attributeFilter: ["id"],
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!activeSectionId || renderedSectionIds.has(activeSectionId)) return
    const timeoutId = window.setTimeout(() => {
      setActiveSectionId(null)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [activeSectionId, renderedSectionIds])

  const handleScrollNavigate = useCallback((targetId: string) => {
    const container = scrollContainerRef.current
    if (!container) return

    const target = container.querySelector(`#${CSS.escape(targetId)}`)
      || container.querySelector(`[data-section="${targetId}"]`)
    if (!target) return

    const sourceType = getSourceTypeForScrollTarget(targetId)
    if (sourceType) {
      setActiveDocument(sourceType)
      void loadWorkspaceDocuments([sourceType])
    }

    isScrollingProgrammatically.current = true
    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const containerStyle = window.getComputedStyle(container)
    const scrollPaddingTop = parseFloat(containerStyle.scrollPaddingTop) || parseFloat(containerStyle.paddingTop) || 0
    container.scrollTo({
      top: Math.max(0, container.scrollTop + targetRect.top - containerRect.top - scrollPaddingTop),
      behavior: "auto",
    })

    if (isScrollableSubsectionId(targetId)) {
      setActiveSectionId(targetId)
    } else {
      setActiveSectionId(null)
    }

    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${targetId}`)

    setTimeout(() => {
      isScrollingProgrammatically.current = false
    }, 50)
  }, [loadWorkspaceDocuments, setActiveDocument])

  return {
    scrollContainerRef,
    activeSectionId,
    renderedSectionIds,
    handleScrollNavigate,
  }
}

export { getSourceTypeForScrollTarget }

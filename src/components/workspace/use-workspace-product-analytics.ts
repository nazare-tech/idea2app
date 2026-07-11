"use client"

import { useCallback, useEffect, useRef } from "react"

import type { ProductEventPropertyMap } from "@/lib/product-analytics/contracts"
import {
  createProductAnalyticsSessionId,
  flushProductEvents,
  trackClientProductEvent,
} from "@/lib/product-analytics/client"
import { getAllSectionIds } from "@/lib/document-sections"

const SECTION_REACH_DELAY_MS = 1_000
const SECTION_ORDER = new Map(getAllSectionIds().map((sectionId, index) => [sectionId, index]))
type ContentState = ProductEventPropertyMap["workspace_section_reached"]["contentState"]

export function useWorkspaceProductAnalytics({
  projectId,
  activeSectionId,
  activeContentState,
}: {
  projectId: string
  activeSectionId: string | null
  activeContentState: ContentState
}) {
  const sessionIdRef = useRef(createProductAnalyticsSessionId())
  const entrySectionRef = useRef(getInitialSectionId())
  const reachedRef = useRef(new Set<string>())
  const impressedMockupsRef = useRef(new Set<number>())
  const lastSectionRef = useRef(getInitialSectionId())
  const deepestSectionRef = useRef(getInitialSectionId())
  const pendingNavTargetRef = useRef<string | null>(null)
  const sessionEndedRef = useRef(false)
  const activeSinceRef = useRef<number | null>(null)
  const activeDurationRef = useRef(0)
  const unmountTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (unmountTimerRef.current !== null) {
      window.clearTimeout(unmountTimerRef.current)
      unmountTimerRef.current = null
    }
    activeSinceRef.current = document.visibilityState === "visible" ? Date.now() : null
    trackClientProductEvent("workspace_session_started", {
      entrySectionId: entrySectionRef.current,
      viewportClass: getViewportClass(),
    }, { projectId, sessionId: sessionIdRef.current })

    const handleVisibility = () => {
      const now = Date.now()
      if (document.visibilityState === "visible") {
        activeSinceRef.current = now
      } else if (activeSinceRef.current !== null) {
        activeDurationRef.current += now - activeSinceRef.current
        activeSinceRef.current = null
      }
    }
    const handlePageHide = () => {
      if (sessionEndedRef.current) return
      sessionEndedRef.current = true
      const now = Date.now()
      const activeDurationMs = Math.min(
        24 * 60 * 60 * 1000,
        activeDurationRef.current + (activeSinceRef.current === null ? 0 : now - activeSinceRef.current),
      )
      trackClientProductEvent("workspace_session_ended", {
        activeDurationMs: Math.max(0, Math.round(activeDurationMs)),
        deepestSectionId: deepestSectionRef.current,
        lastSectionId: lastSectionRef.current,
        reachedSectionCount: Math.max(1, reachedRef.current.size),
      }, { projectId, sessionId: sessionIdRef.current })
      void flushProductEvents(true)
    }

    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("pagehide", handlePageHide)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("pagehide", handlePageHide)
      unmountTimerRef.current = window.setTimeout(handlePageHide, 0)
    }
  }, [projectId])

  useEffect(() => {
    if (!activeSectionId) return
    const timerId = window.setTimeout(() => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      lastSectionRef.current = activeSectionId
      const alreadyReached = reachedRef.current.has(activeSectionId)
      const navigationMethod = pendingNavTargetRef.current === activeSectionId
        ? "nav"
        : reachedRef.current.size === 0
          ? "initial"
          : "scroll"
      pendingNavTargetRef.current = null
      if (!alreadyReached) {
        reachedRef.current.add(activeSectionId)
        if ((SECTION_ORDER.get(activeSectionId) ?? -1) > (SECTION_ORDER.get(deepestSectionRef.current) ?? -1)) {
          deepestSectionRef.current = activeSectionId
        }
        trackClientProductEvent("workspace_section_reached", {
          sectionId: activeSectionId,
          navigationMethod,
          contentState: activeContentState,
        }, { projectId, sessionId: sessionIdRef.current })
      }

      const conceptIndex = getMockupConceptIndex(activeSectionId)
      if (
        conceptIndex &&
        activeContentState === "ready" &&
        !impressedMockupsRef.current.has(conceptIndex)
      ) {
        impressedMockupsRef.current.add(conceptIndex)
        trackClientProductEvent("mockup_concept_impression", {
          conceptIndex,
          contentState: activeContentState,
        }, { projectId, sessionId: sessionIdRef.current })
      }
    }, SECTION_REACH_DELAY_MS)

    return () => window.clearTimeout(timerId)
  }, [activeContentState, activeSectionId, projectId])

  return useCallback((targetSectionId: string) => {
    pendingNavTargetRef.current = targetSectionId
    trackClientProductEvent("workspace_nav_clicked", {
      ...(activeSectionId ? { fromSectionId: activeSectionId } : {}),
      targetSectionId,
    }, { projectId, sessionId: sessionIdRef.current })
  }, [activeSectionId, projectId])
}

function getInitialSectionId() {
  if (typeof window !== "undefined") {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""))
    if (SECTION_ORDER.has(hash)) return hash
  }
  return "executive-summary"
}

function getViewportClass(): ProductEventPropertyMap["workspace_session_started"]["viewportClass"] {
  if (window.innerWidth < 768) return "mobile"
  if (window.innerWidth < 1024) return "tablet"
  return "desktop"
}

function getMockupConceptIndex(sectionId: string): 1 | 2 | 3 | null {
  const match = sectionId.match(/^mockups-concept-([123])$/)
  return match ? Number(match[1]) as 1 | 2 | 3 : null
}

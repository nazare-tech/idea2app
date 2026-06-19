"use client"

import { useCallback, useEffect, useState } from "react"

import { DOCUMENT_TYPES, type DocumentType } from "@/lib/document-definitions"

export function usePersistedGenerationState({
  projectId,
  getInitialCount,
}: {
  projectId: string
  getInitialCount: (docType: DocumentType) => number
}) {
  const [generatingDocuments, setGeneratingDocuments] = useState<Record<DocumentType, boolean>>({
    ...Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, false])),
  } as Record<DocumentType, boolean>)

  const getStorageKey = useCallback(
    (docType: DocumentType) => `generating_${projectId}_${docType}`,
    [projectId],
  )

  const saveGeneratingState = useCallback((docType: DocumentType, isGenerating: boolean) => {
    const key = getStorageKey(docType)
    if (isGenerating) {
      localStorage.setItem(key, JSON.stringify({
        timestamp: Date.now(),
        projectId,
        initialCount: getInitialCount(docType),
      }))
    } else {
      localStorage.removeItem(key)
    }
  }, [getInitialCount, getStorageKey, projectId])

  const loadGeneratingState = useCallback((docType: DocumentType): boolean => {
    const key = getStorageKey(docType)
    const stored = localStorage.getItem(key)
    if (!stored) return false

    try {
      const { timestamp } = JSON.parse(stored)
      // Mockups can run as three separate long image calls, so keep local
      // generation state long enough for the full sequence.
      if (Date.now() - timestamp > 1200000) {
        localStorage.removeItem(key)
        return false
      }
      return true
    } catch {
      localStorage.removeItem(key)
      return false
    }
  }, [getStorageKey])

  const hydrateGeneratingStateFromStorage = useCallback((): Record<DocumentType, boolean> => {
    if (typeof window === "undefined") {
      return {
        prompt: false,
        competitive: false,
        prd: false,
        mvp: false,
        mockups: false,
        techspec: false,
        deploy: false,
      }
    }

    return {
      prompt: false,
      competitive: loadGeneratingState("competitive"),
      prd: loadGeneratingState("prd"),
      mvp: loadGeneratingState("mvp"),
      mockups: loadGeneratingState("mockups"),
      techspec: loadGeneratingState("techspec"),
      deploy: loadGeneratingState("deploy"),
    }
  }, [loadGeneratingState])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setGeneratingDocuments(hydrateGeneratingStateFromStorage())
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [hydrateGeneratingStateFromStorage, projectId])

  const checkIfContentIncreased = useCallback((docType: DocumentType, remoteCount?: number): boolean => {
    const key = getStorageKey(docType)
    const stored = localStorage.getItem(key)
    if (!stored) return false

    try {
      const { initialCount } = JSON.parse(stored)
      const currentCount = remoteCount ?? getInitialCount(docType)
      return currentCount > initialCount
    } catch {
      return false
    }
  }, [getInitialCount, getStorageKey])

  return {
    generatingDocuments,
    setGeneratingDocuments,
    saveGeneratingState,
    loadGeneratingState,
    checkIfContentIncreased,
  }
}

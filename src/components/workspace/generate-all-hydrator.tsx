"use client"

import { useEffect, useRef } from "react"
import { getGenerateAllStore, type GenerateDocumentFn, type GetDocumentStatusFn } from "@/stores/generate-all-store"

interface GenerateAllHydratorProps {
  projectId: string
  generateDocument: GenerateDocumentFn
  getDocumentStatus: GetDocumentStatusFn
}

/**
 * Thin bridge component that:
 * 1. Keeps the store's callback refs fresh on every render (so the async
 *    generation loop always has up-to-date functions).
 * 2. Syncs the idle queue when document statuses change.
 * 3. Runs DB hydration once per project to restore any in-progress state.
 *
 * Renders nothing. The store itself is held in a module-level Map and is NOT
 * destroyed when this component unmounts — enabling same-tab project switching
 * with state preserved.
 */
export function GenerateAllHydrator({
  projectId,
  generateDocument,
  getDocumentStatus,
}: GenerateAllHydratorProps) {
  // Keep fresh refs so the effect closure doesn't go stale
  const genDocRef = useRef(generateDocument)
  genDocRef.current = generateDocument
  const getStatusRef = useRef(getDocumentStatus)
  getStatusRef.current = getDocumentStatus

  // Every render: push fresh callbacks to the store and sync the idle queue.
  // Using no deps array mirrors the original context's behaviour (getDocumentStatus
  // is an unstable function ref recreated on each workspace render, so the
  // original queue-rebuild effect ran on every render too).
  useEffect(() => {
    getGenerateAllStore(projectId)
      .getState()
      ._updateCallbacks(genDocRef.current, getStatusRef.current)
  })

  // One-time hydration per project: restore state from the previous session.
  useEffect(() => {
    getGenerateAllStore(projectId).getState().hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  return null
}

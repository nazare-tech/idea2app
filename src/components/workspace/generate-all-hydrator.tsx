"use client"

import { useEffect } from "react"
import { getGenerateAllStore, type OnStepCompleteFn } from "@/stores/generate-all-store"
import type { DocumentType } from "@/lib/document-definitions"

interface GenerateAllHydratorProps {
  projectId: string
  /** Called whenever a generation step completes — typically `router.refresh()` */
  onStepComplete: OnStepCompleteFn
  /** Live document status reader from the workspace */
  getDocumentStatus: (type: DocumentType) => "done" | "in_progress" | "pending"
}

/**
 * Thin bridge component that:
 * 1. Keeps the store's callback refs fresh on every render.
 * 2. Syncs the idle queue when document statuses change.
 * 3. Runs DB hydration once per project to restore any in-progress state.
 *
 * Renders nothing. The store itself is held in a module-level Map and is NOT
 * destroyed when this component unmounts — enabling same-tab project switching
 * with state preserved.
 */
export function GenerateAllHydrator({
  projectId,
  onStepComplete,
  getDocumentStatus,
}: GenerateAllHydratorProps) {
  // Every render: push fresh callbacks to the store and sync the idle queue.
  useEffect(() => {
    getGenerateAllStore(projectId)
      .getState()
      ._updateCallbacks(
        onStepComplete,
        getDocumentStatus,
      )
  })

  // One-time hydration per project: restore state from the previous session.
  useEffect(() => {
    getGenerateAllStore(projectId).getState().hydrate()
  }, [projectId])

  return null
}

"use client"

import { createStore, useStore, type StoreApi } from "zustand"
import {
  GENERATE_ALL_QUEUE_ORDER,
  GENERATE_ALL_DEFAULT_MODELS,
  type DocumentType,
} from "@/lib/document-definitions"
import {
  estimateGenerateAllCost,
} from "@/lib/token-economics"
import {
  buildQueue,
  LOCAL_STORAGE_KEY,
  type QueueItem,
  type QueueItemStatus,
} from "@/lib/generation/generate-all-helpers"
import { createVisibilityAwarePoller } from "@/lib/visibility-aware-poller"

// Re-export types so consumers keep working
export type { QueueItem, QueueItemStatus }
export type GenerateAllStatus =
  | "idle"
  | "loading"
  | "running"
  | "partial"
  | "completed"
  | "cancelled"
  | "error"
  | "interrupted"

// ---------------------------------------------------------------------------
// Callback types
// ---------------------------------------------------------------------------

/**
 * Called whenever one or more steps transition to a content-ready state so the
 * workspace can reload those saved documents into client state.
 */
export type OnStepCompleteFn = (completedDocTypes: DocumentType[]) => void

/**
 * Signature for the individual-document generation function that lives in the
 * workspace. Still used by individual tab "Generate" buttons — not by Generate All.
 */
export interface GenerateDocumentFn {
  (
    docType: DocumentType,
    model: string,
    options?: {
      signal?: AbortSignal
    },
  ): Promise<boolean>
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface GenerateAllState {
  status: GenerateAllStatus
  queue: QueueItem[]
  currentIndex: number
  totalCredits: number
  creditsUsed: number
  startedAt: Date | null
  error: string | null
  /**
   * Partial Market Research markdown streamed by the onboarding executor
   * while the competitive item is generating; null once it settles. The
   * workspace renders it as a live document preview.
   */
  streamingPreviewContent: string | null
}

interface GenerateAllActions {
  /**
   * Called by GenerateAllHydrator on every render to keep the onStepComplete
   * callback fresh, and to sync the idle queue when document statuses change.
   */
  _updateCallbacks: (
    onStepComplete: OnStepCompleteFn,
    getDocStatus: (type: DocumentType) => "done" | "in_progress" | "pending",
  ) => void
  /** One-time DB fetch to restore state from a previous session. */
  hydrate: () => Promise<void>
  startGenerateAll: () => Promise<void>
  cancelGenerateAll: () => Promise<void>
}

type GenerateAllStore = GenerateAllState & GenerateAllActions

type StoreAPI = StoreApi<GenerateAllStore>

// ---------------------------------------------------------------------------
// Module-level store map — persists across React renders and route navigation
// ---------------------------------------------------------------------------

const projectStores = new Map<string, StoreAPI>()

const INITIAL_GENERATE_ALL_POLL_DELAY_MS = 3000
const MID_GENERATE_ALL_POLL_DELAY_MS = 6000
const LONG_GENERATE_ALL_POLL_DELAY_MS = 10000
const MID_GENERATE_ALL_POLL_AFTER_MS = 2 * 60 * 1000
const LONG_GENERATE_ALL_POLL_AFTER_MS = 8 * 60 * 1000

export function getGenerateAllPollDelayMs(startedAtMs: number | null, nowMs = Date.now()) {
  if (!startedAtMs) return INITIAL_GENERATE_ALL_POLL_DELAY_MS

  const elapsedMs = Math.max(0, nowMs - startedAtMs)
  if (elapsedMs >= LONG_GENERATE_ALL_POLL_AFTER_MS) return LONG_GENERATE_ALL_POLL_DELAY_MS
  if (elapsedMs >= MID_GENERATE_ALL_POLL_AFTER_MS) return MID_GENERATE_ALL_POLL_DELAY_MS
  return INITIAL_GENERATE_ALL_POLL_DELAY_MS
}

export function getGenerateAllStore(projectId: string): StoreAPI {
  if (!projectStores.has(projectId)) {
    projectStores.set(projectId, createGenerateAllStore(projectId))
  }
  return projectStores.get(projectId)!
}

export function useGenerateAll<T>(
  projectId: string,
  selector: (state: GenerateAllStore) => T,
): T {
  return useStore(getGenerateAllStore(projectId), selector)
}

export function useGenerateAllStore(projectId: string): GenerateAllStore {
  return useStore(getGenerateAllStore(projectId))
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

function createGenerateAllStore(projectId: string): StoreApi<GenerateAllStore> {
  // Always-fresh callback refs — updated by GenerateAllHydrator each render
  const onStepCompleteRef = { current: null as OnStepCompleteFn | null }
  const getDocStatusRef = { current: null as ((type: DocumentType) => "done" | "in_progress" | "pending") | null }

  // Polling state. The scheduling mechanics (timer, hidden-tab suppression,
  // immediate poll on refocus) live in the shared poller; this store only
  // decides the cadence and when the loop starts/stops.
  const pollStartedAtRef = { current: null as number | null }
  const prevQueueRef = { current: null as QueueItem[] | null }
  const executeRetryCountRef = { current: 0 }

  const poller = createVisibilityAwarePoller({
    poll: () => void doPoll(),
    getDelayMs: () => getGenerateAllPollDelayMs(pollStartedAtRef.current),
    shouldPollOnVisible: () => store.getState().status === "running",
  })

  function kickOffExecute() {
    return fetch("/api/generate-all/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    }).catch((err) => {
      console.error("[GenerateAll] Execute request failed:", err)
    })
  }

  async function doPoll() {
    try {
      const res = await fetch(`/api/generate-all/status?projectId=${projectId}`)
      if (!res.ok) {
        poller.schedule()
        return
      }
      const { queue: dbRow, streamingPreview } = await res.json()
      if (!dbRow) {
        poller.schedule()
        return
      }

      const prevQueue = prevQueueRef.current ?? store.getState().queue
      const incomingQueue: QueueItem[] = dbRow.queue ?? []
      if (dbRow.started_at) {
        pollStartedAtRef.current = new Date(dbRow.started_at).getTime()
      }

      // Detect newly-completed steps and notify the workspace to refresh the
      // exact document collections that should now have saved content.
      const prevByDocType = new Map(prevQueue.map((item) => [item.docType, item]))
      const newlyCompletedDocTypes = incomingQueue
        .filter((item) => {
          const prev = prevByDocType.get(item.docType)
          const isContentReady = item.status === "done" || item.status === "skipped"
          const wasContentReady = prev?.status === "done" || prev?.status === "skipped"
          return isContentReady && !wasContentReady
        })
        .map((item) => item.docType)

      if (newlyCompletedDocTypes.length > 0) {
        onStepCompleteRef.current?.(newlyCompletedDocTypes)
      }

      prevQueueRef.current = incomingQueue

      const newStatus = dbRow.status as GenerateAllStatus

      // Streaming preview: keep the longest content seen so a throttle gap
      // or out-of-order poll response never rewinds the reveal. Deliberately
      // retained after the item completes: the workspace keeps showing it
      // until the saved document loads (router.refresh), avoiding a flash of
      // the static status module between stream end and document swap.
      const incomingPreview =
        typeof streamingPreview?.content === "string" && streamingPreview.content.length > 0
          ? (streamingPreview.content as string)
          : null
      const previousPreview = store.getState().streamingPreviewContent
      const nextPreview =
        incomingPreview && (!previousPreview || incomingPreview.length >= previousPreview.length)
          ? incomingPreview
          : previousPreview

      store.setState({
        queue: incomingQueue,
        currentIndex: dbRow.current_index ?? 0,
        status: newStatus,
        error: dbRow.error_info?.message ?? null,
        streamingPreviewContent: nextPreview,
      })

      // Continue polling only while running
      if (newStatus === "running") {
        const hasPendingWork = incomingQueue.some((item) => item.status === "pending")
        const hasGeneratingWork = incomingQueue.some((item) => item.status === "generating")
        if ((dbRow.needs_execute || hasPendingWork) && !hasGeneratingWork && executeRetryCountRef.current < 3) {
          executeRetryCountRef.current += 1
          void kickOffExecute()
        }
        poller.schedule()
      } else {
        poller.stop()
        localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
      }
    } catch {
      // Network hiccup — retry
      poller.schedule()
    }
  }

  const store = createStore<GenerateAllStore>()((set, get) => ({
    // Initial state
    status: "idle",
    queue: [],
    currentIndex: 0,
    totalCredits: 0,
    creditsUsed: 0,
    startedAt: null,
    error: null,
    streamingPreviewContent: null,

    // Update always-fresh callback refs (called by Hydrator on every render).
    // Also rebuilds the idle queue and totalCredits when doc statuses change.
    _updateCallbacks: (onStepComplete, getDocStatus) => {
      onStepCompleteRef.current = onStepComplete
      getDocStatusRef.current = getDocStatus

      // Only sync state when idle — no-op during generation
      if (get().status !== "idle") return

      const newQueue = buildQueue(GENERATE_ALL_DEFAULT_MODELS, getDocStatus)
      const skipTypes = new Set<string>(
        GENERATE_ALL_QUEUE_ORDER.filter(
          (dt) => getDocStatus(dt as DocumentType) === "done",
        ),
      )
      const newTotal = estimateGenerateAllCost(GENERATE_ALL_DEFAULT_MODELS, skipTypes)
      const current = get()
      if (current.totalCredits === newTotal && areQueueItemsEqual(current.queue, newQueue)) {
        return
      }
      set(() => ({ queue: newQueue, totalCredits: newTotal }))
    },

    hydrate: async () => {
      const flag =
        typeof window !== "undefined"
          ? localStorage.getItem(LOCAL_STORAGE_KEY(projectId))
          : null

      if (flag === "true") set(() => ({ status: "loading" }))

      try {
        const res = await fetch(`/api/generate-all/status?projectId=${projectId}`)
        if (!res.ok) return
        const { queue: dbRow, streamingPreview } = await res.json()

        if (!dbRow) {
          if (flag === "true") {
            localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
            set(() => ({ status: "idle" }))
          }
          return
        }

        // Auto-cancel stale running queues (>30 min old)
        if (dbRow.status === "running") {
          pollStartedAtRef.current = dbRow.started_at
            ? new Date(dbRow.started_at).getTime()
            : Date.now()

          const startedMs = pollStartedAtRef.current
          const thirtyMin = 30 * 60 * 1000
          if (Date.now() - startedMs > thirtyMin) {
            await fetch("/api/generate-all/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectId }),
            })
            localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
            set(() => ({ status: "idle" }))
            return
          }
        }

        // Restore terminal states
        if (
          dbRow.status === "completed" ||
          dbRow.status === "partial" ||
          dbRow.status === "cancelled" ||
          dbRow.status === "error"
        ) {
          set(() => ({
            queue: dbRow.queue,
            currentIndex: dbRow.current_index,
            startedAt: dbRow.started_at ? new Date(dbRow.started_at) : null,
            status: dbRow.status as GenerateAllStatus,
            error: dbRow.error_info?.message ?? null,
          }))
          localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
          return
        }

        // Resume running queue
        if (dbRow.status === "running") {
          const getStatus = getDocStatusRef.current
          const hydratedQueue: QueueItem[] = (dbRow.queue as QueueItem[]).map((item) => {
            if (item.status === "pending" || item.status === "generating") {
              const currentStatus = getStatus?.(item.docType)
              if (currentStatus === "done") {
                return { ...item, status: "done" as const }
              }
              return item.status === "generating"
                ? item
                : { ...item, status: "pending" as const }
            }
            return item
          })

          const nextPending = hydratedQueue.findIndex((item) => item.status === "pending")

          if (nextPending === -1) {
            set(() => ({
              queue: hydratedQueue,
              currentIndex: hydratedQueue.length,
              startedAt: dbRow.started_at ? new Date(dbRow.started_at) : null,
              status: "completed",
            }))
            await fetch("/api/generate-all/update", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projectId,
                queue: hydratedQueue,
                current_index: hydratedQueue.length,
                status: "completed",
                completed_at: new Date().toISOString(),
              }),
            })
            localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
          } else {
            // The execute route is still running on the server — resume polling
            set(() => ({
              queue: hydratedQueue,
              currentIndex: nextPending,
              startedAt: dbRow.started_at ? new Date(dbRow.started_at) : null,
              status: "running",
              streamingPreviewContent:
                typeof streamingPreview?.content === "string" && streamingPreview.content.length > 0
                  ? (streamingPreview.content as string)
                  : null,
            }))
            localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
            if (!hydratedQueue.some((item) => item.status === "generating")) {
              void kickOffExecute()
            }
            poller.schedule()
          }
        }
      } catch (err) {
        console.error("Failed to hydrate Generate All state:", err)
        localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
        set(() => ({ status: "idle" }))
      }
    },

    startGenerateAll: async () => {
      if (get().status === "running") return

      const freshQueue = buildQueue(
        GENERATE_ALL_DEFAULT_MODELS,
        getDocStatusRef.current ?? (() => "pending" as const),
      )

      const currentStatus = get().status
      const pendingItems = freshQueue.filter((item) => item.status === "pending")
      const shouldReconcileTerminalQueue =
        currentStatus === "partial" ||
        currentStatus === "error" ||
        currentStatus === "interrupted"
      if (pendingItems.length === 0 && !shouldReconcileTerminalQueue) return

      set(() => ({
        queue: freshQueue,
        currentIndex: 0,
        creditsUsed: 0,
        error: null,
        startedAt: new Date(),
        status: "running",
      }))

      localStorage.setItem(LOCAL_STORAGE_KEY(projectId), "true")
      executeRetryCountRef.current = 0
      pollStartedAtRef.current = Date.now()

      // Persist queue to DB before kicking off server-side execution. If this
      // fails, do not run /execute against a stale or unrelated existing queue.
      try {
        const startResponse = await fetch("/api/generate-all/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            queue: freshQueue,
          }),
        })

        const startData = await startResponse.json().catch(() => null)
        if (!startResponse.ok) {
          throw new Error(startData?.error || "Failed to start generation")
        }
      } catch (err) {
        console.error("[GenerateAll] Failed to persist queue start:", err)
        localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
        set(() => ({
          status: "error",
          error: err instanceof Error ? err.message : "Failed to start generation",
        }))
        return
      }

      // Fire-and-forget: kick off server-side execution
      // The server runs for up to 540s even if the user closes the tab.
      void kickOffExecute()

      // Start polling to reflect server-side progress in the UI
      prevQueueRef.current = freshQueue
      poller.schedule()
    },

    cancelGenerateAll: async () => {
      poller.stop()

      const getStatus = getDocStatusRef.current
      set((s) => ({
        status: "cancelled",
        queue: s.queue.map((item) => {
          if (item.status === "done" || item.status === "skipped") return item
          const actualStatus = getStatus?.(item.docType)
          if (actualStatus === "done") {
            return { ...item, status: "done" as const, stageMessage: undefined }
          }
          if (item.status === "pending" || item.status === "generating") {
            return { ...item, status: "cancelled" as const, stageMessage: undefined }
          }
          return item
        }),
      }))

      localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))

      try {
        await fetch("/api/generate-all/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        })
      } catch (err) {
        console.error("[GenerateAll] Failed to persist cancellation:", err)
      }
    },
  }))

  return store
}

function areQueueItemsEqual(left: QueueItem[], right: QueueItem[]) {
  if (left.length !== right.length) return false

  return left.every((item, index) => {
    const other = right[index]
    return Boolean(other) &&
      item.docType === other.docType &&
      item.label === other.label &&
      item.status === other.status &&
      item.creditCost === other.creditCost &&
      item.stageMessage === other.stageMessage &&
      item.error === other.error
  })
}

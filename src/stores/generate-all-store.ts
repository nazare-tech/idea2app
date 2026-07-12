"use client"

import { createStore, useStore, type StoreApi } from "zustand"
import {
  GENERATE_ALL_QUEUE_ORDER,
  GENERATE_ALL_DEFAULT_MODELS,
  type DocumentType,
  type PlanningTextDocType,
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
import {
  encodeStreamingPreviewLengths,
  mergeStreamingCompetitorSources,
  mergeStreamingPreview,
} from "@/lib/generation/streaming-preview"
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

/** Text planning documents that stream partial markdown during generation. */
export type StreamingPreviewDocType = PlanningTextDocType

interface GenerateAllState {
  status: GenerateAllStatus
  queue: QueueItem[]
  currentIndex: number
  totalCredits: number
  creditsUsed: number
  startedAt: Date | null
  error: string | null
  /**
   * Partial planning-document markdown streamed by the executor while an
   * item is generating, keyed by docType. Each entry keeps the longest
   * content seen (a throttle gap or out-of-order poll never rewinds the
   * reveal) and is retained after the item completes so the workspace can
   * keep showing it until the saved document loads. Merge semantics live in
   * src/lib/generation/streaming-preview.ts (delta protocol with the status
   * route).
   */
  streamingPreviews: Partial<Record<StreamingPreviewDocType, string>>
  /**
   * Live competitor source pairs for the streaming Market Research preview
   * (server-validated, from generation_queue_items.partial_metadata). Retained
   * once seen, like streamingPreviews, so links never disappear mid-stream.
   */
  streamingCompetitorSources: { name: string; url: string }[]
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

  // Report current preview lengths so the status route can respond with only
  // the new streamed tail instead of the full accumulated markdown.
  function buildStatusUrl() {
    const lengths = encodeStreamingPreviewLengths(store.getState().streamingPreviews)
    return `/api/generate-all/status?projectId=${projectId}${
      lengths ? `&previewLengths=${encodeURIComponent(lengths)}` : ""
    }`
  }

  interface StatusPayload {
    dbRow: {
      status: string
      queue?: QueueItem[]
      current_index?: number
      started_at?: string | null
      error_info?: { message?: string } | null
      needs_execute?: boolean
    } | null
    streamingPreview: unknown
  }

  async function fetchStatus(): Promise<StatusPayload> {
    const res = await fetch(buildStatusUrl())
    if (!res.ok) {
      const error = new Error(`Generate All status returned ${res.status}`)
      // 4xx means the request itself is wrong (auth, bad project) — no
      // amount of retrying fixes it. 5xx and network errors are transient.
      if (res.status >= 400 && res.status < 500) {
        throw Object.assign(error, { permanent: true })
      }
      throw error
    }
    const { queue: dbRow, streamingPreview } = await res.json()
    return { dbRow, streamingPreview }
  }

  /**
   * Fetch the status payload, retrying transient failures with backoff
   * (1s, 2s, 4s, 8s). Only the fetch retries; callers apply state exactly
   * once, so a retry can never replay side effects.
   */
  async function fetchStatusWithRetry(maxAttempts = 5): Promise<StatusPayload> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await fetchStatus()
      } catch (err) {
        if (attempt >= maxAttempts || (err instanceof Error && "permanent" in err)) {
          throw err
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)))
      }
    }
  }

  /**
   * The single interpretation of a status payload: trusts the server's
   * computed status/current_index (computeQueueStatus runs in the status
   * route against live items), merges streaming previews, and notifies the
   * workspace about newly-completed steps. Used by hydrate and every poll,
   * so the two can never disagree about what a payload means.
   */
  function applyStatusPayload(dbRow: NonNullable<StatusPayload["dbRow"]>, streamingPreview: unknown) {
    const incomingQueue: QueueItem[] = dbRow.queue ?? []
    if (dbRow.started_at) {
      pollStartedAtRef.current = new Date(dbRow.started_at).getTime()
    }

    // Detect newly-completed steps and notify the workspace to refresh the
    // exact document collections that should now have saved content. Only
    // meaningful against a previous snapshot: hydrate establishes the
    // baseline, subsequent polls diff against it.
    const prevQueue = prevQueueRef.current
    if (prevQueue) {
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
    }
    prevQueueRef.current = incomingQueue

    const newStatus = dbRow.status as GenerateAllStatus

    store.setState({
      queue: incomingQueue,
      currentIndex: dbRow.current_index ?? 0,
      startedAt: dbRow.started_at ? new Date(dbRow.started_at) : null,
      status: newStatus,
      error: dbRow.error_info?.message ?? null,
      streamingPreviews: mergeStreamingPreview(
        store.getState().streamingPreviews,
        streamingPreview,
      ),
      streamingCompetitorSources: mergeStreamingCompetitorSources(
        store.getState().streamingCompetitorSources,
        streamingPreview,
      ),
    })

    return newStatus
  }

  /** Keep polling while running (re-kicking a dead executor), stop otherwise. */
  function continueOrStopPolling(dbRow: NonNullable<StatusPayload["dbRow"]>, status: GenerateAllStatus) {
    if (status === "running") {
      const incomingQueue: QueueItem[] = dbRow.queue ?? []
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
  }

  async function doPoll() {
    try {
      const { dbRow, streamingPreview } = await fetchStatus()
      if (!dbRow) {
        poller.schedule()
        return
      }
      const status = applyStatusPayload(dbRow, streamingPreview)
      continueOrStopPolling(dbRow, status)
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
    streamingPreviews: {},
    streamingCompetitorSources: [],

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

      // Hydrate is the single entry point that starts polling: if its one
      // status fetch dies (transient 500, dev-server recompile, network blip)
      // the workspace would otherwise never update again. The retry lives in
      // the fetch alone so state application and side effects run once.
      let payload: StatusPayload
      try {
        payload = await fetchStatusWithRetry()
      } catch (err) {
        console.error("Failed to hydrate Generate All state:", err)
        localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
        set(() => ({ status: "idle" }))
        return
      }

      const { dbRow, streamingPreview } = payload
      if (!dbRow) {
        if (flag === "true") {
          localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
          set(() => ({ status: "idle" }))
        }
        return
      }

      // First-load special: auto-cancel a running queue abandoned >30 min ago
      // (tab closed mid-run and never reopened).
      if (dbRow.status === "running") {
        const startedMs = dbRow.started_at ? new Date(dbRow.started_at).getTime() : Date.now()
        if (Date.now() - startedMs > 30 * 60 * 1000) {
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

      const status = applyStatusPayload(dbRow, streamingPreview)
      localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
      continueOrStopPolling(dbRow, status)
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
        // A previous failed run's partial would otherwise display as this
        // run's live stream (merges keep the longest content per docType).
        streamingPreviews: {},
        streamingCompetitorSources: [],
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

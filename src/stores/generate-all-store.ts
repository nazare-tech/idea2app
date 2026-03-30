"use client"

import { createStore, useStore, type StoreApi } from "zustand"
import {
  GENERATE_ALL_QUEUE_ORDER,
  GENERATE_ALL_DEFAULT_MODELS,
  type DocumentType,
} from "@/lib/document-definitions"
import {
  estimateGenerateAllCost,
  GENERATE_ALL_ACTION_MAP,
  getTokenCost,
} from "@/lib/token-economics"
import {
  buildQueue,
  LOCAL_STORAGE_KEY,
  type QueueItem,
  type QueueItemStatus,
} from "@/lib/generate-all-helpers"

// Re-export types so consumers keep working
export type { QueueItem, QueueItemStatus }
export type GenerateAllStatus = "idle" | "loading" | "running" | "completed" | "cancelled" | "error" | "interrupted"

// ---------------------------------------------------------------------------
// Callback types (provided by the workspace, not stored in Zustand state)
// ---------------------------------------------------------------------------

export interface GenerateDocumentFn {
  (
    docType: DocumentType,
    model: string,
    options?: {
      signal?: AbortSignal
      marketingBrief?: {
        targetAudience: string
        stage: string
        budget: string
        channels: string
        launchWindow: string
      }
    },
  ): Promise<boolean>
}

export type GetDocumentStatusFn = (type: DocumentType) => "done" | "in_progress" | "pending"

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface GenerateAllState {
  status: GenerateAllStatus
  queue: QueueItem[]
  currentIndex: number
  modelSelections: Record<string, string>
  totalCredits: number
  creditsUsed: number
  startedAt: Date | null
  error: string | null
}

interface GenerateAllActions {
  /**
   * Called by GenerateAllHydrator on every render to keep callbacks fresh
   * and sync the idle queue when document statuses change.
   */
  _updateCallbacks: (
    genDoc: GenerateDocumentFn,
    getDocStatus: GetDocumentStatusFn,
  ) => void
  /** One-time DB fetch to restore state from a previous session. */
  hydrate: () => Promise<void>
  startGenerateAll: () => Promise<void>
  cancelGenerateAll: () => Promise<void>
  updateModelSelection: (docType: string, modelId: string) => void
}

type GenerateAllStore = GenerateAllState & GenerateAllActions

type StoreAPI = StoreApi<GenerateAllStore>

// ---------------------------------------------------------------------------
// Module-level store map — persists across React renders and route navigation
// ---------------------------------------------------------------------------

const projectStores = new Map<string, StoreAPI>()

export function getGenerateAllStore(projectId: string): StoreAPI {
  if (!projectStores.has(projectId)) {
    projectStores.set(projectId, createGenerateAllStore(projectId))
  }
  return projectStores.get(projectId)!
}

/**
 * React hook for consuming the store. Pass a selector to prevent unnecessary
 * re-renders — Zustand compares selector output with Object.is.
 */
export function useGenerateAll<T>(
  projectId: string,
  selector: (state: GenerateAllStore) => T,
): T {
  return useStore(getGenerateAllStore(projectId), selector)
}

/** Convenience hook that returns the full store (state + actions). */
export function useGenerateAllStore(projectId: string): GenerateAllStore {
  return useStore(getGenerateAllStore(projectId))
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

function createGenerateAllStore(projectId: string): StoreApi<GenerateAllStore> {
  // Synchronization primitives — NOT in Zustand state (no re-renders needed)
  const cancelledRef = { current: false }
  const abortControllerRef = { current: null as AbortController | null }
  const isRunningRef = { current: false }

  // Always-fresh callback refs — updated by GenerateAllHydrator each render
  const generateDocRef = { current: null as GenerateDocumentFn | null }
  const getDocStatusRef = { current: null as GetDocumentStatusFn | null }

  // 500ms settle to let router.refresh() propagate before the next item
  const settle = () => new Promise<void>((r) => setTimeout(r, 500))

  return createStore<GenerateAllStore>()((set, get) => {
    // -----------------------------------------------------------------------
    // Generation loop — runs directly as an async function (no useEffect).
    // get() always returns current state, eliminating workingQueueRef.
    // -----------------------------------------------------------------------
    async function runLoop() {
      if (isRunningRef.current) return
      isRunningRef.current = true

      const queueLength = get().queue.length
      const startIdx = get().queue.findIndex((item) => item.status === "pending")

      if (startIdx === -1) {
        set({ status: "completed" })
        isRunningRef.current = false
        return
      }

      for (let i = startIdx; i < queueLength; i++) {
        if (cancelledRef.current) break

        const item = get().queue[i] // always fresh — no stale closure
        if (item.status !== "pending") continue

        // Re-check: doc may already exist (generated individually)
        const liveStatus = getDocStatusRef.current?.(item.docType)
        if (liveStatus === "done") {
          set((s) => ({
            queue: s.queue.map((q, idx) =>
              idx === i ? { ...q, status: "skipped" as const } : q,
            ),
          }))
          continue
        }

        // Mark generating
        set((s) => ({
          currentIndex: i,
          queue: s.queue.map((q, idx) =>
            idx === i
              ? { ...q, status: "generating" as const, stageMessage: "Generating..." }
              : q,
          ),
        }))

        // Persist progress to DB (fire-and-forget)
        fetch("/api/generate-all/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, queue: get().queue, current_index: i }),
        }).catch(() => {})

        // Read model from current state (user may have changed it while pending)
        const model =
          get().modelSelections[item.docType] ?? GENERATE_ALL_DEFAULT_MODELS[item.docType]

        const options: Parameters<GenerateDocumentFn>[2] = {
          signal: abortControllerRef.current?.signal,
          ...(item.docType === "launch" && {
            marketingBrief: {
              targetAudience: "Early adopters and tech-savvy users",
              stage: "Pre-launch",
              budget: "Bootstrap / Lean",
              channels: "Social Media, Product Hunt, Content Marketing",
              launchWindow: "Next 30 days",
            },
          }),
        }

        try {
          const success = await generateDocRef.current!(item.docType, model, options)

          if (cancelledRef.current) break

          if (success) {
            const action = GENERATE_ALL_ACTION_MAP[item.docType]
            const cost = getTokenCost(action, model)
            set((s) => ({
              creditsUsed: s.creditsUsed + cost,
              queue: s.queue.map((q, idx) =>
                idx === i ? { ...q, status: "done" as const, stageMessage: undefined } : q,
              ),
            }))
          } else {
            throw new Error("Generation failed")
          }
        } catch (err) {
          if (cancelledRef.current) break
          if (err instanceof DOMException && err.name === "AbortError") break

          const errorMsg = err instanceof Error ? err.message : "Unknown error"
          set((s) => ({
            error: errorMsg,
            status: "error" as const,
            queue: s.queue.map((q, idx) =>
              idx === i
                ? { ...q, status: "error" as const, stageMessage: undefined, error: errorMsg }
                : q,
            ),
          }))

          fetch("/api/generate-all/update", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              queue: get().queue,
              current_index: i,
              status: "error",
              error_info: { message: errorMsg, docType: item.docType },
            }),
          }).catch(() => {})

          isRunningRef.current = false
          return
        }

        // Persist per-item progress (fire-and-forget)
        fetch("/api/generate-all/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, queue: get().queue, current_index: i + 1 }),
        }).catch(() => {})

        // Wait for router.refresh() to propagate before next iteration
        await settle()
      }

      if (cancelledRef.current) {
        cancelledRef.current = false
        isRunningRef.current = false
        return
      }

      // Final verification pass: re-check any item still "generating"
      const finalQueue = get().queue.map((item) => {
        if (item.status === "generating") {
          const live = getDocStatusRef.current?.(item.docType)
          return live === "done"
            ? { ...item, status: "done" as const, stageMessage: undefined }
            : {
                ...item,
                status: "error" as const,
                stageMessage: undefined,
                error: "Generation did not complete",
              }
        }
        return item
      })

      set({ queue: finalQueue, status: "completed" })
      localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))

      fetch("/api/generate-all/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          queue: finalQueue,
          status: "completed",
          current_index: finalQueue.length,
          completed_at: new Date().toISOString(),
        }),
      }).catch(() => {})

      isRunningRef.current = false
    }

    // -----------------------------------------------------------------------
    // Store state + actions
    // -----------------------------------------------------------------------
    return {
      // Initial state
      status: "idle",
      queue: [],
      currentIndex: 0,
      modelSelections: { ...GENERATE_ALL_DEFAULT_MODELS },
      totalCredits: 0,
      creditsUsed: 0,
      startedAt: null,
      error: null,

      // Update always-fresh callback refs (called by Hydrator on every render).
      // Also rebuilds the idle queue and totalCredits when doc statuses change.
      _updateCallbacks: (genDoc, getDocStatus) => {
        generateDocRef.current = genDoc
        getDocStatusRef.current = getDocStatus

        // Only sync state when idle — no-op during generation
        if (get().status !== "idle") return

        const { modelSelections } = get()
        const newQueue = buildQueue(modelSelections, getDocStatus)
        const skipTypes = new Set<string>(
          GENERATE_ALL_QUEUE_ORDER.filter(
            (dt) => getDocStatus(dt as DocumentType) === "done",
          ),
        )
        const newTotal = estimateGenerateAllCost(modelSelections, skipTypes)
        set({ queue: newQueue, totalCredits: newTotal })
      },

      hydrate: async () => {
        const flag =
          typeof window !== "undefined"
            ? localStorage.getItem(LOCAL_STORAGE_KEY(projectId))
            : null

        if (flag === "true") set({ status: "loading" })

        try {
          const res = await fetch(`/api/generate-all/status?projectId=${projectId}`)
          if (!res.ok) return
          const { queue: dbRow } = await res.json()

          if (!dbRow) {
            if (flag === "true") {
              localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
              set({ status: "idle" })
            }
            return
          }

          // Auto-cancel stale running queues (>30 min old)
          if (dbRow.status === "running") {
            const startedMs = new Date(dbRow.started_at).getTime()
            const thirtyMin = 30 * 60 * 1000
            if (Date.now() - startedMs > thirtyMin) {
              await fetch("/api/generate-all/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
              })
              localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
              set({ status: "idle" })
              return
            }
          }

          // Restore terminal states (completed / cancelled / error)
          if (
            dbRow.status === "completed" ||
            dbRow.status === "cancelled" ||
            dbRow.status === "error"
          ) {
            set({
              queue: dbRow.queue,
              currentIndex: dbRow.current_index,
              modelSelections: dbRow.model_selections ?? get().modelSelections,
              startedAt: dbRow.started_at ? new Date(dbRow.started_at) : null,
              status: dbRow.status as GenerateAllStatus,
              error: dbRow.error_info?.message ?? null,
            })
            localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
            return
          }

          // Resume running queue — check which items are actually done now
          if (dbRow.status === "running") {
            const getStatus = getDocStatusRef.current
            const hydratedQueue: QueueItem[] = (dbRow.queue as QueueItem[]).map((item) => {
              if (item.status === "pending" || item.status === "generating") {
                const currentStatus = getStatus?.(item.docType)
                if (currentStatus === "done") {
                  return { ...item, status: "done" as const }
                }
                // Reset "generating" → "pending" so the loop can retry it.
                // This handles two scenarios:
                // 1. Page refresh mid-generation: the interrupted item gets retried
                //    instead of being stuck "generating" and marked as an error.
                // 2. Second tab opens while generation is in progress: items show as
                //    "pending", and the loop's liveStatus check skips any that Tab 1
                //    has already completed by the time Tab 2 reaches them.
                return { ...item, status: "pending" as const }
              }
              return item
            })

            const nextPending = hydratedQueue.findIndex((item) => item.status === "pending")

            if (nextPending === -1) {
              // All finished while we were away — mark completed
              set({
                queue: hydratedQueue,
                currentIndex: hydratedQueue.length,
                startedAt: dbRow.started_at ? new Date(dbRow.started_at) : null,
                status: "completed",
              })
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
              // Page was refreshed (or navigated away) while generation was in progress.
              // Do NOT auto-restart runLoop() — that would fire duplicate API calls every
              // time the user refreshes. Instead surface an "interrupted" state so the user
              // can explicitly click Resume when ready.
              set({
                queue: hydratedQueue,
                currentIndex: nextPending,
                modelSelections: dbRow.model_selections ?? get().modelSelections,
                startedAt: dbRow.started_at ? new Date(dbRow.started_at) : null,
                status: "interrupted",
              })
              // Clear the localStorage flag so a subsequent navigation doesn't re-show
              // the loading spinner unnecessarily.
              localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
            }
          }
        } catch (err) {
          console.error("Failed to hydrate Generate All state:", err)
          localStorage.removeItem(LOCAL_STORAGE_KEY(projectId))
          set({ status: "idle" })
        }
      },

      startGenerateAll: async () => {
        if (get().status === "running") return

        cancelledRef.current = false
        isRunningRef.current = false
        abortControllerRef.current = new AbortController()

        const freshQueue = buildQueue(
          get().modelSelections,
          getDocStatusRef.current ?? (() => "pending" as const),
        )

        const pendingItems = freshQueue.filter((item) => item.status === "pending")
        if (pendingItems.length === 0) return

        set({
          queue: freshQueue,
          currentIndex: 0,
          creditsUsed: 0,
          error: null,
          startedAt: new Date(),
          status: "running",
        })

        localStorage.setItem(LOCAL_STORAGE_KEY(projectId), "true")

        try {
          await fetch("/api/generate-all/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              queue: freshQueue,
              modelSelections: get().modelSelections,
            }),
          })
        } catch (err) {
          console.error("Failed to persist queue start:", err)
        }

        // Start loop directly — no useEffect trigger needed
        runLoop()
      },

      cancelGenerateAll: async () => {
        cancelledRef.current = true

        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
          abortControllerRef.current = null
        }

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
          console.error("Failed to persist cancellation:", err)
        }
      },

      updateModelSelection: (docType, modelId) => {
        set((s) => {
          const newSelections = { ...s.modelSelections, [docType]: modelId }

          // Update the credit cost for this item in the queue
          const newQueue = s.queue.map((item) => {
            if (item.docType !== docType) return item
            const action = GENERATE_ALL_ACTION_MAP[docType]
            return {
              ...item,
              creditCost: action ? getTokenCost(action, modelId) : item.creditCost,
            }
          })

          // Recalculate total
          const skipTypes = new Set<string>(
            newQueue.filter((q) => q.status === "skipped").map((q) => q.docType),
          )
          const newTotal = estimateGenerateAllCost(newSelections, skipTypes)

          return { modelSelections: newSelections, totalCredits: newTotal, queue: newQueue }
        })
      },
    }
  })
}

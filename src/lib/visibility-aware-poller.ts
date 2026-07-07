// Small visibility-aware scheduler for browser polling loops.
//
// Semantics:
// - `schedule()` arms one poll after `getDelayMs()`; rescheduling replaces the
//   armed poll instead of stacking. The poll callback decides whether to call
//   `schedule()` again, so the loop shape stays in the caller's domain code.
// - While the tab is hidden no poll is armed; when it becomes visible again a
//   poll runs immediately (gated by `shouldPollOnVisible`).
// - `stop()` disarms the poll and removes the visibility listener; the poller
//   can be re-armed later with `schedule()`.
// - Safe to construct during SSR: without a `document` it degrades to a plain
//   timer.

export interface VisibilityAwarePollerOptions {
  /** Runs one poll. Call `schedule()` inside it to continue the loop. */
  poll: () => void
  /** Delay before the next poll; re-evaluated on every `schedule()`. */
  getDelayMs: () => number
  /** Gates the immediate poll when the tab becomes visible (default: always). */
  shouldPollOnVisible?: () => boolean
}

export interface VisibilityAwarePoller {
  schedule(): void
  stop(): void
}

export function createVisibilityAwarePoller({
  poll,
  getDelayMs,
  shouldPollOnVisible,
}: VisibilityAwarePollerOptions): VisibilityAwarePoller {
  let timer: ReturnType<typeof setTimeout> | null = null
  let visibilityHandler: (() => void) | null = null

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function ensureVisibilityListener() {
    if (typeof document === "undefined" || visibilityHandler) return

    visibilityHandler = () => {
      if (document.hidden) {
        clearTimer()
        return
      }

      if (!shouldPollOnVisible || shouldPollOnVisible()) {
        clearTimer()
        poll()
      }
    }
    document.addEventListener("visibilitychange", visibilityHandler)
  }

  return {
    schedule() {
      clearTimer()
      ensureVisibilityListener()

      if (typeof document !== "undefined" && document.hidden) {
        return
      }

      timer = setTimeout(poll, getDelayMs())
    },

    stop() {
      clearTimer()
      if (typeof document !== "undefined" && visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler)
      }
      visibilityHandler = null
    },
  }
}

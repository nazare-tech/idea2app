const FIRST_TOKEN_POLL_INTERVAL_MS = 1200
const FIRST_TOKEN_WAIT_LIMIT_MS = 60_000

const ACTIVE_QUEUE_STATUSES = ["queued", "pending", "running"]
const ACTIVE_ITEM_STATUSES = ["pending", "generating"]

/**
 * Poll the generate-all status route until the first Market Research token
 * has streamed, so a caller holding a loading screen can hand off to a
 * workspace with live content instead of an empty generating state.
 *
 * Escape hatches so the user is never stranded: resolves when the queue ends
 * without streaming (error/cancelled/completed), when the competitive item
 * settles without partial content, or when the deadline passes.
 */
export async function waitForFirstStreamedToken(projectId: string) {
  const deadline = Date.now() + FIRST_TOKEN_WAIT_LIMIT_MS

  while (Date.now() < deadline) {
    try {
      const response = await fetch(
        `/api/generate-all/status?projectId=${encodeURIComponent(projectId)}`
      )
      const data = await response.json().catch(() => null)

      if (response.ok && data) {
        const streamed = data.streamingPreview?.content
        if (typeof streamed === "string" && streamed.length > 0) return

        const queueStatus = data.queue?.status
        if (queueStatus && !ACTIVE_QUEUE_STATUSES.includes(queueStatus)) return

        const competitiveItem = Array.isArray(data.queue?.queue)
          ? data.queue.queue.find(
              (item: { docType?: string; status?: string }) => item?.docType === "competitive"
            )
          : null
        if (competitiveItem?.status && !ACTIVE_ITEM_STATUSES.includes(competitiveItem.status)) {
          return
        }
      }
    } catch {
      // Transient network error: keep polling until the deadline.
    }

    await new Promise((resolve) => setTimeout(resolve, FIRST_TOKEN_POLL_INTERVAL_MS))
  }
}

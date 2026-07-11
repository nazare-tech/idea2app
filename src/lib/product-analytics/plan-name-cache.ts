/**
 * Short-TTL, per-instance cache for the plan name stamped onto analytics
 * events. A tab flushes events every few seconds; the underlying
 * subscriptions lookup changes at most a few times per user lifetime, so
 * paying it once per flush is pure waste. Analytics plan snapshots tolerate
 * TTL staleness by design (they are point-in-time labels, not billing
 * authority).
 */

const PLAN_NAME_TTL_MS = 5 * 60 * 1000
const MAX_ENTRIES = 500

const cache = new Map<string, { value: string; expiresAt: number }>()

export async function getCachedPlanName(
  userId: string,
  load: () => Promise<string>,
  now: number = Date.now(),
): Promise<string> {
  const cached = cache.get(userId)
  if (cached && cached.expiresAt > now) return cached.value

  const value = await load()
  // Refresh insertion order so eviction drops the least recently written.
  cache.delete(userId)
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(userId, { value, expiresAt: now + PLAN_NAME_TTL_MS })
  return value
}

/** Test hook: drop all cached entries. */
export function clearPlanNameCache() {
  cache.clear()
}

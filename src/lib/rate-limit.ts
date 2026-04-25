type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown"

  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return {
      limited: false,
      remaining: Math.max(limit - 1, 0),
      resetAt: now + windowMs,
      retryAfterSeconds: 0,
    }
  }

  existing.count += 1
  buckets.set(key, existing)

  const retryAfterSeconds = Math.max(Math.ceil((existing.resetAt - now) / 1000), 1)

  return {
    limited: existing.count > limit,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: existing.resetAt,
    retryAfterSeconds,
  }
}

export function pruneRateLimitBuckets() {
  const now = Date.now()
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) buckets.delete(key)
  }
}

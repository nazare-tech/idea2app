import { logWarn } from "@/lib/logger"

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitResult = {
  limited: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

type RedisCommandResponse<T> = {
  result?: T
  error?: string
}

const buckets = new Map<string, RateLimitEntry>()
let lastPruneAt = 0
const PRUNE_INTERVAL_MS = 60_000
const REDIS_TIMEOUT_MS = 1500

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown"

  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const redisConfig = getRedisConfig()

  if (redisConfig) {
    try {
      return await checkRedisRateLimit(options, redisConfig)
    } catch (error) {
      logWarn("RateLimit", "redis_limiter_failed", {
        key: options.key,
        limit: options.limit,
        windowMs: options.windowMs,
      }, error)
    }
  }

  return checkMemoryRateLimit(options)
}

function checkMemoryRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  pruneRateLimitBucketsOnCadence()

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

function pruneRateLimitBucketsOnCadence() {
  const now = Date.now()
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return

  lastPruneAt = now
  pruneExpiredMemoryBuckets(now)
}

function pruneExpiredMemoryBuckets(now = Date.now()) {
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) buckets.delete(key)
  }
}

function getRedisConfig() {
  const url =
    process.env.RATE_LIMIT_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL
  const token =
    process.env.RATE_LIMIT_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN

  if (!url || !token) return null

  return {
    url: url.replace(/\/+$/, ""),
    token,
  }
}

async function checkRedisRateLimit(
  { key, limit, windowMs }: RateLimitOptions,
  redis: { url: string; token: string },
): Promise<RateLimitResult> {
  const redisKey = `rate-limit:${key}`
  const count = coerceRedisNumber(await runRedisCommand<number | string>(redis, ["INCR", redisKey]), "INCR")

  if (count === 1) {
    await runRedisCommand<string | number>(redis, ["PEXPIRE", redisKey, String(windowMs)])
  }

  let ttlMs = coerceRedisNumber(await runRedisCommand<number | string>(redis, ["PTTL", redisKey]), "PTTL")
  if (ttlMs < 0) {
    await runRedisCommand<string | number>(redis, ["PEXPIRE", redisKey, String(windowMs)])
    ttlMs = windowMs
  }

  const now = Date.now()
  const resetAt = now + Math.max(ttlMs, 0)
  const retryAfterSeconds = Math.max(Math.ceil(Math.max(ttlMs, 0) / 1000), count > limit ? 1 : 0)

  return {
    limited: count > limit,
    remaining: Math.max(limit - count, 0),
    resetAt,
    retryAfterSeconds,
  }
}

function coerceRedisNumber(value: number | string, command: string) {
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Redis ${command} returned a non-numeric result`)
  }

  return parsed
}

async function runRedisCommand<T>(
  redis: { url: string; token: string },
  command: string[],
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS)

  try {
    const response = await fetch(redis.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redis.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: controller.signal,
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Redis command failed with HTTP ${response.status}`)
    }

    const payload = await response.json() as RedisCommandResponse<T>
    if (payload.error) {
      throw new Error(payload.error)
    }

    return payload.result as T
  } finally {
    clearTimeout(timeoutId)
  }
}

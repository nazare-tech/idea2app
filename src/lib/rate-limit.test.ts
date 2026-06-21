import test from "node:test"
import assert from "node:assert/strict"

import { checkRateLimit } from "./rate-limit"

function clearRedisEnv() {
  delete process.env.RATE_LIMIT_REDIS_REST_URL
  delete process.env.RATE_LIMIT_REDIS_REST_TOKEN
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
}

test("checkRateLimit limits requests in the in-memory fallback", async () => {
  clearRedisEnv()
  const key = `memory-test:${crypto.randomUUID()}`

  const first = await checkRateLimit({ key, limit: 2, windowMs: 60_000 })
  const second = await checkRateLimit({ key, limit: 2, windowMs: 60_000 })
  const third = await checkRateLimit({ key, limit: 2, windowMs: 60_000 })

  assert.equal(first.limited, false)
  assert.equal(first.remaining, 1)
  assert.equal(second.limited, false)
  assert.equal(second.remaining, 0)
  assert.equal(third.limited, true)
  assert.equal(third.remaining, 0)
  assert.ok(third.retryAfterSeconds > 0)
})

test("checkRateLimit uses Redis REST env vars when configured", async () => {
  const originalFetch = globalThis.fetch
  const commands: unknown[] = []

  process.env.RATE_LIMIT_REDIS_REST_URL = "https://redis.example.test"
  process.env.RATE_LIMIT_REDIS_REST_TOKEN = "test-token"

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body))
    commands.push(command)

    if (command[0] === "INCR") {
      return Response.json({ result: 1 })
    }

    if (command[0] === "PEXPIRE") {
      return Response.json({ result: 1 })
    }

    if (command[0] === "PTTL") {
      return Response.json({ result: 30_000 })
    }

    return Response.json({ error: "unexpected command" }, { status: 400 })
  }) as typeof fetch

  try {
    const result = await checkRateLimit({
      key: `redis-test:${crypto.randomUUID()}`,
      limit: 5,
      windowMs: 60_000,
    })

    assert.equal(result.limited, false)
    assert.equal(result.remaining, 4)
    assert.equal(result.retryAfterSeconds, 30)
    assert.deepEqual(
      commands.map((command) => Array.isArray(command) ? command[0] : null),
      ["INCR", "PEXPIRE", "PTTL"],
    )
  } finally {
    globalThis.fetch = originalFetch
    clearRedisEnv()
  }
})

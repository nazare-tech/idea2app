import assert from "node:assert/strict"
import test from "node:test"

import { withRetry } from "./with-retry"

const originalWarn = console.warn

test.afterEach(() => {
  console.warn = originalWarn
})

test("withRetry logs retry attempts with structured context", async () => {
  const messages: string[] = []
  console.warn = (message?: unknown) => {
    messages.push(String(message))
  }

  let attempts = 0
  const result = await withRetry(
    async () => {
      attempts += 1
      if (attempts === 1) {
        throw new Error("HTTP 502 upstream unavailable")
      }
      return "ok"
    },
    { retries: 1, backoff: [0], label: "Tavily search" },
  )

  assert.equal(result, "ok")
  assert.equal(messages.length, 1)
  const payload = JSON.parse(messages[0])
  assert.equal(payload.level, "warn")
  assert.equal(payload.scope, "withRetry")
  assert.equal(payload.event, "retry_scheduled")
  assert.deepEqual(payload.context, {
    label: "Tavily search",
    attempt: 1,
    maxAttempts: 2,
    delayMs: 0,
  })
  assert.equal(payload.error.message, "HTTP 502 upstream unavailable")
})

test("withRetry does not log non-retryable failures", async () => {
  const messages: string[] = []
  console.warn = (message?: unknown) => {
    messages.push(String(message))
  }

  await assert.rejects(
    () =>
      withRetry(
        async () => {
          throw new Error("HTTP 400 invalid request")
        },
        { retries: 1, backoff: [0], label: "Bad request" },
      ),
    /HTTP 400/,
  )

  assert.deepEqual(messages, [])
})

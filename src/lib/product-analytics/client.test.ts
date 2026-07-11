import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test from "node:test"

import { PRODUCT_EVENT_SCHEMA_VERSION, type ClientProductEventInput } from "@/lib/product-analytics/contracts"
import { createProductEventBatcher } from "@/lib/product-analytics/client"

function event(): ClientProductEventInput {
  return {
    eventId: randomUUID(),
    eventName: "workspace_session_started",
    schemaVersion: PRODUCT_EVENT_SCHEMA_VERSION,
    occurredAt: "2026-07-10T12:00:00.000Z",
    sessionId: randomUUID(),
    projectId: randomUUID(),
    properties: { entrySectionId: "executive-summary", viewportClass: "desktop" },
  }
}

test("batcher delivers queued events on its scheduled flush", async () => {
  const scheduled: Array<() => void> = []
  const delivered: ClientProductEventInput[][] = []
  const batcher = createProductEventBatcher({
    deliver: async (events) => { delivered.push(events); return "accepted" },
    schedule: (callback) => { scheduled.push(callback); return scheduled.length },
    cancel: () => undefined,
  })

  batcher.enqueue(event())
  assert.equal(batcher.size(), 1)
  scheduled.shift()?.()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(delivered.length, 1)
  assert.equal(delivered[0].length, 1)
  assert.equal(batcher.size(), 0)
})

test("batcher restores a transiently failed batch and retries it", async () => {
  const scheduled: Array<() => void> = []
  let attempts = 0
  const batcher = createProductEventBatcher({
    deliver: async () => (++attempts === 1 ? "retry" : "accepted"),
    schedule: (callback) => { scheduled.push(callback); return scheduled.length },
    cancel: () => undefined,
  })

  batcher.enqueue(event())
  scheduled.shift()?.()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(batcher.size(), 1)
  scheduled.shift()?.()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(attempts, 2)
  assert.equal(batcher.size(), 0)
})

test("batcher drops permanently rejected events", async () => {
  const batcher = createProductEventBatcher({
    deliver: async () => "drop",
    schedule: () => 1,
    cancel: () => undefined,
  })
  batcher.enqueue(event())
  await batcher.flush()
  assert.equal(batcher.size(), 0)
})

test("batcher bounds repeated transient delivery failures", async () => {
  const scheduled: Array<() => void> = []
  let attempts = 0
  const batcher = createProductEventBatcher({
    deliver: async () => { attempts += 1; return "retry" },
    schedule: (callback) => { scheduled.push(callback); return scheduled.length },
    cancel: () => undefined,
  })
  batcher.enqueue(event())

  for (let index = 0; index < 4; index += 1) {
    scheduled.shift()?.()
    await new Promise((resolve) => setImmediate(resolve))
  }

  assert.equal(attempts, 4)
  assert.equal(batcher.size(), 0)
  assert.equal(scheduled.length, 0)
})

test("pagehide flush delivers newly queued events while a normal batch is in flight", async () => {
  let releaseFirst: (() => void) | undefined
  let calls = 0
  const deliveredSizes: number[] = []
  const batcher = createProductEventBatcher({
    deliver: async (events) => {
      calls += 1
      deliveredSizes.push(events.length)
      if (calls === 1) await new Promise<void>((resolve) => { releaseFirst = resolve })
      return "accepted"
    },
    schedule: () => 1,
    cancel: () => undefined,
  })

  batcher.enqueue(event())
  const normalFlush = batcher.flush()
  batcher.enqueue(event())
  await batcher.flush(true)
  releaseFirst?.()
  await normalFlush

  assert.deepEqual(deliveredSizes, [1, 1])
  assert.equal(batcher.size(), 0)
})

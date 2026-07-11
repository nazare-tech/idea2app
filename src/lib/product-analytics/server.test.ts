import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test from "node:test"

import { recordServerProductEvent } from "@/lib/product-analytics/server"
import type { ProductEventRow } from "@/lib/product-analytics/storage"

test("records a validated, idempotent server lifecycle event", async () => {
  const projectId = randomUUID()
  const runId = randomUUID()
  const inserted: ProductEventRow[] = []

  const recorded = await recordServerProductEvent({
    eventName: "generation_started",
    idempotencyKey: `generation:${runId}:started`,
    userId: "user-1",
    projectId,
    properties: { runId, mode: "onboarding" },
  }, {
    now: () => new Date("2026-07-10T12:00:00.000Z"),
    loadPlanName: async () => "Pro",
    insertRow: async (row) => { inserted.push(row) },
    environment: "test",
    appRelease: null,
  })

  assert.equal(recorded, true)
  assert.equal(inserted.length, 1)
  assert.equal(inserted[0].idempotency_key, `generation:${runId}:started`)
  assert.equal(inserted[0].event_name, "generation_started")
  assert.equal(inserted[0].plan_key, "pro")
  assert.equal(inserted[0].source, "server")
})

test("does not write an invalid server event", async () => {
  let insertCalled = false
  const recorded = await recordServerProductEvent({
    eventName: "generation_started",
    idempotencyKey: "bad-run",
    userId: "user-1",
    projectId: randomUUID(),
    properties: { runId: "not-a-uuid", mode: "onboarding" },
  }, {
    loadPlanName: async () => "Free",
    insertRow: async () => { insertCalled = true },
  })

  assert.equal(recorded, false)
  assert.equal(insertCalled, false)
})

test("server analytics failures remain non-blocking", async () => {
  const projectId = randomUUID()
  const recorded = await recordServerProductEvent({
    eventName: "project_created",
    idempotencyKey: `project:${projectId}:created`,
    userId: "user-1",
    projectId,
    properties: { creationSource: "intake" },
  }, {
    loadPlanName: async () => "Free",
    insertRow: async () => { throw new Error("database unavailable") },
  })

  assert.equal(recorded, false)
})

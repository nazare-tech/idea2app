import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test from "node:test"

import { PRODUCT_EVENT_SCHEMA_VERSION } from "@/lib/product-analytics/contracts"
import {
  ingestClientProductEvents,
  ProductEventOwnershipError,
} from "@/lib/product-analytics/ingest"
import type { ProductEventRow } from "@/lib/product-analytics/storage"

function workspaceStart(projectId = randomUUID()) {
  return {
    events: [{
      eventId: randomUUID(),
      eventName: "workspace_session_started",
      schemaVersion: PRODUCT_EVENT_SCHEMA_VERSION,
      occurredAt: "2026-07-10T12:00:00.000Z",
      sessionId: randomUUID(),
      projectId,
      properties: { entrySectionId: "executive-summary", viewportClass: "desktop" },
    }],
  }
}

test("ingests an owned client event with trusted server enrichment", async () => {
  const body = workspaceStart()
  const projectId = body.events[0].projectId
  let inserted: ProductEventRow[] = []

  const result = await ingestClientProductEvents(body, "user-1", {
    loadOwnedProjectIds: async () => [projectId],
    loadPlanName: async () => "Enterprise",
    insertRows: async (rows) => { inserted = rows },
    now: () => new Date("2026-07-10T12:00:01.000Z"),
    environment: "test",
    appRelease: "abc123",
  })

  assert.deepEqual(result, { accepted: 1 })
  assert.equal(inserted[0].user_id, "user-1")
  assert.equal(inserted[0].project_id, projectId)
  assert.equal(inserted[0].plan_key, "premium")
  assert.equal(inserted[0].source, "client")
  assert.equal(inserted[0].environment, "test")
  assert.equal(inserted[0].app_release, "abc123")
  assert.match(inserted[0].idempotency_key, /^client:user-1:/)
})

test("rejects the entire batch when any project is not owned", async () => {
  const body = workspaceStart()
  let insertCalled = false

  await assert.rejects(
    ingestClientProductEvents(body, "user-1", {
      loadOwnedProjectIds: async () => [],
      loadPlanName: async () => "Free",
      insertRows: async () => { insertCalled = true },
      now: () => new Date("2026-07-10T12:00:01.000Z"),
    }),
    ProductEventOwnershipError,
  )
  assert.equal(insertCalled, false)
})

test("deduplicates project ownership lookups for a batch", async () => {
  const body = workspaceStart()
  const first = body.events[0]
  body.events.push({ ...first, eventId: randomUUID(), eventName: "workspace_session_started" })
  let lookedUp: string[] = []

  await ingestClientProductEvents(body, "user-1", {
    loadOwnedProjectIds: async (ids) => { lookedUp = ids; return ids },
    loadPlanName: async () => "Free",
    insertRows: async () => undefined,
    now: () => new Date("2026-07-10T12:00:01.000Z"),
  })

  assert.deepEqual(lookedUp, [first.projectId])
})

test("enforces a durable daily event quota before insertion", async () => {
  const body = workspaceStart()
  let inserted = false
  await assert.rejects(
    ingestClientProductEvents(body, "user-1", {
      loadOwnedProjectIds: async (ids) => ids,
      loadPlanName: async () => "Free",
      loadDailyEventCount: async () => 2_000,
      insertRows: async () => { inserted = true },
      now: () => new Date("2026-07-10T12:00:01.000Z"),
    }),
    /quota/i,
  )
  assert.equal(inserted, false)
})

import test from "node:test"
import assert from "node:assert/strict"

import {
  WEBHOOK_PROCESSING_RETRY_AFTER_MS,
  claimWebhookEvent,
} from "./stripe-webhook-claim"

function stripeEvent() {
  return {
    id: "evt_123",
    type: "invoice.paid",
    livemode: false,
  } as never
}

function makeClaimClient({
  insertError = null,
  existingEvent = null,
  reclaimData = { event_id: "evt_123" },
}: {
  insertError?: { code: string; message: string } | null
  existingEvent?: { status: string; received_at: string | null } | null
  reclaimData?: { event_id: string } | null
}) {
  const eqCalls: Array<{ column: string; value: unknown }> = []
  const updates: Record<string, unknown>[] = []
  let mode: "read" | "update" = "read"

  const query = {
    async insert() {
      return { error: insertError }
    },
    select() {
      return this
    },
    update(update: Record<string, unknown>) {
      mode = "update"
      updates.push(update)
      return this
    },
    eq(column: string, value: unknown) {
      eqCalls.push({ column, value })
      return this
    },
    async maybeSingle() {
      return mode === "update"
        ? { data: reclaimData, error: null }
        : { data: existingEvent, error: null }
    },
  }

  return {
    eqCalls,
    updates,
    client: {
      from() {
        return query
      },
    } as never,
  }
}

test("claimWebhookEvent claims a first-seen event", async () => {
  const { client } = makeClaimClient({})

  assert.deepEqual(await claimWebhookEvent(client, stripeEvent()), {
    shouldProcess: true,
    retrying: false,
  })
})

test("claimWebhookEvent ignores an already processed duplicate", async () => {
  const { client } = makeClaimClient({
    insertError: { code: "23505", message: "duplicate" },
    existingEvent: {
      status: "processed",
      received_at: "2026-06-18T00:00:00.000Z",
    },
  })

  assert.deepEqual(await claimWebhookEvent(client, stripeEvent()), {
    shouldProcess: false,
    reason: "processed",
  })
})

test("claimWebhookEvent ignores a fresh processing duplicate", async () => {
  const now = Date.parse("2026-06-18T00:01:00.000Z")
  const { client } = makeClaimClient({
    insertError: { code: "23505", message: "duplicate" },
    existingEvent: {
      status: "processing",
      received_at: "2026-06-18T00:00:00.000Z",
    },
  })

  assert.deepEqual(await claimWebhookEvent(client, stripeEvent(), { nowMs: () => now }), {
    shouldProcess: false,
    reason: "processing",
  })
})

test("claimWebhookEvent reclaims a failed duplicate", async () => {
  const now = Date.parse("2026-06-18T00:10:00.000Z")
  const { client, updates } = makeClaimClient({
    insertError: { code: "23505", message: "duplicate" },
    existingEvent: {
      status: "failed",
      received_at: "2026-06-18T00:00:00.000Z",
    },
  })

  assert.deepEqual(await claimWebhookEvent(client, stripeEvent(), { nowMs: () => now }), {
    shouldProcess: true,
    retrying: true,
  })
  assert.equal(updates[0].status, "processing")
  assert.equal(updates[0].received_at, "2026-06-18T00:10:00.000Z")
})

test("claimWebhookEvent reclaims stale processing with received_at guard", async () => {
  const receivedAt = "2026-06-18T00:00:00.000Z"
  const now = Date.parse(receivedAt) + WEBHOOK_PROCESSING_RETRY_AFTER_MS + 1
  const { client, eqCalls } = makeClaimClient({
    insertError: { code: "23505", message: "duplicate" },
    existingEvent: {
      status: "processing",
      received_at: receivedAt,
    },
  })

  assert.deepEqual(await claimWebhookEvent(client, stripeEvent(), { nowMs: () => now }), {
    shouldProcess: true,
    retrying: true,
  })
  assert.ok(eqCalls.some((call) => call.column === "received_at" && call.value === receivedAt))
})

test("claimWebhookEvent treats reclaim races as still processing", async () => {
  const { client } = makeClaimClient({
    insertError: { code: "23505", message: "duplicate" },
    existingEvent: {
      status: "failed",
      received_at: "2026-06-18T00:00:00.000Z",
    },
    reclaimData: null,
  })

  assert.deepEqual(await claimWebhookEvent(client, stripeEvent()), {
    shouldProcess: false,
    reason: "processing",
  })
})

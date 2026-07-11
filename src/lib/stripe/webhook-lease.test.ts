import test from "node:test"
import assert from "node:assert/strict"

import {
  WEBHOOK_PROCESSING_RETRY_AFTER_MS,
  WebhookLeaseLostError,
  claimWebhookEvent,
  finalizeWebhookEvent,
} from "@/lib/stripe/webhook-lease"

function stripeEvent() {
  return {
    id: "evt_123",
    type: "invoice.paid",
    livemode: false,
  } as never
}

function makeClaimClient({
  insertError = null,
  insertData = { received_at: "2026-06-18T00:00:00.000Z" },
  existingEvent = null,
  reclaimData = { received_at: "2026-06-18T00:10:00.000Z" },
}: {
  insertError?: { code: string; message: string } | null
  insertData?: { received_at: string } | null
  existingEvent?: { status: string; received_at: string } | null
  reclaimData?: { received_at: string } | null
}) {
  const eqCalls: Array<{ column: string; value: unknown }> = []
  const updates: Record<string, unknown>[] = []
  let mode: "insert" | "read" | "update" = "read"

  const query = {
    insert() {
      mode = "insert"
      return this
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
    async single() {
      return { data: insertError ? null : insertData, error: insertError }
    },
    async maybeSingle() {
      if (mode === "update") return { data: reclaimData, error: null }
      return { data: existingEvent, error: null }
    },
  }

  return {
    eqCalls,
    updates,
    client: {
      from() {
        mode = "read"
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
    lease: { eventId: "evt_123", receivedAt: "2026-06-18T00:00:00.000Z" },
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
    lease: { eventId: "evt_123", receivedAt: "2026-06-18T00:10:00.000Z" },
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
    lease: { eventId: "evt_123", receivedAt: "2026-06-18T00:10:00.000Z" },
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

const LEASE = { eventId: "evt_123", receivedAt: "2026-07-11T18:29:00.000Z" }

function makeFinalizeClient({
  updateError = null,
  fenceMatched = true,
  currentStatus = null,
  statusReadError = null,
}: {
  updateError?: { message: string } | null
  fenceMatched?: boolean
  currentStatus?: string | null
  statusReadError?: { message: string } | null
} = {}) {
  const updates: Record<string, unknown>[] = []
  const eqCalls: Array<{ column: string; value: unknown }> = []
  let mode: "read" | "update" = "read"

  const query = {
    update(update: Record<string, unknown>) {
      mode = "update"
      updates.push(update)
      return this
    },
    eq(column: string, value: unknown) {
      eqCalls.push({ column, value })
      return this
    },
    select() {
      return this
    },
    async maybeSingle() {
      if (mode === "update") {
        return {
          data: !updateError && fenceMatched ? { event_id: LEASE.eventId } : null,
          error: updateError,
        }
      }
      return {
        data: statusReadError || !currentStatus ? null : { status: currentStatus },
        error: statusReadError,
      }
    },
  }

  return {
    updates,
    eqCalls,
    client: {
      from(table: string) {
        mode = "read"
        assert.equal(table, "stripe_webhook_events")
        return query
      },
    } as never,
  }
}

test("finalizeWebhookEvent marks processed inside the lease fence", async () => {
  const { client, updates, eqCalls } = makeFinalizeClient()
  const processedAt = new Date("2026-07-11T18:30:00.000Z")

  const result = await finalizeWebhookEvent(
    client,
    LEASE,
    { status: "processed" },
    { now: () => processedAt },
  )

  assert.equal(result, null)
  assert.deepEqual(updates, [{
    status: "processed",
    processed_at: "2026-07-11T18:30:00.000Z",
    error: null,
  }])
  assert.deepEqual(eqCalls, [
    { column: "event_id", value: "evt_123" },
    { column: "status", value: "processing" },
    { column: "received_at", value: "2026-07-11T18:29:00.000Z" },
  ])
})

test("finalizeWebhookEvent marks failed with the processing error message", async () => {
  const { client, updates, eqCalls } = makeFinalizeClient()

  const result = await finalizeWebhookEvent(client, LEASE, {
    status: "failed",
    error: new Error("subscription sync failed"),
  })

  assert.equal(result, null)
  assert.deepEqual(updates, [{
    status: "failed",
    error: "subscription sync failed",
  }])
  assert.deepEqual(eqCalls, [
    { column: "event_id", value: "evt_123" },
    { column: "status", value: "processing" },
    { column: "received_at", value: "2026-07-11T18:29:00.000Z" },
  ])
})

test("finalizeWebhookEvent returns the database error without throwing", async () => {
  const { client, updates } = makeFinalizeClient({ updateError: { message: "write timed out" } })
  const processingError = new Error("subscription sync failed")

  const result = await finalizeWebhookEvent(client, LEASE, {
    status: "failed",
    error: processingError,
  })

  assert.match(result?.message ?? "", /Failed to mark Stripe event failed: write timed out/)
  assert.equal(processingError.message, "subscription sync failed")
  assert.equal(updates[0].error, "subscription sync failed")
})

test("finalizeWebhookEvent reports a lost lease when another worker reclaimed", async () => {
  const { client } = makeFinalizeClient({ fenceMatched: false, currentStatus: "processing" })

  const result = await finalizeWebhookEvent(client, LEASE, { status: "processed" })

  assert.ok(result instanceof WebhookLeaseLostError)
  assert.match(result.message, /lease was lost \(event is now 'processing'\)/)
})

test("finalizeWebhookEvent reports a missing row as a plain error", async () => {
  const { client } = makeFinalizeClient({ fenceMatched: false })

  const result = await finalizeWebhookEvent(client, LEASE, { status: "processed" })

  assert.ok(result instanceof Error)
  assert.ok(!(result instanceof WebhookLeaseLostError))
  assert.match(result.message, /event row was not found/)
})

test("finalizeWebhookEvent surfaces a failed status read after a fence miss", async () => {
  const { client } = makeFinalizeClient({
    fenceMatched: false,
    statusReadError: { message: "read timed out" },
  })

  const result = await finalizeWebhookEvent(client, LEASE, { status: "failed", error: "boom" })

  assert.ok(!(result instanceof WebhookLeaseLostError))
  assert.match(result?.message ?? "", /status read failed: read timed out/)
})

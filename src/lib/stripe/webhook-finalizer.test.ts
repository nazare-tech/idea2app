import test from "node:test"
import assert from "node:assert/strict"

import {
  markWebhookEventProcessed,
  tryMarkWebhookEventFailed,
} from "@/lib/stripe/webhook-finalizer"

function makeUpdateClient(
  updateError: { message: string } | null = null,
  rowFound = true,
) {
  const updates: Record<string, unknown>[] = []
  const eqCalls: Array<{ column: string; value: unknown }> = []
  const selectCalls: string[] = []

  const query = {
    update(update: Record<string, unknown>) {
      updates.push(update)
      return this
    },
    eq(column: string, value: unknown) {
      eqCalls.push({ column, value })
      return this
    },
    select(columns: string) {
      selectCalls.push(columns)
      return this
    },
    async maybeSingle() {
      return {
        data: rowFound ? { event_id: "matched" } : null,
        error: updateError,
      }
    },
  }

  return {
    updates,
    eqCalls,
    selectCalls,
    client: {
      from(table: string) {
        assert.equal(table, "stripe_webhook_events")
        return query
      },
    } as never,
  }
}

test("markWebhookEventProcessed writes completion fields for the event", async () => {
  const { client, updates, eqCalls, selectCalls } = makeUpdateClient()
  const processedAt = new Date("2026-07-11T18:30:00.000Z")

  await markWebhookEventProcessed(client, "evt_processed", "2026-07-11T18:29:00.000Z", {
    now: () => processedAt,
  })

  assert.deepEqual(updates, [{
    status: "processed",
    processed_at: "2026-07-11T18:30:00.000Z",
    error: null,
  }])
  assert.deepEqual(eqCalls, [
    { column: "event_id", value: "evt_processed" },
    { column: "status", value: "processing" },
    { column: "received_at", value: "2026-07-11T18:29:00.000Z" },
  ])
  assert.deepEqual(selectCalls, ["event_id"])
})

test("markWebhookEventProcessed throws when the status write fails", async () => {
  const { client } = makeUpdateClient({ message: "database unavailable" })

  await assert.rejects(
    markWebhookEventProcessed(client, "evt_processed", "2026-07-11T18:29:00.000Z"),
    /Failed to mark Stripe event processed: database unavailable/,
  )
})

test("markWebhookEventProcessed throws when no durable event row was updated", async () => {
  const { client } = makeUpdateClient(null, false)

  await assert.rejects(
    markWebhookEventProcessed(client, "evt_missing", "2026-07-11T18:29:00.000Z"),
    /Failed to mark Stripe event processed: event row was not found/,
  )
})

test("tryMarkWebhookEventFailed writes the processing error for the event", async () => {
  const { client, updates, eqCalls } = makeUpdateClient()

  const writeError = await tryMarkWebhookEventFailed(
    client,
    "evt_failed",
    "2026-07-11T18:29:00.000Z",
    new Error("subscription sync failed"),
  )

  assert.equal(writeError, null)
  assert.deepEqual(updates, [{
    status: "failed",
    error: "subscription sync failed",
  }])
  assert.deepEqual(eqCalls, [
    { column: "event_id", value: "evt_failed" },
    { column: "status", value: "processing" },
    { column: "received_at", value: "2026-07-11T18:29:00.000Z" },
  ])
})

test("tryMarkWebhookEventFailed reports status-write failure without replacing processing error", async () => {
  const { client, updates } = makeUpdateClient({ message: "write timed out" })
  const processingError = new Error("subscription sync failed")

  const writeError = await tryMarkWebhookEventFailed(
    client,
    "evt_failed",
    "2026-07-11T18:29:00.000Z",
    processingError,
  )

  assert.match(writeError?.message ?? "", /Failed to mark Stripe event failed: write timed out/)
  assert.equal(processingError.message, "subscription sync failed")
  assert.equal(updates[0].error, "subscription sync failed")
})

test("tryMarkWebhookEventFailed reports when no durable event row was updated", async () => {
  const { client } = makeUpdateClient(null, false)

  const writeError = await tryMarkWebhookEventFailed(
    client,
    "evt_missing",
    "2026-07-11T18:29:00.000Z",
    new Error("subscription sync failed"),
  )

  assert.match(writeError?.message ?? "", /event row was not found/)
})

import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import type { Database } from "@/types/database"

type AdminClient = SupabaseClient<Database>
type ClaimableStripeEvent = Pick<Stripe.Event, "id" | "type" | "livemode">

export const WEBHOOK_PROCESSING_RETRY_AFTER_MS = 5 * 60 * 1000

/**
 * Ownership token for one processing attempt. Finalization only lands while
 * the event row still carries this exact `received_at` lease and is still
 * `processing`, so a stale worker can never overwrite a reclaimed event.
 */
export interface WebhookLease {
  eventId: string
  receivedAt: string
}

export type WebhookClaim =
  | { shouldProcess: true; retrying: boolean; lease: WebhookLease }
  | { shouldProcess: false; reason: "processed" | "processing" }

export type WebhookOutcome =
  | { status: "processed" }
  | { status: "failed"; error: unknown }

/**
 * The fence did not match because another worker legitimately reclaimed the
 * event after the stale-lease window. Expected under the model; callers
 * should log at warn rather than error.
 */
export class WebhookLeaseLostError extends Error {}

export async function claimWebhookEvent(
  supabase: AdminClient,
  event: ClaimableStripeEvent,
  options: { nowMs?: () => number } = {},
): Promise<WebhookClaim> {
  const nowMs = options.nowMs ?? Date.now
  const { data: insertedEvent, error: insertError } = await supabase
    .from("stripe_webhook_events")
    .insert({
      event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      status: "processing",
    })
    .select("received_at")
    .single()

  if (!insertError) {
    return {
      shouldProcess: true,
      retrying: false,
      lease: { eventId: event.id, receivedAt: insertedEvent.received_at },
    }
  }

  if (insertError.code !== "23505") {
    throw new Error(`Failed to claim Stripe event: ${insertError.message}`)
  }

  const { data: existingEvent, error: existingError } = await supabase
    .from("stripe_webhook_events")
    .select("status, received_at")
    .eq("event_id", event.id)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to read existing Stripe event claim: ${existingError.message}`)
  }

  if (!existingEvent || existingEvent.status === "processed") {
    return { shouldProcess: false, reason: "processed" }
  }

  const receivedAt = Date.parse(existingEvent.received_at)
  const isStaleProcessing =
    existingEvent.status === "processing" &&
    Number.isFinite(receivedAt) &&
    nowMs() - receivedAt > WEBHOOK_PROCESSING_RETRY_AFTER_MS

  if (existingEvent.status !== "failed" && !isStaleProcessing) {
    return { shouldProcess: false, reason: "processing" }
  }

  let reclaimQuery = supabase
    .from("stripe_webhook_events")
    .update({
      event_type: event.type,
      livemode: event.livemode,
      status: "processing",
      error: null,
      received_at: new Date(nowMs()).toISOString(),
      processed_at: null,
    })
    .eq("event_id", event.id)
    .eq("status", existingEvent.status)

  if (existingEvent.status === "processing") {
    reclaimQuery = reclaimQuery.eq("received_at", existingEvent.received_at)
  }

  const { data: reclaimedEvent, error: reclaimError } = await reclaimQuery
    .select("received_at")
    .maybeSingle()

  if (reclaimError) {
    throw new Error(`Failed to reclaim Stripe event: ${reclaimError.message}`)
  }

  if (!reclaimedEvent) {
    return { shouldProcess: false, reason: "processing" }
  }

  return {
    shouldProcess: true,
    retrying: true,
    lease: { eventId: event.id, receivedAt: reclaimedEvent.received_at },
  }
}

/**
 * Redeem the lease: flip the event row to its terminal status. Returns null
 * on success, a WebhookLeaseLostError when another worker reclaimed the
 * event, or a plain Error for database failures and missing rows. Never
 * throws, so callers decide per outcome whether a write failure is fatal.
 */
export async function finalizeWebhookEvent(
  supabase: AdminClient,
  lease: WebhookLease,
  outcome: WebhookOutcome,
  options: { now?: () => Date } = {},
): Promise<Error | null> {
  const now = options.now ?? (() => new Date())
  const update =
    outcome.status === "processed"
      ? { status: "processed", processed_at: now().toISOString(), error: null }
      : {
          status: "failed",
          error:
            outcome.error instanceof Error ? outcome.error.message : String(outcome.error),
        }

  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .update(update)
    .eq("event_id", lease.eventId)
    .eq("status", "processing")
    .eq("received_at", lease.receivedAt)
    .select("event_id")
    .maybeSingle()

  if (error) {
    return new Error(`Failed to mark Stripe event ${outcome.status}: ${error.message}`)
  }
  if (data?.event_id) {
    return null
  }
  return describeLostFence(supabase, lease, outcome.status)
}

async function describeLostFence(
  supabase: AdminClient,
  lease: WebhookLease,
  status: WebhookOutcome["status"],
): Promise<Error> {
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("status")
    .eq("event_id", lease.eventId)
    .maybeSingle()

  if (error) {
    return new Error(
      `Failed to mark Stripe event ${status}: lease fence did not match and status read failed: ${error.message}`,
    )
  }
  if (data?.status) {
    return new WebhookLeaseLostError(
      `Failed to mark Stripe event ${status}: lease was lost (event is now '${data.status}')`,
    )
  }
  return new Error(`Failed to mark Stripe event ${status}: event row was not found`)
}

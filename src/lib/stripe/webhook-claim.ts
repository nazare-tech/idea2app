import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import type { Database } from "@/types/database"

type AdminClient = SupabaseClient<Database>
type ClaimableStripeEvent = Pick<Stripe.Event, "id" | "type" | "livemode">

export const WEBHOOK_PROCESSING_RETRY_AFTER_MS = 5 * 60 * 1000

export type WebhookClaim =
  | { shouldProcess: true; retrying: boolean; receivedAt: string }
  | { shouldProcess: false; reason: "processed" | "processing" }

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
    .maybeSingle()

  if (!insertError) {
    if (!insertedEvent?.received_at) {
      throw new Error("Failed to claim Stripe event: inserted claim has no lease timestamp")
    }
    return { shouldProcess: true, retrying: false, receivedAt: insertedEvent.received_at }
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

  const receivedAt = Date.parse(String(existingEvent.received_at ?? ""))
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
    .select("event_id, received_at")
    .maybeSingle()

  if (reclaimError) {
    throw new Error(`Failed to reclaim Stripe event: ${reclaimError.message}`)
  }

  if (!reclaimedEvent) {
    return { shouldProcess: false, reason: "processing" }
  }

  if (!reclaimedEvent.received_at) {
    throw new Error("Failed to reclaim Stripe event: reclaimed claim has no lease timestamp")
  }

  return { shouldProcess: true, retrying: true, receivedAt: reclaimedEvent.received_at }
}

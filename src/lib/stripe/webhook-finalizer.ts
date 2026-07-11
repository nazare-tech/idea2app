import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

type AdminClient = SupabaseClient<Database>

function webhookStatusWriteError(status: "processed" | "failed", message: string) {
  return new Error(`Failed to mark Stripe event ${status}: ${message}`)
}

export async function markWebhookEventProcessed(
  supabase: AdminClient,
  eventId: string,
  claimReceivedAt: string,
  options: { now?: () => Date } = {},
): Promise<void> {
  const now = options.now ?? (() => new Date())
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .update({
      status: "processed",
      processed_at: now().toISOString(),
      error: null,
    })
    .eq("event_id", eventId)
    .eq("status", "processing")
    .eq("received_at", claimReceivedAt)
    .select("event_id")
    .maybeSingle()

  if (error) {
    throw webhookStatusWriteError("processed", error.message)
  }
  if (!data?.event_id) {
    throw webhookStatusWriteError("processed", "event row was not found")
  }
}

export async function tryMarkWebhookEventFailed(
  supabase: AdminClient,
  eventId: string,
  claimReceivedAt: string,
  processingError: unknown,
): Promise<Error | null> {
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .update({
      status: "failed",
      error: processingError instanceof Error ? processingError.message : String(processingError),
    })
    .eq("event_id", eventId)
    .eq("status", "processing")
    .eq("received_at", claimReceivedAt)
    .select("event_id")
    .maybeSingle()

  if (error) return webhookStatusWriteError("failed", error.message)
  return data?.event_id
    ? null
    : webhookStatusWriteError("failed", "event row was not found")
}

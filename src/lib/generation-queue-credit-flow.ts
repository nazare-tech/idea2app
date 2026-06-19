import type { SupabaseClient } from "@supabase/supabase-js"

import { refundGenerationQueueItemCredits } from "@/lib/generation-queue-billing"
import type { GenerationQueueItemRow } from "@/lib/generation-queue-service"
import type { Database } from "@/types/database"

type ServerSupabaseClient = SupabaseClient<Database>

type QueueCreditItem = Pick<
  GenerationQueueItemRow,
  "user_id" | "credit_cost" | "credit_status" | "doc_type" | "label"
>

export async function consumeGenerationQueueItemCredits({
  supabase,
  userId,
  amount,
  action,
  label,
  projectName,
}: {
  supabase: ServerSupabaseClient
  userId: string
  amount: number
  action: string
  label: string
  projectName: string
}) {
  const { data: consumed, error } = await supabase.rpc("consume_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_action: action,
    p_description: `${label} for "${projectName}" (Generate All)`,
  })

  return {
    consumed: Boolean(consumed),
    errorMessage: error ? "Credit check failed" : consumed ? null : "Insufficient credits",
  }
}

export async function resolveFailedGenerationCreditStatus({
  billingSupabase,
  item,
  creditCost,
  charged,
  wasCancelled,
  refundItemCredits = refundGenerationQueueItemCredits,
  logRefundError,
}: {
  billingSupabase: ServerSupabaseClient
  item: QueueCreditItem
  creditCost: number
  charged: boolean
  wasCancelled: boolean
  refundItemCredits?: typeof refundGenerationQueueItemCredits
  logRefundError?: (error: unknown) => void
}) {
  if (!charged) {
    return item.credit_status
  }

  const refund = await refundItemCredits(
    billingSupabase,
    { ...item, credit_cost: creditCost },
    wasCancelled
      ? `${item.label} cancelled: credits refunded (Generate All)`
      : `${item.label} failed: credits refunded (Generate All)`,
  )

  if (refund.error) {
    logRefundError?.(refund.error)
  }

  return refund.refunded ? "refunded" : "refund_failed"
}

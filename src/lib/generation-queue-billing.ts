import type { SupabaseClient } from "@supabase/supabase-js"

import { refundCreditsServerSide } from "@/lib/credits"
import type { GenerationQueueItemRow } from "@/lib/generation-queue-service"
import { GENERATE_ALL_ACTION_MAP } from "@/lib/token-economics"
import type { Database } from "@/types/database"

type ServerSupabaseClient = SupabaseClient<Database>

export async function refundGenerationQueueItemCredits(
  _supabase: ServerSupabaseClient,
  item: Pick<GenerationQueueItemRow, "user_id" | "credit_cost" | "doc_type" | "label">,
  description: string,
) {
  if (item.credit_cost <= 0) {
    return { refunded: false, error: null }
  }

  const action =
    GENERATE_ALL_ACTION_MAP[item.doc_type as keyof typeof GENERATE_ALL_ACTION_MAP] ??
    item.doc_type

  const refund = await refundCreditsServerSide({
    userId: item.user_id,
    amount: item.credit_cost,
    action,
    description,
  })

  if (refund.error) {
    return {
      refunded: false,
      error: refund.error,
    }
  }

  return { refunded: true, error: null }
}

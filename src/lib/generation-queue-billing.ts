import type { SupabaseClient } from "@supabase/supabase-js"

import type { GenerationQueueItemRow } from "@/lib/generation-queue-service"
import { GENERATE_ALL_ACTION_MAP } from "@/lib/token-economics"
import type { Database } from "@/types/database"

type ServerSupabaseClient = SupabaseClient<Database>

export async function refundGenerationQueueItemCredits(
  supabase: ServerSupabaseClient,
  item: Pick<GenerationQueueItemRow, "user_id" | "credit_cost" | "doc_type" | "label">,
  description: string,
) {
  if (item.credit_cost <= 0) {
    return { refunded: false, error: null }
  }

  const action =
    GENERATE_ALL_ACTION_MAP[item.doc_type as keyof typeof GENERATE_ALL_ACTION_MAP] ??
    item.doc_type

  // The local Database type can lag behind RPC migrations, so call through a
  // narrow cast while still checking the returned Supabase error explicitly.
  const { error } = await (supabase.rpc as unknown as (
    fn: "refund_credits",
    args: {
      p_user_id: string
      p_amount: number
      p_action: string
      p_description: string
    },
  ) => Promise<{ data: unknown; error: { message?: string } | null }>)("refund_credits", {
    p_user_id: item.user_id,
    p_amount: item.credit_cost,
    p_action: action,
    p_description: description,
  })

  if (error) {
    return {
      refunded: false,
      error: error.message ?? "Refund failed",
    }
  }

  return { refunded: true, error: null }
}

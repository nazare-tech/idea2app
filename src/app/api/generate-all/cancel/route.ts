import { NextResponse } from "next/server"
import { refundGenerationQueueItemCredits } from "@/lib/generation-queue-billing"
import {
  getGenerationQueueItems,
  syncGenerationQueueJson,
  updateGenerationQueueItem,
  type GenerationQueueItemRow,
} from "@/lib/generation-queue-service"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const queueSupabase = createServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
    }

    // Fetch current queue to update item statuses
    const { data: existing } = await queueSupabase
      .from("generation_queues")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "No active queue found" }, { status: 404 })
    }

    const existingItems = await getGenerationQueueItems(queueSupabase, existing)
    const completedAt = new Date().toISOString()
    const updatedItems = await Promise.all(
      existingItems
        .filter((item) => item.status === "pending" || item.status === "generating")
        .map((item) => cancelQueueItem(supabase, queueSupabase, item, completedAt)),
    )

    const { data, error } = await queueSupabase
      .from("generation_queues")
      .update({
        status: "cancelled",
        completed_at: completedAt,
      })
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await syncGenerationQueueJson(
      queueSupabase,
      data,
      existingItems.map((item) => updatedItems.find((updated) => updated.id === item.id) ?? item),
      { status: "cancelled", completed_at: completedAt },
    )

    const { data: refreshed } = await queueSupabase
      .from("generation_queues")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({ queue: refreshed ?? data })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function cancelQueueItem(
  billingSupabase: Awaited<ReturnType<typeof createClient>>,
  queueSupabase: ReturnType<typeof createServiceClient>,
  item: GenerationQueueItemRow,
  completedAt: string,
) {
  if (item.status === "generating") {
    return updateGenerationQueueItem(queueSupabase, item, {
      stage_message: "Cancelling after current step...",
    })
  }

  const update: Parameters<typeof updateGenerationQueueItem>[2] = {
    status: "cancelled",
    stage_message: null,
    completed_at: completedAt,
  }

  if (item.credit_status === "charged" && item.credit_cost > 0) {
    const refund = await refundGenerationQueueItemCredits(
      billingSupabase,
      item,
      `${item.label} cancelled: credits refunded (Generate All)`,
    )
    if (refund.error) {
      console.error("[GenerateAll] Credit refund on cancellation failed:", refund.error)
    }
    update.credit_status = refund.refunded ? "refunded" : "refund_failed"
  }

  return updateGenerationQueueItem(queueSupabase, item, update)
}

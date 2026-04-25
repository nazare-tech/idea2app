import { NextResponse } from "next/server"
import {
  computeQueueStatus,
  getGenerationQueueItems,
  queueItemRowToJson,
  recoverStaleGenerationQueueItems,
  syncGenerationQueueJson,
  type GenerationQueueItemRow,
} from "@/lib/generation-queue-service"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
    }

    const queueSupabase = createServiceClient()
    const { data, error } = await queueSupabase
      .from("generation_queues")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ queue: null })
    }

    let items = await getGenerationQueueItems(queueSupabase, data)
    const recoveredItems =
      data.status === "running" || data.status === "queued"
        ? await recoverStaleGenerationQueueItems(queueSupabase, items)
        : []
    if (recoveredItems.length > 0) {
      items = items.map((item) => recoveredItems.find((updated) => updated.id === item.id) ?? item)
      await syncGenerationQueueJson(queueSupabase, data, items, {
        status: "running",
        completed_at: null,
        error_info: null,
      })
    }
    const queue = items.map(queueItemRowToJson)
    const currentIndex = queue.findIndex(
      (item) => item.status === "pending" || item.status === "generating",
    )
    const status = data.status === "cancelled" ? "cancelled" : computeQueueStatus(items)

    return NextResponse.json({
      queue: {
        ...data,
        queue,
        current_index: currentIndex === -1 ? queue.length : currentIndex,
        status,
        error_info:
          status === "error" || status === "partial"
            ? buildErrorInfo(items) ?? data.error_info
            : data.error_info,
        needs_execute: recoveredItems.length > 0,
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function buildErrorInfo(items: GenerationQueueItemRow[]) {
  const failed = items.find((item) => item.status === "error" || item.status === "blocked")
  return failed
    ? { message: failed.error ?? "Generation did not complete", docType: failed.doc_type }
    : null
}

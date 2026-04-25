import { NextResponse } from "next/server"

import {
  computeQueueStatus,
  getGenerationQueueItems,
  parseQueueJson,
  queueItemRowToJson,
  syncGenerationQueueJson,
  type GenerationQueueItemRow,
  type GenerationQueueStatus,
} from "@/lib/generation-queue-service"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { Json } from "@/types/database"

const TERMINAL_STATUSES: GenerationQueueStatus[] = [
  "partial",
  "completed",
  "cancelled",
  "error",
]

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, ...updates } = body

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
    }

    const requestedStatus = normalizeQueueStatus(updates.status)
    const hasQueueUpdate = "queue" in updates
    if (!hasQueueUpdate && !requestedStatus && !("completed_at" in updates)) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    if (requestedStatus === "cancelled") {
      return NextResponse.json(
        { error: "Use /api/generate-all/cancel to cancel generation" },
        { status: 400 },
      )
    }

    const queueSupabase = createServiceClient()
    const { data: existing, error: fetchError } = await supabase
      .from("generation_queues")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: "No active queue found" }, { status: 404 })
    }

    const items = await getGenerationQueueItems(queueSupabase, existing)

    if (hasQueueUpdate) {
      const incomingQueue = parseQueueJson(updates.queue as Json)
      if (incomingQueue.length === 0) {
        return NextResponse.json({ error: "queue must include at least one valid document" }, { status: 400 })
      }
    }

    const computedStatus = computeQueueStatus(items)
    const status = computedStatus
    const completedAt = TERMINAL_STATUSES.includes(status)
      ? normalizeCompletedAt(updates.completed_at)
      : null

    await syncGenerationQueueJson(queueSupabase, existing, items, {
      status,
      completed_at: completedAt,
      error_info:
        status === "error" || status === "partial"
          ? buildErrorInfo(items)
          : null,
    })

    const { data, error } = await queueSupabase
      .from("generation_queues")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const queue = items.map(queueItemRowToJson)
    const currentIndex = queue.findIndex(
      (item) => item.status === "pending" || item.status === "generating",
    )

    return NextResponse.json({
      queue: {
        ...data,
        queue,
        current_index: currentIndex === -1 ? queue.length : currentIndex,
        status,
        completed_at: completedAt,
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function normalizeQueueStatus(value: unknown): GenerationQueueStatus | null {
  if (
    value === "queued" ||
    value === "running" ||
    value === "partial" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "error"
  ) {
    return value
  }

  return null
}

function normalizeCompletedAt(value: unknown) {
  return typeof value === "string" && value.length > 0
    ? value
    : new Date().toISOString()
}

function buildErrorInfo(items: GenerationQueueItemRow[]) {
  const failed = items.find((item) => item.status === "error" || item.status === "blocked")
  return failed
    ? { message: failed.error ?? "Generation did not complete", docType: failed.doc_type }
    : null
}

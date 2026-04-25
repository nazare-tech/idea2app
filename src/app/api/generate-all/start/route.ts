import { NextResponse } from "next/server"
import {
  buildManualGenerationQueue,
  getGenerationQueueItems,
  parseQueueJson,
  replaceGenerationQueueItems,
  resetGenerationQueueItemsForRetry,
  syncGenerationQueueJson,
} from "@/lib/generation-queue-service"
import {
  ONBOARDING_GENERATION_SOURCE,
  isOnboardingGenerationQueue,
} from "@/lib/onboarding-generation"
import { createGenerationRunId } from "@/lib/queue-run-id"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { Json } from "@/types/database"

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
    const { projectId, queue } = body

    if (!projectId || !queue) {
      return NextResponse.json(
        { error: "projectId and queue are required" },
        { status: 400 },
      )
    }

    const manualQueue = buildManualGenerationQueue(parseQueueJson(queue as Json))
    if (manualQueue.length === 0) {
      return NextResponse.json({ error: "queue must include at least one valid document" }, { status: 400 })
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { data: existingQueue } = await queueSupabase
      .from("generation_queues")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (
      existingQueue &&
      (existingQueue.status === "queued" || existingQueue.status === "running")
    ) {
      const error = isOnboardingGenerationQueue(existingQueue)
        ? "Project generation is already running"
        : "Generate All is already running"
      return NextResponse.json(
        { error },
        { status: 409 },
      )
    }

    if (
      existingQueue &&
      isOnboardingGenerationQueue(existingQueue) &&
      (existingQueue.status === "partial" ||
        existingQueue.status === "error" ||
        existingQueue.status === "cancelled")
    ) {
      const existingItems = await getGenerationQueueItems(queueSupabase, existingQueue)
      const resetItems = await resetGenerationQueueItemsForRetry(queueSupabase, existingItems, {
        source: ONBOARDING_GENERATION_SOURCE,
        creditStatus: "not_charged",
        creditCost: 0,
        maxAttempts: 2,
      })
      const nextItems = existingItems.map(
        (item) => resetItems.find((updated) => updated.id === item.id) ?? item,
      )
      await syncGenerationQueueJson(queueSupabase, existingQueue, nextItems, {
        status: "running",
        started_at: new Date().toISOString(),
        completed_at: null,
        error_info: null,
      })

      const { data: resumedQueue } = await queueSupabase
        .from("generation_queues")
        .select("*")
        .eq("id", existingQueue.id)
        .eq("user_id", user.id)
        .single()

      return NextResponse.json({ queue: resumedQueue ?? existingQueue })
    }

    const runId = createGenerationRunId("manual")

    // Upsert: replace any existing queue for this project+user
    const { data, error } = await queueSupabase
      .from("generation_queues")
      .upsert(
        {
          project_id: projectId,
          user_id: user.id,
          status: "running",
          queue: manualQueue as unknown as Json,
          current_index: 0,
          model_selections: {
            mode: "manual",
            source: "manual",
            runId,
            createdAt: new Date().toISOString(),
          },
          started_at: new Date().toISOString(),
          completed_at: null,
          error_info: null,
        },
        { onConflict: "project_id,user_id" },
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await replaceGenerationQueueItems(queueSupabase, data, manualQueue)
    } catch (itemError) {
      console.error("[generate-all/start] queue item insert failed:", itemError)
      await queueSupabase
        .from("generation_queues")
        .update({
          status: "error",
          completed_at: new Date().toISOString(),
          error_info: { message: "Failed to start generation queue" },
        })
        .eq("id", data.id)
        .eq("user_id", user.id)
      return NextResponse.json({ error: "Failed to start generation queue" }, { status: 500 })
    }

    return NextResponse.json({ queue: data })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

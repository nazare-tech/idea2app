import { NextResponse } from "next/server"
import {
  buildManualGenerationQueue,
  getGenerationQueueItems,
  parseQueueJson,
  replaceGenerationQueueItems,
  resetGenerationQueueItemsForRetry,
  syncGenerationQueueJson,
} from "@/lib/generation/queue-service"
import {
  ONBOARDING_GENERATION_SOURCE,
  isOnboardingGenerationQueue,
} from "@/lib/generation/onboarding"
import { createGenerationRunId } from "@/lib/generation/queue-run-id"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { Json } from "@/types/database"
import {
  findLatestActiveDocument,
  getActiveDocumentIdentityForDocumentType,
} from "@/lib/active-document-policy"
import { buildRequestLogContext, logError, logInfo, logWarn } from "@/lib/logger"

export async function POST(request: Request) {
  const requestLogContext = buildRequestLogContext(request)
  try {
    const supabase = await createClient()
    const queueSupabase = createServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logWarn("GenerateAllStart", "unauthorized", requestLogContext)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userLogContext = { ...requestLogContext, userId: user.id }
    const body = await request.json()
    const { projectId, queue } = body
    const queueLogContext = { ...userLogContext, projectId }

    if (!projectId || !queue) {
      logWarn("GenerateAllStart", "validation_failed", {
        ...queueLogContext,
        hasProjectId: Boolean(projectId),
        hasQueue: Boolean(queue),
      })
      return NextResponse.json(
        { error: "projectId and queue are required" },
        { status: 400 },
      )
    }

    const manualQueue = buildManualGenerationQueue(parseQueueJson(queue as Json))
    if (manualQueue.length === 0) {
      logWarn("GenerateAllStart", "empty_queue", queueLogContext)
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
      logWarn("GenerateAllStart", "project_not_found", queueLogContext)
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
      logWarn("GenerateAllStart", "queue_already_running", {
        ...queueLogContext,
        queueId: existingQueue.id,
        queueStatus: existingQueue.status,
      })
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
      logInfo("GenerateAllStart", "onboarding_queue_resumed", {
        ...queueLogContext,
        queueId: existingQueue.id,
        resetItemCount: resetItems.length,
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
    const queueWithExistingSkipped = await Promise.all(
      manualQueue.map(async (item) => {
        const identity = getActiveDocumentIdentityForDocumentType(item.docType)
        if (!identity) return item
        const existing = await findLatestActiveDocument(queueSupabase, projectId, identity)
        if (!existing) return item
        return {
          ...item,
          status: "skipped" as const,
          creditCost: 0,
          creditStatus: "not_charged",
          outputTable: existing.outputTable,
          outputId: existing.outputId,
          completedAt: new Date().toISOString(),
        }
      }),
    )

    // Upsert: replace any existing queue for this project+user
    const { data, error } = await queueSupabase
      .from("generation_queues")
      .upsert(
        {
          project_id: projectId,
          user_id: user.id,
          status: "running",
          queue: queueWithExistingSkipped as unknown as Json,
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
      logError("GenerateAllStart", "queue_upsert_failed", error, {
        ...queueLogContext,
        runId,
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await replaceGenerationQueueItems(queueSupabase, data, queueWithExistingSkipped)
    } catch (itemError) {
      logError("GenerateAllStart", "queue_items_replace_failed", itemError, {
        ...queueLogContext,
        queueId: data.id,
        runId,
        itemCount: queueWithExistingSkipped.length,
      })
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

    logInfo("GenerateAllStart", "queue_started", {
      ...queueLogContext,
      queueId: data.id,
      runId,
      itemCount: queueWithExistingSkipped.length,
      skippedExistingCount: queueWithExistingSkipped.filter((item) => item.status === "skipped").length,
    })
    return NextResponse.json({ queue: data })
  } catch (error) {
    logError("GenerateAllStart", "request_failed", error, requestLogContext)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

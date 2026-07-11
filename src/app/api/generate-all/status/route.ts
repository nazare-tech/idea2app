import { NextResponse } from "next/server"
import { refundGenerationQueueItemCredits } from "@/lib/generation/queue-billing"
import {
  computeQueueStatus,
  getGenerationQueueItems,
  queueItemRowToJson,
  recoverStaleGenerationQueueItems,
  syncGenerationQueueJson,
  updateGenerationQueueItemIfStatus,
  type GenerationQueueItemRow,
} from "@/lib/generation/queue-service"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { buildRequestLogContext, logError, logInfo, logWarn } from "@/lib/logger"
import { isPlanningTextDocType, type PlanningTextDocType } from "@/lib/document-definitions"

export async function GET(request: Request) {
  const requestLogContext = buildRequestLogContext(request)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logWarn("GenerateAllStatus", "unauthorized", requestLogContext)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      logWarn("GenerateAllStatus", "validation_failed", { ...requestLogContext, userId: user.id })
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
    }
    const queueLogContext = { ...requestLogContext, userId: user.id, projectId }

    const queueSupabase = createServiceClient()
    const { data, error } = await queueSupabase
      .from("generation_queues")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      logError("GenerateAllStatus", "queue_lookup_failed", error, queueLogContext)
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
      logWarn("GenerateAllStatus", "stale_items_recovered", {
        ...queueLogContext,
        queueId: data.id,
        recoveredCount: recoveredItems.length,
      })
      items = items.map((item) => recoveredItems.find((updated) => updated.id === item.id) ?? item)
      await syncGenerationQueueJson(queueSupabase, data, items, {
        status: "running",
        completed_at: null,
        error_info: null,
      })
    }

    if (data.status === "cancelled") {
      const finalizedItems = await finalizeStaleCancelledItems(supabase, queueSupabase, items)
      if (finalizedItems.length > 0) {
        logInfo("GenerateAllStatus", "stale_cancelled_items_finalized", {
          ...queueLogContext,
          queueId: data.id,
          finalizedCount: finalizedItems.length,
        })
        items = items.map((item) => finalizedItems.find((updated) => updated.id === item.id) ?? item)
        await syncGenerationQueueJson(queueSupabase, data, items, {
          status: "cancelled",
          completed_at: data.completed_at ?? new Date().toISOString(),
        })
      }
    }
    const queue = items.map(queueItemRowToJson)
    const currentIndex = queue.findIndex(
      (item) => item.status === "pending" || item.status === "generating",
    )
    const status = data.status === "cancelled" ? "cancelled" : computeQueueStatus(items)

    // Live streaming preview: partial markdown persisted by the executor
    // while a text planning document (Market Research, Product Plan, First
    // Version Plan) is actively generating. The dependency chain means at
    // most one of them streams at a time. Kept out of the legacy queue JSON
    // so the large text never syncs into generation_queues.queue.
    const streamingItem = items.find(
      (item) =>
        isPlanningTextDocType(item.doc_type) &&
        item.status === "generating" &&
        typeof item.partial_content === "string" &&
        item.partial_content.length > 0,
    )
    const streamingPreview = streamingItem
      ? {
          docType: streamingItem.doc_type as PlanningTextDocType,
          content: streamingItem.partial_content as string,
        }
      : null

    return NextResponse.json({
      streamingPreview,
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
  } catch (error) {
    logError("GenerateAllStatus", "request_failed", error, requestLogContext)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function buildErrorInfo(items: GenerationQueueItemRow[]) {
  const failed = items.find((item) => item.status === "error" || item.status === "blocked")
  return failed
    ? { message: failed.error ?? "Generation did not complete", docType: failed.doc_type }
    : null
}

async function finalizeStaleCancelledItems(
  billingSupabase: Awaited<ReturnType<typeof createClient>>,
  queueSupabase: ReturnType<typeof createServiceClient>,
  items: GenerationQueueItemRow[],
) {
  const staleBefore = Date.now() - 150_000
  const staleGenerating = items.filter((item) => {
    if (item.status !== "generating") return false
    const referenceTime = item.updated_at ?? item.started_at
    if (!referenceTime) return false
    return new Date(referenceTime).getTime() < staleBefore
  })

  if (staleGenerating.length === 0) return []

  return Promise.all(
    staleGenerating.map(async (item) => {
      let creditStatus = item.credit_status
      if (item.credit_status === "charged" && item.credit_cost > 0) {
        const refund = await refundGenerationQueueItemCredits(
          billingSupabase,
          item,
          `${item.label} cancelled after stale generation: credits refunded (Generate All)`,
        )
        if (refund.error) {
          logError("GenerateAllStatus", "stale_cancellation_refund_failed", refund.error, {
            itemId: item.id,
            queueId: item.queue_id,
            docType: item.doc_type,
          })
        }
        creditStatus = refund.refunded ? "refunded" : "refund_failed"
      }

      return updateGenerationQueueItemIfStatus(queueSupabase, item, "generating", {
        status: "cancelled",
        stage_message: null,
        completed_at: new Date().toISOString(),
        credit_status: creditStatus,
      })
    }),
  ).then((updatedItems) =>
    updatedItems.filter((item): item is GenerationQueueItemRow => Boolean(item)),
  )
}

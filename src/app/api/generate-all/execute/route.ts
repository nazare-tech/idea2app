/**
 * /api/generate-all/execute
 *
 * Server-side orchestrator for manual Generate All and onboarding generation.
 * The normalized `generation_queue_items` rows are the source of truth; the
 * legacy `generation_queues.queue` JSON is kept in sync for existing UI.
 */

import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { GENERATE_ALL_DEFAULT_MODELS } from "@/lib/document-definitions"
import { generateProjectDocument } from "@/lib/document-generation-service"
import { refundGenerationQueueItemCredits } from "@/lib/generation-queue-billing"
import {
  claimGenerationQueueItem,
  computeQueueStatus,
  getBlockedItems,
  getGenerationQueueItems,
  getRunMetadata,
  getRunnableItems,
  recoverStaleGenerationQueueItems,
  syncGenerationQueueJson,
  updateGenerationQueueItem,
  updateGenerationQueueItemIfStatus,
  type GenerationQueueItemRow,
  type GenerationQueueRow,
} from "@/lib/generation-queue-service"
import { isOnboardingGenerationQueue } from "@/lib/onboarding-generation"
import { GENERATE_ALL_ACTION_MAP, getTokenCost } from "@/lib/token-economics"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { Database } from "@/types/database"

export const maxDuration = 300

type SB = SupabaseClient<Database>

const MAX_CONCURRENCY = 2

async function fetchQueueRow(supabase: SB, projectId: string, userId: string) {
  const { data } = await supabase
    .from("generation_queues")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single()
  return data
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const queueSupabase = createServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { projectId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { projectId } = body
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const queueRow = await fetchQueueRow(queueSupabase, projectId, user.id)
  if (!queueRow) {
    return NextResponse.json({ error: "No queue found — call /start first" }, { status: 404 })
  }

  if (queueRow.status === "cancelled") {
    return NextResponse.json({ success: true, status: "cancelled" })
  }

  const isOnboardingQueue = isOnboardingGenerationQueue(queueRow)

  await queueSupabase
    .from("generation_queues")
    .update({ status: "running" })
    .eq("id", queueRow.id)
    .eq("user_id", user.id)

  let activeQueueRow: GenerationQueueRow = { ...queueRow, status: "running" }

  while (true) {
    const freshQueueRow = await fetchQueueRow(queueSupabase, projectId, user.id)
    if (!freshQueueRow || freshQueueRow.status === "cancelled") {
      const items = await getGenerationQueueItems(queueSupabase, activeQueueRow)
      const cancelledItems = await Promise.all(
        items
          .filter((item) => item.status === "pending")
          .map((item) =>
            updateGenerationQueueItem(queueSupabase, item, {
              status: "cancelled",
              stage_message: null,
              completed_at: new Date().toISOString(),
            }),
          ),
      )
      const nextItems = mergeUpdatedItems(items, cancelledItems)
      await syncGenerationQueueJson(queueSupabase, activeQueueRow, nextItems, {
        status: "cancelled",
        completed_at: new Date().toISOString(),
      })
      return NextResponse.json({ success: true, status: "cancelled" })
    }

    activeQueueRow = freshQueueRow
    let items = await getGenerationQueueItems(queueSupabase, activeQueueRow)

    const recoveredItems = await recoverStaleGenerationQueueItems(queueSupabase, items)
    if (recoveredItems.length > 0) {
      items = mergeUpdatedItems(items, recoveredItems)
      await syncGenerationQueueJson(queueSupabase, activeQueueRow, items)
    }

    const blockedItems = getBlockedItems(items)
    if (blockedItems.length > 0) {
      const updatedBlocked = await Promise.all(
        blockedItems.map((item) =>
          updateGenerationQueueItem(queueSupabase, item, {
            status: "blocked",
            stage_message: null,
            error: "Blocked by a failed or missing dependency",
            completed_at: new Date().toISOString(),
          }),
        ),
      )
      items = mergeUpdatedItems(items, updatedBlocked)
      await syncGenerationQueueJson(queueSupabase, activeQueueRow, items)
    }

    const runnableItems = getRunnableItems(items, MAX_CONCURRENCY)
    if (runnableItems.length === 0) {
      break
    }

    const updatedItems = await Promise.all(
      runnableItems.map((item) =>
        executeQueueItem({
          billingSupabase: supabase,
          documentSupabase: supabase,
          queueSupabase,
          item,
          queueRow: activeQueueRow,
          project,
          isOnboardingQueue,
        }),
      ),
    )

    items = mergeUpdatedItems(
      await getGenerationQueueItems(queueSupabase, activeQueueRow),
      updatedItems.filter((item): item is GenerationQueueItemRow => Boolean(item)),
    )
    await syncGenerationQueueJson(queueSupabase, activeQueueRow, items)
  }

  const finalItems = await getGenerationQueueItems(queueSupabase, activeQueueRow)
  const finalStatus = computeQueueStatus(finalItems)
  await syncGenerationQueueJson(queueSupabase, activeQueueRow, finalItems, {
    status: finalStatus,
    completed_at: finalStatus === "running" ? null : new Date().toISOString(),
    error_info: buildErrorInfo(finalItems),
  })

  await supabase
    .from("projects")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("user_id", user.id)

  return NextResponse.json({ success: true, status: finalStatus })
}

async function executeQueueItem({
  billingSupabase,
  documentSupabase,
  queueSupabase,
  item,
  queueRow,
  project,
  isOnboardingQueue,
}: {
  billingSupabase: SB
  documentSupabase: SB
  queueSupabase: SB
  item: GenerationQueueItemRow
  queueRow: GenerationQueueRow
  project: { description: string; name: string }
  isOnboardingQueue: boolean
}) {
  const claimed = await claimGenerationQueueItem(queueSupabase, item)
  if (!claimed) return null

  const isBundledItem =
    isOnboardingQueue &&
    claimed.run_id === getQueueRunId(queueRow) &&
    claimed.source === "onboarding"
  const action = GENERATE_ALL_ACTION_MAP[claimed.doc_type]
  const model = claimed.model_id ?? GENERATE_ALL_DEFAULT_MODELS[claimed.doc_type]
  const creditCost = isBundledItem ? 0 : action ? getTokenCost(action, model) : claimed.credit_cost
  const shouldChargeCredits = !isBundledItem && creditCost > 0 && claimed.credit_status !== "charged"
  let charged = claimed.credit_status === "charged"

  if (shouldChargeCredits) {
    const { data: consumed, error: consumeError } = await billingSupabase.rpc("consume_credits", {
      p_user_id: claimed.user_id,
      p_amount: creditCost,
      p_action: action ?? claimed.doc_type,
      p_description: `${claimed.label} for "${project.name}" (Generate All)`,
    })

    if (consumeError || !consumed) {
      return finishGeneratingItem(queueSupabase, claimed, {
        status: "error",
        stage_message: null,
        error: consumeError ? "Credit check failed" : "Insufficient credits",
        completed_at: new Date().toISOString(),
      })
    }

    charged = true
    await updateGenerationQueueItem(queueSupabase, claimed, {
      credit_cost: creditCost,
      credit_status: "charged",
    })
  }

  const maxAttempts = isBundledItem ? Math.max(1, claimed.max_attempts) : 1
  let attempt = claimed.attempt

  while (attempt < maxAttempts) {
    attempt += 1
    await updateGenerationQueueItem(queueSupabase, claimed, {
      attempt,
      stage_message: attempt > 1 ? `Retrying (${attempt}/${maxAttempts})...` : "Generating...",
    })

    try {
      if (await isQueueCancelled(queueSupabase, claimed)) {
        return cancelClaimedItemAfterAcknowledgement({
          billingSupabase,
          queueSupabase,
          item: claimed,
          charged,
        })
      }

      const output = await generateProjectDocument({
        docType: claimed.doc_type,
        modelId: model,
        supabase: documentSupabase,
        projectId: claimed.project_id,
        project,
      })

      if (!output?.outputTable || !output.outputId) {
        throw new Error(`Generation did not return a saved output for ${claimed.doc_type}`)
      }

      return finishGeneratingItem(queueSupabase, claimed, {
        status: "done",
        stage_message: null,
        error: null,
        output_table: output?.outputTable ?? null,
        output_id: output?.outputId ?? null,
        completed_at: new Date().toISOString(),
        credit_status: isBundledItem ? "not_charged" : charged ? "charged" : claimed.credit_status,
      })
    } catch (error) {
      if (attempt < maxAttempts) {
        await delay(1000 * attempt)
        continue
      }

      const errorMessage = error instanceof Error ? error.message : "Generation failed"
      const wasCancelled = await isQueueCancelled(queueSupabase, claimed)
      let creditStatus = claimed.credit_status
      if (charged) {
        const refund = await refundGenerationQueueItemCredits(
          billingSupabase,
          { ...claimed, credit_cost: creditCost },
          wasCancelled
            ? `${claimed.label} cancelled — credits refunded (Generate All)`
            : `${claimed.label} failed — credits refunded (Generate All)`,
        )
        if (refund.error) {
          console.error("[GenerateAll] Credit refund failed:", refund.error)
        }
        creditStatus = refund.refunded ? "refunded" : "refund_failed"
      }

      return finishGeneratingItem(queueSupabase, claimed, {
        status: wasCancelled ? "cancelled" : "error",
        stage_message: null,
        error: wasCancelled ? null : errorMessage,
        completed_at: new Date().toISOString(),
        credit_status: creditStatus,
      })
    }
  }

  return finishGeneratingItem(queueSupabase, claimed, {
    status: "error",
    stage_message: null,
    error: "Generation failed",
    completed_at: new Date().toISOString(),
  })
}

async function finishGeneratingItem(
  supabase: SB,
  item: GenerationQueueItemRow,
  update: Database["public"]["Tables"]["generation_queue_items"]["Update"],
) {
  const updated = await updateGenerationQueueItemIfStatus(
    supabase,
    item,
    "generating",
    update,
  )

  if (updated) return updated

  const { data, error } = await supabase
    .from("generation_queue_items")
    .select("*")
    .eq("id", item.id)
    .eq("user_id", item.user_id)
    .single()

  if (error) throw error
  return data
}

function mergeUpdatedItems(
  items: GenerationQueueItemRow[],
  updatedItems: GenerationQueueItemRow[],
) {
  const updatedById = new Map(updatedItems.map((item) => [item.id, item]))
  return items.map((item) => updatedById.get(item.id) ?? item)
}

function buildErrorInfo(items: GenerationQueueItemRow[]) {
  const failed = items.find((item) => item.status === "error" || item.status === "blocked")
  return failed
    ? { message: failed.error ?? "Generation did not complete", docType: failed.doc_type }
    : null
}

function getQueueRunId(queueRow: GenerationQueueRow) {
  return getRunMetadata(queueRow.model_selections).runId
}

async function isQueueCancelled(supabase: SB, item: GenerationQueueItemRow) {
  const { data } = await supabase
    .from("generation_queues")
    .select("status")
    .eq("id", item.queue_id)
    .eq("user_id", item.user_id)
    .single()

  return data?.status === "cancelled"
}

async function cancelClaimedItemAfterAcknowledgement({
  billingSupabase,
  queueSupabase,
  item,
  charged,
}: {
  billingSupabase: SB
  queueSupabase: SB
  item: GenerationQueueItemRow
  charged: boolean
}) {
  let creditStatus = item.credit_status

  if (charged) {
    const refund = await refundGenerationQueueItemCredits(
      billingSupabase,
      item,
      `${item.label} cancelled — credits refunded (Generate All)`,
    )
    if (refund.error) {
      console.error("[GenerateAll] Credit refund failed:", refund.error)
    }
    creditStatus = refund.refunded ? "refunded" : "refund_failed"
  }

  return finishGeneratingItem(queueSupabase, item, {
    status: "cancelled",
    stage_message: null,
    error: null,
    completed_at: new Date().toISOString(),
    credit_status: creditStatus,
  })
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

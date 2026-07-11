/**
 * /api/generate-all/execute
 *
 * Server-side orchestrator for manual Generate All and onboarding generation.
 * The normalized `generation_queue_items` rows are the source of truth; the
 * legacy `generation_queues.queue` JSON is kept in sync for existing UI.
 */

import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  GENERATE_ALL_DEFAULT_MODELS,
  PLANNING_TEXT_DOC_TYPES,
  isPlanningTextDocType,
} from "@/lib/document-definitions"
import { generateProjectDocument } from "@/lib/document-generation-service"
import {
  consumeGenerationQueueItemCredits,
  resolveFailedGenerationCreditStatus,
} from "@/lib/generation/queue-credit-flow"
import { refundGenerationQueueItemCredits } from "@/lib/generation/queue-billing"
import {
  claimGenerationQueueItem,
  computeQueueStatus,
  createGenerationQueueItemPartialContentWriter,
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
} from "@/lib/generation/queue-service"
import { isOnboardingGenerationQueue } from "@/lib/generation/onboarding"
import { GENERATE_ALL_ACTION_MAP, getTokenCost } from "@/lib/token-economics"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { Database } from "@/types/database"
import {
  findLatestActiveDocument,
  getActiveDocumentIdentityForDocumentType,
} from "@/lib/active-document-policy"
import {
  buildRequestLogContext,
  logError,
  logInfo,
  logWarn,
  type LogContext,
} from "@/lib/logger"
import {
  isTierModelRoutingEnabled,
  resolveTierTextModel,
} from "@/lib/generation-model-policy"
import { getUserPlanName } from "@/lib/project-allowance"
import { recordServerProductEvent } from "@/lib/product-analytics/server"
import {
  boundGenerationDurationMs,
  buildGenerationStepIdempotencyKey,
} from "@/lib/product-analytics/generation"
import type { ProductEventPropertyMap } from "@/lib/product-analytics/contracts"

export const maxDuration = 540

type SB = SupabaseClient<Database>

const INCLUDED_PROJECT_OUTPUT_DOC_TYPES = new Set<string>([...PLANNING_TEXT_DOC_TYPES, "mockups"])

// Text documents that follow plan-tier model routing; mockups keep their
// dedicated image model.
const TIER_ROUTED_TEXT_DOC_TYPES = new Set<string>(PLANNING_TEXT_DOC_TYPES)
const ANALYTICS_DOCUMENT_TYPES = new Set<string>([...PLANNING_TEXT_DOC_TYPES, "mockups"])

type GenerationAnalyticsMode = ProductEventPropertyMap["generation_started"]["mode"]
type GenerationAnalyticsDocumentType = ProductEventPropertyMap["generation_step_completed"]["documentType"]

// This only parallelizes independent documents; getRunnableItems still requires
// every declared dependency to be done or skipped before a document can run.
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
  const requestLogContext = buildRequestLogContext(request)
  const supabase = await createClient()
  const queueSupabase = createServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    logWarn("GenerateAll", "unauthorized", requestLogContext)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userLogContext = { ...requestLogContext, userId: user.id }

  let body: { projectId?: string }
  try {
    body = await request.json()
  } catch {
    logWarn("GenerateAll", "invalid_json", userLogContext)
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { projectId } = body
  if (!projectId) {
    logWarn("GenerateAll", "missing_project_id", userLogContext)
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const baseLogContext = { ...userLogContext, projectId }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()

  if (!project) {
    logWarn("GenerateAll", "project_not_found", baseLogContext)
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Plan-tier model routing: resolved once per request from the queue
  // owner's plan, applied to text documents only (mockups keep their image
  // model). Null when the rollback kill switch is set.
  const userPlanName = await getUserPlanName(supabase, user.id)
  const tierTextModel = isTierModelRoutingEnabled()
    ? resolveTierTextModel(userPlanName)
    : null

  const queueRow = await fetchQueueRow(queueSupabase, projectId, user.id)
  if (!queueRow) {
    logWarn("GenerateAll", "queue_not_found", baseLogContext)
    return NextResponse.json({ error: "No queue found: call /start first" }, { status: 404 })
  }

  const queueLogContext = {
    ...baseLogContext,
    queueId: queueRow.id,
    runId: getQueueRunId(queueRow),
  }

  if (queueRow.status === "cancelled") {
    logInfo("GenerateAll", "queue_already_cancelled", queueLogContext)
    return NextResponse.json({ success: true, status: "cancelled" })
  }

  const isOnboardingQueue = isOnboardingGenerationQueue(queueRow)
  logInfo("GenerateAll", "queue_execution_started", {
    ...queueLogContext,
    isOnboardingQueue,
    previousStatus: queueRow.status,
  })

  await queueSupabase
    .from("generation_queues")
    .update({ status: "running" })
    .eq("id", queueRow.id)
    .eq("user_id", user.id)

  let activeQueueRow: GenerationQueueRow = { ...queueRow, status: "running" }

  while (true) {
    const freshQueueRow = await fetchQueueRow(queueSupabase, projectId, user.id)
    if (!freshQueueRow || freshQueueRow.status === "cancelled") {
      logInfo("GenerateAll", "queue_cancelled", queueLogContext)
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
      const cancelledAt = new Date().toISOString()
      await syncGenerationQueueJson(queueSupabase, activeQueueRow, nextItems, {
        status: "cancelled",
        completed_at: cancelledAt,
      })
      const cancelledRunId = getQueueRunId(activeQueueRow)
      if (cancelledRunId) {
        await recordCompletedGenerationSteps({
          items: nextItems,
          queueRow: activeQueueRow,
          runId: cancelledRunId,
          mode: getQueueAnalyticsMode(activeQueueRow, isOnboardingQueue),
          userId: user.id,
          projectId,
          planName: userPlanName,
          fallbackCompletedAt: cancelledAt,
        })
      }
      return NextResponse.json({ success: true, status: "cancelled" })
    }

    activeQueueRow = freshQueueRow
    let items = await getGenerationQueueItems(queueSupabase, activeQueueRow)

    const recoveredItems = await recoverStaleGenerationQueueItems(queueSupabase, items)
    if (recoveredItems.length > 0) {
      logWarn("GenerateAll", "stale_items_recovered", {
        ...queueLogContext,
        recoveredCount: recoveredItems.length,
        itemIds: recoveredItems.map((item) => item.id),
      })
      items = mergeUpdatedItems(items, recoveredItems)
      await syncGenerationQueueJson(queueSupabase, activeQueueRow, items)
    }

    const blockedItems = getBlockedItems(items)
    if (blockedItems.length > 0) {
      logWarn("GenerateAll", "items_blocked", {
        ...queueLogContext,
        blockedCount: blockedItems.length,
        docTypes: blockedItems.map((item) => item.doc_type),
      })
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
          tierTextModel,
          logContext: queueLogContext,
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
  logInfo("GenerateAll", "queue_execution_finished", {
    ...queueLogContext,
    finalStatus,
    itemCount: finalItems.length,
  })
  const finalCompletedAt = new Date().toISOString()
  await syncGenerationQueueJson(queueSupabase, activeQueueRow, finalItems, {
    status: finalStatus,
    completed_at: finalStatus === "running" ? null : finalCompletedAt,
    error_info: buildErrorInfo(finalItems),
  })

  const runId = getQueueRunId(activeQueueRow)
  if (runId) {
    const mode = getQueueAnalyticsMode(activeQueueRow, isOnboardingQueue)
    await recordCompletedGenerationSteps({
      items: finalItems,
      queueRow: activeQueueRow,
      runId,
      mode,
      userId: user.id,
      projectId,
      planName: userPlanName,
      fallbackCompletedAt: finalCompletedAt,
    })

    if (finalStatus === "completed") {
      await recordServerProductEvent({
        eventName: "generation_completed",
        idempotencyKey: `generation:${runId}:completed`,
        userId: user.id,
        projectId,
        planName: userPlanName,
        properties: {
          runId,
          mode,
          durationMs: getBoundedDurationMs(activeQueueRow.started_at, finalCompletedAt),
        },
      })
    } else if (finalStatus === "error" || finalStatus === "partial") {
      const failedItem = finalItems.find((item) => item.status === "error" || item.status === "blocked")
      const documentType = failedItem && isAnalyticsDocumentType(failedItem.doc_type)
        ? failedItem.doc_type
        : undefined
      await recordServerProductEvent({
        eventName: "generation_failed",
        idempotencyKey: `generation:${runId}:failed`,
        userId: user.id,
        projectId,
        planName: userPlanName,
        properties: {
          runId,
          mode,
          ...(documentType ? { documentType } : {}),
          failureKind: failedItem?.status === "blocked" ? "dependency" : "unknown",
        },
      })
    }
  }

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
  tierTextModel,
  logContext,
}: {
  billingSupabase: SB
  documentSupabase: SB
  queueSupabase: SB
  item: GenerationQueueItemRow
  queueRow: GenerationQueueRow
  project: { description: string; name: string }
  isOnboardingQueue: boolean
  tierTextModel: string | null
  logContext: LogContext
}) {
  const itemLogContext = {
    ...logContext,
    itemId: item.id,
    docType: item.doc_type,
    queueId: item.queue_id,
    runId: item.run_id,
  }
  const claimed = await claimGenerationQueueItem(queueSupabase, item)
  if (!claimed) {
    logInfo("GenerateAll", "item_claim_skipped", itemLogContext)
    return null
  }

  logInfo("GenerateAll", "item_claimed", {
    ...itemLogContext,
    attempt: claimed.attempt,
    maxAttempts: claimed.max_attempts,
  })

  // Bundling compares against the run id minted at enqueue: onboarding
  // retries overwrite model_selections.analyticsRunId (see getQueueRunId)
  // while items keep their original run_id, and a mismatch here would
  // silently collapse maxAttempts to 1 for every retried item.
  const isBundledItem =
    isOnboardingQueue &&
    claimed.run_id === getRunMetadata(queueRow.model_selections).runId &&
    claimed.source === "onboarding"

  if (claimed.doc_type === "launch") {
    logInfo("GenerateAll", "item_skipped_archived_doc_type", itemLogContext)
    return finishGeneratingItem(queueSupabase, claimed, {
      status: "skipped",
      stage_message: null,
      error: null,
      completed_at: new Date().toISOString(),
      credit_cost: 0,
      credit_status: "not_charged",
    })
  }

  const action = GENERATE_ALL_ACTION_MAP[claimed.doc_type]
  const model =
    tierTextModel && TIER_ROUTED_TEXT_DOC_TYPES.has(claimed.doc_type)
      ? tierTextModel
      : claimed.model_id ?? GENERATE_ALL_DEFAULT_MODELS[claimed.doc_type]
  const isIncludedProjectOutput = INCLUDED_PROJECT_OUTPUT_DOC_TYPES.has(claimed.doc_type)
  const creditCost = isBundledItem || isIncludedProjectOutput
    ? 0
    : action
      ? getTokenCost(action, model)
      : claimed.credit_cost
  const shouldChargeCredits =
    !isBundledItem &&
    !isIncludedProjectOutput &&
    creditCost > 0 &&
    claimed.credit_status !== "charged"
  let charged = claimed.credit_status === "charged"
  const refundCreditCost = charged ? Math.max(creditCost, claimed.credit_cost) : creditCost

  const identity = getActiveDocumentIdentityForDocumentType(claimed.doc_type)
  if (identity) {
    const existing = await findLatestActiveDocument(documentSupabase, claimed.project_id, identity)
    if (existing) {
      const creditStatus = await resolveNoChargeCreditStatus({
        billingSupabase,
        item: claimed,
        refundCreditCost,
        charged,
        logContext: itemLogContext,
        description: `${claimed.label} skipped: credits refunded (Generate All)`,
      })
      logInfo("GenerateAll", "item_skipped_existing_output", {
        ...itemLogContext,
        outputTable: existing.outputTable,
        outputId: existing.outputId,
      })
      return finishGeneratingItem(queueSupabase, claimed, {
        status: "skipped",
        stage_message: null,
        error: null,
        output_table: existing.outputTable,
        output_id: existing.outputId,
        completed_at: new Date().toISOString(),
        credit_status: creditStatus,
      })
    }
  }

  if (shouldChargeCredits) {
    logInfo("GenerateAll", "item_credit_charge_started", {
      ...itemLogContext,
      creditCost,
      action,
    })
    const creditConsumption = await consumeGenerationQueueItemCredits({
      supabase: billingSupabase,
      userId: claimed.user_id,
      amount: creditCost,
      action: action ?? claimed.doc_type,
      label: claimed.label,
      projectName: project.name,
    })

    if (!creditConsumption.consumed) {
      logWarn("GenerateAll", "item_credit_charge_failed", {
        ...itemLogContext,
        creditCost,
        consumed: false,
      })
      return finishGeneratingItem(queueSupabase, claimed, {
        status: "error",
        stage_message: null,
        error: creditConsumption.errorMessage ?? "Credit check failed",
        completed_at: new Date().toISOString(),
      })
    }

    charged = true
    logInfo("GenerateAll", "item_credit_charged", {
      ...itemLogContext,
      creditCost,
    })
    await updateGenerationQueueItem(queueSupabase, claimed, {
      credit_cost: creditCost,
      credit_status: "charged",
    })
  }

  const maxAttempts = isBundledItem ? Math.max(1, claimed.max_attempts) : 1
  let attempt = claimed.attempt

  // Persist partial streamed markdown for the onboarding live preview.
  // Isolated failure domain: writer errors disable partial writes only.
  const partialWriter =
    isPlanningTextDocType(claimed.doc_type)
      ? createGenerationQueueItemPartialContentWriter(queueSupabase, claimed, {
          onError: (error) => {
            logWarn("GenerateAll", "item_partial_content_write_failed", itemLogContext, error)
          },
        })
      : null

  try {
  while (attempt < maxAttempts) {
    attempt += 1
    logInfo("GenerateAll", "item_attempt_started", {
      ...itemLogContext,
      attempt,
      maxAttempts,
      model,
      creditCost,
      bundled: isBundledItem,
    })
    await updateGenerationQueueItem(queueSupabase, claimed, {
      attempt,
      stage_message: attempt > 1 ? `Retrying (${attempt}/${maxAttempts})...` : "Generating...",
    })

    try {
      if (await isQueueCancelled(queueSupabase, claimed)) {
        logInfo("GenerateAll", "item_cancelled_before_generation", itemLogContext)
        return cancelClaimedItemAfterAcknowledgement({
          billingSupabase,
          queueSupabase,
          item: claimed,
          charged,
          refundCreditCost,
        })
      }

      const output = await generateProjectDocument({
        docType: claimed.doc_type,
        modelId: model,
        supabase: documentSupabase,
        projectId: claimed.project_id,
        project,
        userId: claimed.user_id,
        runId: claimed.run_id,
        logContext: itemLogContext,
        onPartialContent: partialWriter ? partialWriter.write : undefined,
      })

      if (!output?.outputTable || !output.outputId) {
        throw new Error(`Generation did not return a saved output for ${claimed.doc_type}`)
      }

      logInfo("GenerateAll", "item_generation_succeeded", {
        ...itemLogContext,
        attempt,
        outputTable: output.outputTable,
        outputId: output.outputId,
        skippedExisting: Boolean(output.skippedExisting),
      })
      const successfulCreditStatus = await resolveSuccessfulGenerationCreditStatus({
        billingSupabase,
        item: claimed,
        refundCreditCost,
        charged,
        isBundledItem,
        isIncludedProjectOutput,
        skippedExisting: Boolean(output.skippedExisting),
        logContext: itemLogContext,
      })
      return finishGeneratingItem(queueSupabase, claimed, {
        status: output.skippedExisting ? "skipped" : "done",
        stage_message: null,
        error: null,
        output_table: output?.outputTable ?? null,
        output_id: output?.outputId ?? null,
        completed_at: new Date().toISOString(),
        credit_status: successfulCreditStatus,
      })
    } catch (error) {
      if (attempt < maxAttempts) {
        logWarn("GenerateAll", "item_attempt_failed_retrying", {
          ...itemLogContext,
          attempt,
          maxAttempts,
        }, error)
        await delay(1000 * attempt)
        continue
      }

      const errorMessage = error instanceof Error ? error.message : "Generation failed"
      const wasCancelled = await isQueueCancelled(queueSupabase, claimed)
      logError("GenerateAll", "item_generation_failed", error, {
        ...itemLogContext,
        attempt,
        maxAttempts,
        wasCancelled,
      })
      const creditStatus = await resolveFailedGenerationCreditStatus({
        billingSupabase,
        item: claimed,
        creditCost: refundCreditCost,
        charged,
        wasCancelled,
        logRefundError: (refundError) => {
          logError("GenerateAll", "item_credit_refund_failed", refundError, {
            ...itemLogContext,
            creditCost,
            wasCancelled,
          })
        },
      })
      if (charged && creditStatus === "refunded") {
        logInfo("GenerateAll", "item_credit_refunded", {
          ...itemLogContext,
          creditCost,
          wasCancelled,
        })
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
  } finally {
    // Clear the stored partial regardless of which terminal path ran.
    await partialWriter?.finish()
  }
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
  const metadata = isRecord(queueRow.model_selections) ? queueRow.model_selections : null
  return typeof metadata?.analyticsRunId === "string"
    ? metadata.analyticsRunId
    : getRunMetadata(queueRow.model_selections).runId
}

function getQueueAnalyticsMode(
  queueRow: GenerationQueueRow,
  isOnboardingQueue: boolean,
): GenerationAnalyticsMode {
  const metadata = isRecord(queueRow.model_selections) ? queueRow.model_selections : null
  if (metadata?.analyticsMode === "retry") return "retry"
  return isOnboardingQueue ? "onboarding" : "generate_all"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function isAnalyticsDocumentType(value: string): value is GenerationAnalyticsDocumentType {
  return ANALYTICS_DOCUMENT_TYPES.has(value)
}

function getBoundedDurationMs(start: string | null, end: string | null) {
  const startMs = start ? Date.parse(start) : Number.NaN
  const endMs = end ? Date.parse(end) : Number.NaN
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0
  return boundGenerationDurationMs(endMs - startMs)
}

async function recordCompletedGenerationSteps({
  items,
  queueRow,
  runId,
  mode,
  userId,
  projectId,
  planName,
  fallbackCompletedAt,
}: {
  items: GenerationQueueItemRow[]
  queueRow: GenerationQueueRow
  runId: string
  mode: GenerationAnalyticsMode
  userId: string
  projectId: string
  planName: string
  fallbackCompletedAt: string
}) {
  const completedItems = items.filter(
    (item): item is GenerationQueueItemRow & { doc_type: GenerationAnalyticsDocumentType } =>
      (item.status === "done" || item.status === "skipped") &&
      isAnalyticsDocumentType(item.doc_type) &&
      (
        mode !== "retry" ||
        Boolean(
          item.started_at &&
          queueRow.started_at &&
          Date.parse(item.started_at) >= Date.parse(queueRow.started_at),
        )
      ),
  )
  await Promise.all(completedItems.map((item) =>
    recordServerProductEvent({
      eventName: "generation_step_completed",
      idempotencyKey: buildGenerationStepIdempotencyKey(runId, item.doc_type),
      userId,
      projectId,
      planName,
      properties: {
        runId,
        mode,
        documentType: item.doc_type,
        durationMs: getBoundedDurationMs(
          item.started_at ?? queueRow.started_at,
          item.completed_at ?? fallbackCompletedAt,
        ),
      },
    }),
  ))
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

async function resolveSuccessfulGenerationCreditStatus({
  billingSupabase,
  item,
  refundCreditCost,
  charged,
  isBundledItem,
  isIncludedProjectOutput,
  skippedExisting,
  logContext,
}: {
  billingSupabase: SB
  item: GenerationQueueItemRow
  refundCreditCost: number
  charged: boolean
  isBundledItem: boolean
  isIncludedProjectOutput: boolean
  skippedExisting: boolean
  logContext: LogContext
}) {
  if (skippedExisting) {
    return resolveNoChargeCreditStatus({
      billingSupabase,
      item,
      refundCreditCost,
      charged,
      logContext,
      description: `${item.label} skipped: credits refunded (Generate All)`,
    })
  }

  if (isBundledItem || isIncludedProjectOutput) {
    return resolveNoChargeCreditStatus({
      billingSupabase,
      item,
      refundCreditCost,
      charged,
      logContext,
      description: `${item.label} is included in project generation: credits refunded (Generate All)`,
    })
  }

  return charged ? "charged" : item.credit_status
}

async function resolveNoChargeCreditStatus({
  billingSupabase,
  item,
  refundCreditCost,
  charged,
  logContext,
  description,
}: {
  billingSupabase: SB
  item: GenerationQueueItemRow
  refundCreditCost: number
  charged: boolean
  logContext: LogContext
  description: string
}) {
  if (!charged) return "not_charged"
  if (refundCreditCost <= 0) return "not_charged"

  const refund = await refundGenerationQueueItemCredits(
    billingSupabase,
    { ...item, credit_cost: refundCreditCost },
    description,
  )

  if (refund.error) {
    logError("GenerateAll", "item_credit_refund_failed", refund.error, {
      ...logContext,
      creditCost: refundCreditCost,
    })
  }

  if (refund.refunded) {
    logInfo("GenerateAll", "item_credit_refunded", {
      ...logContext,
      creditCost: refundCreditCost,
    })
  }

  return refund.refunded ? "refunded" : "refund_failed"
}

async function cancelClaimedItemAfterAcknowledgement({
  billingSupabase,
  queueSupabase,
  item,
  charged,
  refundCreditCost,
}: {
  billingSupabase: SB
  queueSupabase: SB
  item: GenerationQueueItemRow
  charged: boolean
  refundCreditCost: number
}) {
  let creditStatus = item.credit_status

  if (charged) {
    creditStatus = await resolveFailedGenerationCreditStatus({
      billingSupabase,
      item,
      creditCost: refundCreditCost,
      charged,
      wasCancelled: true,
      logRefundError: (refundError) => {
        logError("GenerateAll", "item_credit_refund_failed", refundError, {
          itemId: item.id,
          docType: item.doc_type,
          queueId: item.queue_id,
          runId: item.run_id,
        })
      },
    })
    if (creditStatus === "refunded") {
      logInfo("GenerateAll", "item_credit_refunded", {
        itemId: item.id,
        docType: item.doc_type,
        queueId: item.queue_id,
        runId: item.run_id,
      })
    }
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

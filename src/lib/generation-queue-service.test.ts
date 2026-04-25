import test from "node:test"
import assert from "node:assert/strict"

import {
  buildManualGenerationQueue,
  computeQueueStatus,
  getBlockedItems,
  getRunnableItems,
  recoverStaleGenerationQueueItems,
  type GenerationQueueItemRow,
  type GenerationQueueItemUpdate,
} from "./generation-queue-service"

function queueItem(
  overrides: Partial<GenerationQueueItemRow> & Pick<GenerationQueueItemRow, "doc_type">,
): GenerationQueueItemRow {
  const { doc_type: docType, ...rest } = overrides
  return {
    attempt: 0,
    completed_at: null,
    created_at: "2026-04-25T00:00:00.000Z",
    credit_cost: 0,
    credit_status: "not_charged",
    depends_on: [],
    doc_type: docType,
    error: null,
    id: `${docType}-item`,
    idempotency_key: `queue:${docType}`,
    label: docType,
    max_attempts: 2,
    model_id: null,
    output_id: null,
    output_table: null,
    project_id: "project-1",
    queue_id: "queue-1",
    run_id: "run-1",
    source: "onboarding",
    stage_message: null,
    started_at: null,
    status: "pending",
    updated_at: "2026-04-25T00:00:00.000Z",
    user_id: "user-1",
    ...rest,
  }
}

test("getRunnableItems: returns only pending items whose dependencies are done", () => {
  const items = [
    queueItem({ doc_type: "competitive", status: "pending" }),
    queueItem({ doc_type: "launch", status: "pending" }),
    queueItem({ doc_type: "prd", status: "pending", depends_on: ["competitive"] }),
    queueItem({ doc_type: "mvp", status: "pending", depends_on: ["prd"] }),
  ]

  assert.deepEqual(
    getRunnableItems(items, 2).map((item) => item.doc_type),
    ["competitive", "launch"],
  )

  const afterCompetitive = items.map((item) =>
    item.doc_type === "competitive" ? { ...item, status: "done" } : item,
  ) as GenerationQueueItemRow[]

  assert.deepEqual(
    getRunnableItems(afterCompetitive, 2).map((item) => item.doc_type),
    ["launch", "prd"],
  )
})

test("getBlockedItems: blocks pending dependents when a dependency fails", () => {
  const items = [
    queueItem({ doc_type: "prd", status: "error" }),
    queueItem({ doc_type: "mvp", status: "pending", depends_on: ["prd"] }),
    queueItem({ doc_type: "launch", status: "pending" }),
  ]

  assert.deepEqual(getBlockedItems(items).map((item) => item.doc_type), ["mvp"])
})

test("getBlockedItems: blocks pending items with missing dependencies", () => {
  const items = [
    queueItem({ doc_type: "mvp", status: "pending", depends_on: ["prd"] }),
    queueItem({ doc_type: "launch", status: "pending" }),
  ]

  assert.deepEqual(getBlockedItems(items).map((item) => item.doc_type), ["mvp"])
})

test("computeQueueStatus: reports partial only after useful output exists", () => {
  assert.equal(
    computeQueueStatus([
      queueItem({ doc_type: "competitive", status: "done" }),
      queueItem({ doc_type: "prd", status: "blocked" }),
    ]),
    "partial",
  )
  assert.equal(
    computeQueueStatus([
      queueItem({ doc_type: "competitive", status: "error" }),
      queueItem({ doc_type: "prd", status: "blocked" }),
    ]),
    "error",
  )
  assert.equal(
    computeQueueStatus([
      queueItem({ doc_type: "competitive", status: "done" }),
      queueItem({ doc_type: "prd", status: "cancelled" }),
    ]),
    "cancelled",
  )
})

test("computeQueueStatus: stays running while any item is active", () => {
  assert.equal(
    computeQueueStatus([
      queueItem({ doc_type: "competitive", status: "error" }),
      queueItem({ doc_type: "launch", status: "generating" }),
    ]),
    "running",
  )
  assert.equal(
    computeQueueStatus([
      queueItem({ doc_type: "competitive", status: "done" }),
      queueItem({ doc_type: "prd", status: "blocked" }),
      queueItem({ doc_type: "launch", status: "pending" }),
    ]),
    "running",
  )
})

test("buildManualGenerationQueue: strips client authority fields", () => {
  const queue = buildManualGenerationQueue([
    {
      docType: "competitive",
      label: "Free Competitive",
      status: "done",
      creditCost: 0,
      source: "onboarding",
      creditStatus: "not_charged",
      runId: "client-run",
      idempotencyKey: "client-key",
      dependsOn: [],
      attempt: 99,
      maxAttempts: 99,
      outputTable: "analyses",
      outputId: "output-1",
    },
  ])

  assert.equal(queue.length, 1)
  assert.equal(queue[0].label, "Competitive Research")
  assert.equal(queue[0].status, "pending")
  assert.equal(queue[0].source, "manual")
  assert.equal(queue[0].creditStatus, "unprocessed")
  assert.equal(queue[0].runId, undefined)
  assert.equal(queue[0].idempotencyKey, undefined)
  assert.equal(queue[0].attempt, 0)
  assert.equal(queue[0].maxAttempts, 1)
  assert.equal(queue[0].outputTable, undefined)
  assert.equal(queue[0].outputId, undefined)
  assert.ok(queue[0].creditCost > 0)
})

test("recoverStaleGenerationQueueItems: requeues stale generating work for retry", async () => {
  const now = Date.now()
  const stale = queueItem({
    doc_type: "competitive",
    status: "generating",
    attempt: 2,
    max_attempts: 2,
    updated_at: new Date(now - 10 * 60 * 1000).toISOString(),
    started_at: new Date(now - 10 * 60 * 1000).toISOString(),
  })
  const fresh = queueItem({
    doc_type: "launch",
    status: "generating",
    updated_at: new Date(now).toISOString(),
    started_at: new Date(now).toISOString(),
  })
  let lastUpdate: GenerationQueueItemUpdate | null = null
  const supabase = {
    from: () => ({
      update(update: GenerationQueueItemUpdate) {
        lastUpdate = update
        return this
      },
      eq() {
        return this
      },
      select() {
        return this
      },
      async maybeSingle() {
        return { data: { ...stale, ...lastUpdate }, error: null }
      },
    }),
  } as unknown as Parameters<typeof recoverStaleGenerationQueueItems>[0]

  const recovered = await recoverStaleGenerationQueueItems(
    supabase,
    [stale, fresh],
    9 * 60 * 1000,
  )

  assert.equal(recovered.length, 1)
  assert.equal(recovered[0].status, "pending")
  assert.equal(recovered[0].attempt, 1)
  assert.equal(recovered[0].started_at, null)
})

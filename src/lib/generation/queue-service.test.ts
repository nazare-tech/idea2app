import test from "node:test"
import assert from "node:assert/strict"

import {
  buildManualGenerationQueue,
  computeQueueStatus,
  createGenerationQueueItemPartialContentWriter,
  getBlockedItems,
  getRunnableItems,
  recoverStaleGenerationQueueItems,
  resetGenerationQueueItemsForRetry,
  type GenerationQueueItemRow,
  type GenerationQueueItemUpdate,
} from "@/lib/generation/queue-service"

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
    partial_content: null,
    partial_metadata: null,
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
  assert.equal(queue[0].label, "Market Research")
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

test("buildManualGenerationQueue: drops archived launch items", () => {
  const queue = buildManualGenerationQueue([
    {
      docType: "launch",
      label: "Launch Plan",
      status: "pending",
      creditCost: 5,
    } as never,
  ])

  assert.deepEqual(queue, [])
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
    partial_content: "## Executive Summary\nDead run preview",
    partial_metadata: { live_research: { competitor_sources: [] } },
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
  assert.equal(recovered[0].partial_content, null)
  assert.equal(recovered[0].partial_metadata, null)
})

test("resetGenerationQueueItemsForRetry: resets failed and blocked items to pending", async () => {
  const items = [
    queueItem({ doc_type: "competitive", status: "done", output_table: "analyses", output_id: "analysis-1" }),
    queueItem({ doc_type: "prd", status: "error", error: "Product Plan failed" }),
    queueItem({ doc_type: "mvp", status: "blocked", error: "Blocked by Product Plan" }),
    queueItem({ doc_type: "mockups", status: "blocked", error: "Blocked by First Version Plan" }),
  ]
  const updates: Array<{ id: string; update: GenerationQueueItemUpdate }> = []
  let currentUpdate: GenerationQueueItemUpdate | null = null
  let currentId: string | null = null
  const supabase = {
    from: () => ({
      update(update: GenerationQueueItemUpdate) {
        currentUpdate = update
        return this
      },
      eq(column: string, value: string) {
        if (column === "id") currentId = value
        return this
      },
      select() {
        return this
      },
      async single() {
        const original = items.find((item) => item.id === currentId)
        assert.ok(original)
        assert.ok(currentUpdate)
        updates.push({ id: original.id, update: currentUpdate })
        return { data: { ...original, ...currentUpdate }, error: null }
      },
    }),
  } as unknown as Parameters<typeof resetGenerationQueueItemsForRetry>[0]

  const resetItems = await resetGenerationQueueItemsForRetry(supabase, items, {
    source: "onboarding",
    creditStatus: "not_charged",
    creditCost: 0,
    maxAttempts: 2,
  })

  assert.deepEqual(resetItems.map((item) => item.doc_type), ["prd", "mvp", "mockups"])
  assert.deepEqual(updates.map((entry) => entry.id), ["prd-item", "mvp-item", "mockups-item"])
  for (const item of resetItems) {
    assert.equal(item.status, "pending")
    assert.equal(item.error, null)
    assert.equal(item.stage_message, null)
    assert.equal(item.output_table, null)
    assert.equal(item.output_id, null)
    assert.equal(item.credit_status, "not_charged")
    assert.equal(item.credit_cost, 0)
    assert.equal(item.max_attempts, 2)
  }
})

test("partial content writer fences every write on status = 'generating'", async () => {
  const eqCalls: Array<Array<{ column: string; value: unknown }>> = []
  const updates: Record<string, unknown>[] = []
  const supabase = {
    from: () => {
      const call: Array<{ column: string; value: unknown }> = []
      eqCalls.push(call)
      return {
        update(update: Record<string, unknown>) {
          updates.push(update)
          return this
        },
        eq(column: string, value: unknown) {
          call.push({ column, value })
          return Object.assign(Promise.resolve({ error: null }), this)
        },
      }
    },
  } as unknown as Parameters<typeof createGenerationQueueItemPartialContentWriter>[0]

  const writer = createGenerationQueueItemPartialContentWriter(
    supabase,
    { id: "item-1", user_id: "user-1" },
    { intervalMs: 0 },
  )

  writer.write("## partial")
  await writer.writeMetadata({ live_research: { competitor_sources: [] } })
  await new Promise((resolve) => setImmediate(resolve))

  assert.deepEqual(updates, [
    { partial_content: "## partial" },
    { partial_metadata: { live_research: { competitor_sources: [] } } },
  ])
  for (const call of eqCalls) {
    assert.deepEqual(call, [
      { column: "id", value: "item-1" },
      { column: "user_id", value: "user-1" },
      { column: "status", value: "generating" },
    ])
  }
})

test("partial content writer disables content writes after a write error, metadata errors stay isolated", async () => {
  let failNext = false
  const updates: Record<string, unknown>[] = []
  const errors: unknown[] = []
  const supabase = {
    from: () => ({
      update(update: Record<string, unknown>) {
        updates.push(update)
        return this
      },
      eq() {
        const shouldFail = failNext
        return Object.assign(
          Promise.resolve(shouldFail ? { error: { message: "column missing" } } : { error: null }),
          this,
        )
      },
    }),
  } as unknown as Parameters<typeof createGenerationQueueItemPartialContentWriter>[0]

  const writer = createGenerationQueueItemPartialContentWriter(
    supabase,
    { id: "item-1", user_id: "user-1" },
    { intervalMs: 0, onError: (error) => errors.push(error) },
  )

  failNext = true
  await writer.writeMetadata({ live_research: { competitor_sources: [] } })
  failNext = false
  writer.write("still streaming")
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(updates.length, 2, "metadata failure must not disable content writes")

  failNext = true
  writer.write("first content write fails")
  await new Promise((resolve) => setImmediate(resolve))
  failNext = false
  writer.write("after content failure")
  await new Promise((resolve) => setImmediate(resolve))

  assert.equal(updates.length, 3, "content failure disables the writer")
  assert.equal(errors.length, 2)
})

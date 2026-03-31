import test from "node:test"
import assert from "node:assert/strict"
import { buildQueue, LOCAL_STORAGE_KEY, type QueueItem } from "./generate-all-helpers"
import { GENERATE_ALL_QUEUE_ORDER } from "./document-definitions"
import { GENERATE_ALL_ACTION_MAP, getTokenCost } from "./token-economics"

// =============================================================================
// Shared test fixtures
// =============================================================================

const DEFAULT_MODELS: Record<string, string> = {
  competitive: "google/gemini-3.1-pro-preview",
  prd:         "anthropic/claude-sonnet-4-6",
  mvp:         "anthropic/claude-sonnet-4-6",
  mockups:     "stitch",
  launch:      "openai/gpt-5.4-mini",
}

// Status functions for common scenarios
const allPending = (_type: string) => "pending" as const
const allDone = (_type: string) => "done" as const

// =============================================================================
// LOCAL_STORAGE_KEY
// =============================================================================

test("LOCAL_STORAGE_KEY: produces a stable, project-scoped key", () => {
  const key = LOCAL_STORAGE_KEY("proj-abc")
  assert.equal(key, "generate_all_active_proj-abc")
})

test("LOCAL_STORAGE_KEY: different projects produce different keys", () => {
  const key1 = LOCAL_STORAGE_KEY("project-1")
  const key2 = LOCAL_STORAGE_KEY("project-2")
  assert.notEqual(key1, key2)
})

// =============================================================================
// buildQueue — structure
// =============================================================================

test("buildQueue: queue length matches GENERATE_ALL_QUEUE_ORDER", () => {
  const queue = buildQueue(DEFAULT_MODELS, allPending)
  assert.equal(queue.length, GENERATE_ALL_QUEUE_ORDER.length)
})

test("buildQueue: doc types follow GENERATE_ALL_QUEUE_ORDER exactly", () => {
  const queue = buildQueue(DEFAULT_MODELS, allPending)
  const docTypes = queue.map((item) => item.docType)
  assert.deepStrictEqual(docTypes, GENERATE_ALL_QUEUE_ORDER)
})

test("buildQueue: every item has a non-empty label string", () => {
  const queue = buildQueue(DEFAULT_MODELS, allPending)
  assert.ok(queue.every((item) => typeof item.label === "string" && item.label.length > 0))
})

// =============================================================================
// buildQueue — status assignment
// =============================================================================

test("buildQueue: all docs pending when none are done", () => {
  const queue = buildQueue(DEFAULT_MODELS, allPending)
  assert.ok(queue.every((item) => item.status === "pending"))
})

test("buildQueue: done docs are marked 'skipped'", () => {
  const getStatus = (type: string) =>
    type === "competitive" ? ("done" as const) : ("pending" as const)
  const queue = buildQueue(DEFAULT_MODELS, getStatus)
  const competitive = queue.find((item) => item.docType === "competitive")!
  assert.equal(competitive.status, "skipped")
})

test("buildQueue: in_progress docs are treated as 'pending' (not skipped)", () => {
  const getStatus = (type: string) =>
    type === "prd" ? ("in_progress" as const) : ("pending" as const)
  const queue = buildQueue(DEFAULT_MODELS, getStatus)
  const prd = queue.find((item) => item.docType === "prd")!
  assert.equal(prd.status, "pending")
})

test("buildQueue: all docs skipped when all are done", () => {
  const queue = buildQueue(DEFAULT_MODELS, allDone)
  assert.ok(queue.every((item) => item.status === "skipped"))
})

test("buildQueue: mixed statuses — only done docs are skipped", () => {
  const doneTypes = new Set(["competitive", "mvp"])
  const getStatus = (type: string) =>
    doneTypes.has(type) ? ("done" as const) : ("pending" as const)
  const queue = buildQueue(DEFAULT_MODELS, getStatus)

  const competitive = queue.find((item) => item.docType === "competitive")!
  const mvp = queue.find((item) => item.docType === "mvp")!
  const prd = queue.find((item) => item.docType === "prd")!
  const mockups = queue.find((item) => item.docType === "mockups")!
  const launch = queue.find((item) => item.docType === "launch")!

  assert.equal(competitive.status, "skipped")
  assert.equal(mvp.status, "skipped")
  assert.equal(prd.status, "pending")
  assert.equal(mockups.status, "pending")
  assert.equal(launch.status, "pending")
})

// =============================================================================
// buildQueue — credit costs
// =============================================================================

test("buildQueue: skipped docs have 0 credit cost", () => {
  const queue = buildQueue(DEFAULT_MODELS, allDone)
  assert.ok(queue.every((item) => item.creditCost === 0))
})

test("buildQueue: pending doc costs match getTokenCost(action, model)", () => {
  const queue = buildQueue(DEFAULT_MODELS, allPending)
  for (const item of queue) {
    const action = GENERATE_ALL_ACTION_MAP[item.docType]
    const expected = getTokenCost(action, DEFAULT_MODELS[item.docType])
    assert.equal(item.creditCost, expected, `creditCost mismatch for ${item.docType}`)
  }
})

test("buildQueue: competitive cost with grok (0.8x) on base 10 → 8", () => {
  const queue = buildQueue(DEFAULT_MODELS, allPending)
  const competitive = queue.find((item) => item.docType === "competitive")!
  assert.equal(competitive.creditCost, 8)
})

test("buildQueue: mockups cost with stitch (1.0x) on base 30 → 30", () => {
  const queue = buildQueue(DEFAULT_MODELS, allPending)
  const mockups = queue.find((item) => item.docType === "mockups")!
  assert.equal(mockups.creditCost, 30)
})

test("buildQueue: launch cost with grok (0.8x) on base 5 → 4", () => {
  const queue = buildQueue(DEFAULT_MODELS, allPending)
  const launch = queue.find((item) => item.docType === "launch")!
  assert.equal(launch.creditCost, 4)
})

test("buildQueue: switching competitive to gpt-5 (1.5x) → cost 15 instead of 8", () => {
  const premiumModels = { ...DEFAULT_MODELS, competitive: "openai/gpt-5" }
  const queueDefault = buildQueue(DEFAULT_MODELS, allPending)
  const queuePremium = buildQueue(premiumModels, allPending)

  const defaultCompetitive = queueDefault.find((item) => item.docType === "competitive")!
  const premiumCompetitive = queuePremium.find((item) => item.docType === "competitive")!

  assert.equal(defaultCompetitive.creditCost, 8)
  assert.equal(premiumCompetitive.creditCost, 15)
})

test("buildQueue: model selection only affects the specific doc type", () => {
  const premiumModels = { ...DEFAULT_MODELS, competitive: "openai/gpt-5" }
  const queueDefault = buildQueue(DEFAULT_MODELS, allPending)
  const queuePremium = buildQueue(premiumModels, allPending)

  // Only competitive should differ
  for (const item of queueDefault) {
    if (item.docType === "competitive") continue
    const premium = queuePremium.find((i) => i.docType === item.docType)!
    assert.equal(
      item.creditCost,
      premium.creditCost,
      `${item.docType} cost should not change`,
    )
  }
})

// =============================================================================
// Generation Loop Simulation
//
// This function is a pure TypeScript mirror of the runLoop() inside
// generate-all-context.tsx. It allows us to test the queue-processing
// algorithm — order, skipping, error handling, cancellation — without
// React state or live API calls.
// =============================================================================

type SimItem = {
  docType: string
  status: "pending" | "generating" | "done" | "skipped" | "cancelled" | "error"
  stageMessage?: string
  error?: string
}

type LoopResult = {
  queue: SimItem[]
  status: "completed" | "cancelled" | "error"
  creditsUsed: number
}

async function simulateLoop(
  queue: SimItem[],
  modelSelections: Record<string, string>,
  generateDoc: (docType: string, model: string) => Promise<boolean>,
  getDocStatus: (docType: string) => "done" | "pending" | "in_progress",
  cancelledRef: { current: boolean },
): Promise<LoopResult> {
  // Working copy — never mutate the input
  const wq = queue.map((i) => ({ ...i }))
  let creditsUsed = 0

  const startIdx = wq.findIndex((item) => item.status === "pending")
  if (startIdx === -1) return { queue: wq, status: "completed", creditsUsed }

  for (let i = startIdx; i < wq.length; i++) {
    if (cancelledRef.current) break

    const item = wq[i]
    if (item.status !== "pending") continue

    // Re-check: doc may have been generated between queue build and this iteration
    if (getDocStatus(item.docType) === "done") {
      wq[i] = { ...wq[i], status: "skipped" }
      continue
    }

    wq[i] = { ...wq[i], status: "generating", stageMessage: "Generating..." }

    const model = modelSelections[item.docType] ?? "default-model"

    try {
      const success = await generateDoc(item.docType, model)
      if (cancelledRef.current) break

      if (success) {
        const action = GENERATE_ALL_ACTION_MAP[item.docType]
        creditsUsed += getTokenCost(action, model)
        wq[i] = { ...wq[i], status: "done", stageMessage: undefined }
      } else {
        throw new Error("Generation failed")
      }
    } catch (err) {
      if (cancelledRef.current) break
      if (err instanceof DOMException && err.name === "AbortError") break

      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      wq[i] = { ...wq[i], status: "error", stageMessage: undefined, error: errorMsg }
      return { queue: wq, status: "error", creditsUsed }
    }
  }

  // Cancelled
  if (cancelledRef.current) {
    cancelledRef.current = false
    return { queue: wq, status: "cancelled", creditsUsed }
  }

  // Final verification: any item stuck in "generating" didn't complete
  const final = wq.map((item) => {
    if (item.status === "generating") {
      return getDocStatus(item.docType) === "done"
        ? { ...item, status: "done" as const, stageMessage: undefined }
        : { ...item, status: "error" as const, stageMessage: undefined, error: "Did not complete" }
    }
    return item
  })

  return { queue: final, status: "completed", creditsUsed }
}

/** Build a fresh all-pending queue for all 5 Generate All docs */
function pendingQueue(): SimItem[] {
  return GENERATE_ALL_QUEUE_ORDER.map((docType) => ({
    docType,
    status: "pending" as const,
  }))
}

// =============================================================================
// Loop: happy path
// =============================================================================

test("loop: processes all 5 docs in GENERATE_ALL_QUEUE_ORDER", async () => {
  const order: string[] = []
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async (docType) => { order.push(docType); return true },
    allPending,
    { current: false },
  )
  assert.equal(result.status, "completed")
  assert.deepStrictEqual(order, GENERATE_ALL_QUEUE_ORDER)
})

test("loop: all items end up 'done' on successful completion", async () => {
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async () => true,
    allPending,
    { current: false },
  )
  assert.equal(result.status, "completed")
  assert.ok(result.queue.every((item) => item.status === "done"))
})

test("loop: credits accumulate for every generated doc", async () => {
  // competitive:8, prd:8, mvp:8, mockups:30, launch:4 → 58
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async () => true,
    allPending,
    { current: false },
  )
  assert.equal(result.creditsUsed, 58)
})

test("loop: empty queue (no pending items) completes immediately without calling generateDoc", async () => {
  const allSkipped = GENERATE_ALL_QUEUE_ORDER.map((docType) => ({
    docType,
    status: "skipped" as const,
  }))
  let callCount = 0
  const result = await simulateLoop(
    allSkipped,
    DEFAULT_MODELS,
    async () => { callCount++; return true },
    allDone,
    { current: false },
  )
  assert.equal(result.status, "completed")
  assert.equal(callCount, 0)
  assert.equal(result.creditsUsed, 0)
})

// =============================================================================
// Loop: pre-skipping (docs become done between queue build and iteration)
// =============================================================================

test("loop: doc that becomes done before processing is skipped (not regenerated)", async () => {
  // competitive is 'pending' in the queue but reports 'done' at runtime
  const generated: string[] = []
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async (docType) => { generated.push(docType); return true },
    (type) => type === "competitive" ? "done" : "pending",
    { current: false },
  )
  assert.equal(result.status, "completed")
  assert.ok(!generated.includes("competitive"), "competitive should be skipped, not regenerated")

  const competitive = result.queue.find((item) => item.docType === "competitive")!
  assert.equal(competitive.status, "skipped")
})

test("loop: skipped docs still have 0 credit cost", async () => {
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async () => true,
    (type) => type === "mockups" ? "done" : "pending",
    { current: false },
  )
  // mockups should be skipped and not charged
  const mockups = result.queue.find((item) => item.docType === "mockups")!
  assert.equal(mockups.status, "skipped")
  // credits should exclude mockups (30) → only competitive:8+prd:8+mvp:8+launch:4=28
  assert.equal(result.creditsUsed, 28)
})

// =============================================================================
// Loop: error handling
// =============================================================================

test("loop: error on first doc stops loop, returns 'error' status", async () => {
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async (docType) => {
      if (docType === "competitive") throw new Error("API rate limit")
      return true
    },
    allPending,
    { current: false },
  )
  assert.equal(result.status, "error")
  const competitive = result.queue.find((item) => item.docType === "competitive")!
  assert.equal(competitive.status, "error")
  assert.equal(competitive.error, "API rate limit")
})

test("loop: error on middle doc leaves preceding docs done and following docs pending", async () => {
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async (docType) => {
      if (docType === "prd") throw new Error("PRD failed")
      return true
    },
    allPending,
    { current: false },
  )
  assert.equal(result.status, "error")

  const competitive = result.queue.find((item) => item.docType === "competitive")!
  const prd = result.queue.find((item) => item.docType === "prd")!
  const mvp = result.queue.find((item) => item.docType === "mvp")!

  assert.equal(competitive.status, "done") // completed before error
  assert.equal(prd.status, "error")
  assert.equal(mvp.status, "pending") // never reached
})

test("loop: error on last doc (launch) marks only launch as error", async () => {
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async (docType) => {
      if (docType === "launch") throw new Error("Launch failed")
      return true
    },
    allPending,
    { current: false },
  )
  assert.equal(result.status, "error")
  const launch = result.queue.find((item) => item.docType === "launch")!
  assert.equal(launch.status, "error")
  assert.equal(launch.error, "Launch failed")
  // first 4 docs should be done
  const doneCount = result.queue.filter((item) => item.status === "done").length
  assert.equal(doneCount, 4)
})

test("loop: generateDocument returning false is treated as an error (not crash)", async () => {
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async (docType) => {
      if (docType === "mvp") return false // returns false instead of throwing
      return true
    },
    allPending,
    { current: false },
  )
  assert.equal(result.status, "error")
  const mvp = result.queue.find((item) => item.docType === "mvp")!
  assert.equal(mvp.status, "error")
  assert.equal(mvp.error, "Generation failed")
})

test("loop: credits only count docs that succeeded before the error", async () => {
  // competitive (8) succeeds, prd (8) errors → only 8 credits used
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async (docType) => {
      if (docType === "prd") throw new Error("prd error")
      return true
    },
    allPending,
    { current: false },
  )
  assert.equal(result.creditsUsed, 8) // only competitive was charged
})

// =============================================================================
// Loop: cancellation
// =============================================================================

test("loop: cancelledRef=true before loop starts results in 'cancelled' with 0 docs processed", async () => {
  let callCount = 0
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async () => { callCount++; return true },
    allPending,
    { current: true }, // already cancelled
  )
  assert.equal(result.status, "cancelled")
  assert.equal(callCount, 0)
})

test("loop: cancel mid-generation stops further docs from being processed", async () => {
  const cancelledRef = { current: false }
  const processed: string[] = []

  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async (docType) => {
      processed.push(docType)
      // Cancel after competitive finishes
      if (docType === "competitive") cancelledRef.current = true
      return true
    },
    allPending,
    cancelledRef,
  )
  assert.equal(result.status, "cancelled")
  // competitive was processed; prd might have been called then loop saw cancel
  // At minimum, not all 5 should have been processed
  assert.ok(processed.length < GENERATE_ALL_QUEUE_ORDER.length)
})

test("loop: cancelled docs remain in pending/generating — not forced to 'cancelled' status", async () => {
  // The loop itself doesn't mark items as 'cancelled'; that's done by cancelGenerateAll() in the context.
  // The loop just stops processing. Remaining items stay 'pending'.
  const cancelledRef = { current: false }
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async (docType) => {
      if (docType === "prd") cancelledRef.current = true
      return true // prd succeeds but then loop checks cancelled
    },
    allPending,
    cancelledRef,
  )
  assert.equal(result.status, "cancelled")

  // mvp, mockups, launch were never touched by the loop → still pending
  const mvp = result.queue.find((item) => item.docType === "mvp")!
  assert.ok(mvp.status === "pending" || mvp.status === "cancelled") // pending in sim, context marks cancelled
})

// =============================================================================
// Loop: AbortError (treated as cancellation, not an error)
// =============================================================================

test("loop: AbortError with cancelledRef=true → 'cancelled' status, not 'error'", async () => {
  // Normal cancel flow: cancel() sets cancelledRef=true, then abort() fires → AbortError
  const cancelledRef = { current: true }
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async () => {
      throw new DOMException("The operation was aborted", "AbortError")
    },
    allPending,
    cancelledRef,
  )
  // cancelledRef is true so we break before calling generateDoc at all
  assert.equal(result.status, "cancelled")
})

test("loop: AbortError with cancelledRef=false → loop exits, final pass runs", async () => {
  // An unexpected abort (no user cancel): the loop exits, final verification pass runs.
  // competitive was set to 'generating' then aborted, so the final pass checks live status.
  // Since live status returns 'pending' (not 'done'), it gets marked 'error'.
  const result = await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async (docType) => {
      if (docType === "competitive") throw new DOMException("Abort", "AbortError")
      return true
    },
    allPending, // live status returns "pending", not "done"
    { current: false },
  )
  // Loop broke out of catch without setting error status.
  // cancelledRef is false → falls to final verification pass.
  // competitive is "generating" → live status "pending" → marked "error" in final pass.
  // Overall status: "completed" (matching context behavior — the loop considered itself done).
  assert.equal(result.status, "completed")
  const competitive = result.queue.find((item) => item.docType === "competitive")!
  assert.equal(competitive.status, "error")
  assert.equal(competitive.error, "Did not complete")
})

// =============================================================================
// Loop: partial queue (some items pre-skipped)
// =============================================================================

test("loop: queue with pre-skipped items still generates remaining pending docs", async () => {
  const mixedQueue: SimItem[] = GENERATE_ALL_QUEUE_ORDER.map((docType) => ({
    docType,
    status: docType === "competitive" ? ("skipped" as const) : ("pending" as const),
  }))
  const generated: string[] = []
  const result = await simulateLoop(
    mixedQueue,
    DEFAULT_MODELS,
    async (docType) => { generated.push(docType); return true },
    allPending,
    { current: false },
  )
  assert.equal(result.status, "completed")
  assert.ok(!generated.includes("competitive"))
  assert.ok(generated.includes("prd"))
  assert.ok(generated.includes("mvp"))
  assert.ok(generated.includes("mockups"))
  assert.ok(generated.includes("launch"))
})

test("loop: sequential dependency order is maintained (competitive before prd before mvp)", async () => {
  const order: string[] = []
  await simulateLoop(
    pendingQueue(),
    DEFAULT_MODELS,
    async (docType) => { order.push(docType); return true },
    allPending,
    { current: false },
  )
  assert.ok(order.indexOf("competitive") < order.indexOf("prd"))
  assert.ok(order.indexOf("prd") < order.indexOf("mvp"))
  assert.ok(order.indexOf("mvp") < order.indexOf("mockups"))
  assert.ok(order.indexOf("mockups") < order.indexOf("launch"))
})

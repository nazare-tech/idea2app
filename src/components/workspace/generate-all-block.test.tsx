import test from "node:test"
import assert from "node:assert/strict"

import { GENERATE_ALL_QUEUE_ORDER } from "@/lib/document-definitions"
import type { QueueItem } from "@/lib/generate-all-helpers"
import { buildGenerateAllDisplayQueue } from "./generate-all-block"

test("buildGenerateAllDisplayQueue adds AI Prompts without changing the real Generate All order", () => {
  const queue: QueueItem[] = GENERATE_ALL_QUEUE_ORDER.map((docType) => ({
    docType,
    label: docType,
    status: "pending",
    creditCost: docType === "mockups" ? 0 : 10,
  }))

  const displayQueue = buildGenerateAllDisplayQueue(queue)

  assert.deepEqual(queue.map((item) => item.docType), GENERATE_ALL_QUEUE_ORDER)
  assert.deepEqual(displayQueue.map((item) => item.docType), [
    ...GENERATE_ALL_QUEUE_ORDER,
    "ai-prompts",
  ])
  assert.equal(displayQueue.at(-1)?.label, "AI Prompts")
  assert.equal(displayQueue.at(-1)?.creditCost, 0)
})

test("buildGenerateAllDisplayQueue marks AI Prompts done once PRD and MVP are content-ready", () => {
  const queue: QueueItem[] = [
    { docType: "competitive", label: "Market Research", status: "done", creditCost: 0 },
    { docType: "prd", label: "Product Plan", status: "done", creditCost: 0 },
    { docType: "mvp", label: "First Version Plan", status: "done", creditCost: 0 },
    { docType: "mockups", label: "Design Mockups", status: "generating", creditCost: 0 },
  ]

  const aiPrompts = buildGenerateAllDisplayQueue(queue).find((item) => item.docType === "ai-prompts")

  assert.equal(aiPrompts?.status, "done")
})

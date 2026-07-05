import test from "node:test"
import assert from "node:assert/strict"

import {
  buildOnboardingGenerationQueue,
  mapOnboardingLoadingRows,
} from "./onboarding-generation"
import type { Json } from "@/types/database"

test("buildOnboardingGenerationQueue: includes mockups after MVP without derived AI Prompts", () => {
  const queue = buildOnboardingGenerationQueue("test-run")
  const docTypes = queue.map((item) => item.docType)

  assert.deepEqual(docTypes, ["competitive", "prd", "mvp", "mockups"])
  assert.deepEqual(queue.find((item) => item.docType === "mockups")?.dependsOn, ["mvp"])
  assert.equal(queue.find((item) => item.docType === "mockups")?.creditCost, 0)
})

test("mapOnboardingLoadingRows: exposes AI Prompts as a derived display row", () => {
  const rows = mapOnboardingLoadingRows({
    queueRow: {
      status: "running",
      queue: buildOnboardingGenerationQueue("test-run") as unknown as Json,
    },
    completedDocs: {
      competitive: true,
      prd: true,
      mvp: true,
    },
  })

  const rowKeys = rows.map((row) => row.key)
  const aiPrompts = rows.find((row) => row.key === "ai-prompts")

  assert.ok(rowKeys.indexOf("mockups") < rowKeys.indexOf("ai-prompts"))
  assert.equal(aiPrompts?.label, "AI Prompts")
  assert.equal(aiPrompts?.docType, "mvp")
  assert.equal(aiPrompts?.status, "done")
})

test("mapOnboardingLoadingRows: keeps derived AI Prompts waiting while upstream handoff content is generating", () => {
  const queue = buildOnboardingGenerationQueue("test-run").map((item) =>
    item.docType === "mvp"
      ? { ...item, status: "generating" as const, stageMessage: "Planning first version" }
      : item,
  )

  const rows = mapOnboardingLoadingRows({
    queueRow: {
      status: "running",
      queue: queue as unknown as Json,
    },
    completedDocs: {
      competitive: true,
      prd: true,
    },
  })

  assert.equal(rows.find((row) => row.key === "ai-prompts")?.status, "pending")
})

test("mapOnboardingLoadingRows: exposes mockup progress", () => {
  const queue = buildOnboardingGenerationQueue("test-run").map((item) =>
    item.docType === "mockups"
      ? { ...item, status: "generating" as const, stageMessage: "Generating visual directions" }
      : item,
  )

  const rows = mapOnboardingLoadingRows({
    queueRow: {
      status: "running",
      queue: queue as unknown as Json,
    },
    completedDocs: {
      competitive: true,
      prd: true,
      mvp: true,
    },
  })

  const mockups = rows.find((row) => row.key === "mockups")
  assert.equal(mockups?.label, "Design mockups")
  assert.equal(mockups?.docType, "mockups")
  assert.equal(mockups?.status, "generating")
})

test("mapOnboardingLoadingRows: marks mockups done from saved document state", () => {
  const rows = mapOnboardingLoadingRows({
    queueRow: {
      status: "running",
      queue: buildOnboardingGenerationQueue("test-run") as unknown as Json,
    },
    completedDocs: {
      mockups: true,
    },
  })

  assert.equal(rows.find((row) => row.key === "mockups")?.status, "done")
})

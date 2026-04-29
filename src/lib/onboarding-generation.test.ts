import test from "node:test"
import assert from "node:assert/strict"

import {
  buildOnboardingGenerationQueue,
  mapOnboardingLoadingRows,
} from "./onboarding-generation"
import type { Json } from "@/types/database"

test("buildOnboardingGenerationQueue: includes mockups after MVP", () => {
  const queue = buildOnboardingGenerationQueue("test-run")
  const docTypes = queue.map((item) => item.docType)

  assert.deepEqual(docTypes, ["competitive", "prd", "mvp", "mockups", "launch"])
  assert.deepEqual(queue.find((item) => item.docType === "mockups")?.dependsOn, ["mvp"])
  assert.equal(queue.find((item) => item.docType === "mockups")?.creditCost, 0)
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
  assert.equal(mockups?.label, "Mockups")
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

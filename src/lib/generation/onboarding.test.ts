import test from "node:test"
import assert from "node:assert/strict"

import {
  buildOnboardingGenerationQueue,
  mapOnboardingLoadingRows,
} from "@/lib/generation/onboarding"
import { getAiPromptsReadiness } from "@/lib/ai-prompts-readiness"
import type { Json } from "@/types/database"

const completePrd = `# PRD: Fixture

## 3. Team and Milestones
### Agents
- **Engineer**: Build the product.

## 6. Functional requirements
- FR-001

## 7. User stories and acceptance criteria
- US-001

## 9. Technical considerations
- Use the existing stack.
`

const completeMvp = `# First Version Plan: Fixture

## MVP Summary
Build the first version.

## Recommended AI Build Tool
### Cursor
- **Why it fits**: Repo-aware.

## AI-Friendly Build Sequence
1. Build it.

## Next Prompt for AI Coding Tool
Build it.
`

test("buildOnboardingGenerationQueue: includes mockups after MVP without derived AI Prompts", () => {
  const queue = buildOnboardingGenerationQueue("test-run")
  const docTypes = queue.map((item) => item.docType)

  assert.deepEqual(docTypes, ["competitive", "prd", "mvp", "mockups"])
  assert.deepEqual(queue.find((item) => item.docType === "mockups")?.dependsOn, ["mvp"])
  assert.equal(queue.find((item) => item.docType === "mockups")?.creditCost, 0)
})

test("mapOnboardingLoadingRows: exposes AI Prompts as a derived display row", () => {
  const aiPromptsReadiness = getAiPromptsReadiness({
    prdContent: completePrd,
    mvpContent: completeMvp,
    prdSettled: true,
    mvpSettled: true,
  })
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
    aiPromptsReadiness,
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
    aiPromptsReadiness: getAiPromptsReadiness({
      prdContent: completePrd,
      mvpContent: null,
      prdSettled: true,
      mvpSettled: false,
    }),
  })

  assert.equal(rows.find((row) => row.key === "ai-prompts")?.status, "partial")
})

test("mapOnboardingLoadingRows: does not mark settled incomplete AI Prompts ready", () => {
  const rows = mapOnboardingLoadingRows({
    queueRow: {
      status: "completed",
      queue: buildOnboardingGenerationQueue("test-run") as unknown as Json,
    },
    completedDocs: { prd: true, mvp: true },
    aiPromptsReadiness: getAiPromptsReadiness({
      prdContent: "# PRD\n\n## 1. Introduction/overview\nPartial.",
      mvpContent: "# First Version Plan\n\n## MVP Summary\nPartial.",
      prdSettled: true,
      mvpSettled: true,
    }),
  })

  assert.equal(rows.find((row) => row.key === "ai-prompts")?.status, "incomplete")
})

test("mapOnboardingLoadingRows: exposes failed source generation for AI Prompts", () => {
  const queue = buildOnboardingGenerationQueue("test-run").map((item) =>
    item.docType === "mvp" ? { ...item, status: "error" as const } : item,
  )
  const rows = mapOnboardingLoadingRows({
    queueRow: { status: "error", queue: queue as unknown as Json },
    completedDocs: { competitive: true, prd: true },
    aiPromptsReadiness: getAiPromptsReadiness({
      prdContent: completePrd,
      mvpContent: null,
      prdSettled: true,
      mvpSettled: false,
    }),
  })

  assert.equal(rows.find((row) => row.key === "ai-prompts")?.status, "error")
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

import test from "node:test"
import assert from "node:assert/strict"

import {
  buildStorageRecoveredMockupOptions,
  mergeRecoveredMockupOptions,
} from "./mockup-option-recovery"
import type { OpenRouterImageMockupOption } from "@/lib/openrouter-image-mockup-format"

const projectId = "project-1"
const runId = "123e4567-e89b-12d3-a456-426614174000"

function makeDraftOption(label: "A" | "B" | "C"): OpenRouterImageMockupOption {
  return {
    label,
    title: `Draft Concept ${label}`,
    imageUrl: `/draft-${label.toLowerCase()}`,
    storagePath: `${projectId}/${runId}/option-${label.toLowerCase()}-storyboard.png`,
    description: `Draft ${label}`,
    contentType: "image/png",
  }
}

test("recover options merge DB drafts with Storage-only missing labels", () => {
  const draftOptions = [makeDraftOption("A")]
  const storageOptions = buildStorageRecoveredMockupOptions({
    files: [
      { name: "option-a-storyboard.png" },
      { name: "option-b-storyboard.webp" },
    ],
    projectId,
    runId,
  })

  const merged = mergeRecoveredMockupOptions({ draftOptions, storageOptions })

  assert.deepEqual(merged.map((option) => option.label), ["A", "B"])
  assert.equal(merged[0]?.title, "Draft Concept A")
  assert.equal(merged[0]?.imageUrl, "/draft-a")
  assert.equal(
    merged[1]?.storagePath,
    `${projectId}/${runId}/option-b-storyboard.webp`,
  )
  assert.match(merged[1]?.imageUrl ?? "", /draftRunId=123e4567-e89b-12d3-a456-426614174000/)
})

test("recover options ignore unsupported Storage files", () => {
  const storageOptions = buildStorageRecoveredMockupOptions({
    files: [
      { name: "option-a-storyboard.svg" },
      { name: "option-d-storyboard.png" },
      { name: "option-c-storyboard.jpg" },
    ],
    projectId,
    runId,
  })

  assert.deepEqual(storageOptions.map((option) => option.label), ["C"])
  assert.equal(storageOptions[0]?.contentType, "image/jpeg")
})

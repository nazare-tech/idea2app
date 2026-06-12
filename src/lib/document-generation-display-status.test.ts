import test from "node:test"
import assert from "node:assert/strict"

import {
  buildDocumentGenerationDisplayStates,
  type MockupOptionStatus,
} from "./document-generation-display-status"
import type { DocumentType } from "./document-definitions"
import type { QueueItem } from "./generate-all-helpers"

const docTypes: DocumentType[] = ["competitive", "prd", "mvp", "mockups"]
const labels: Partial<Record<DocumentType, string>> = {
  competitive: "Market Research",
  prd: "Product Plan",
  mvp: "First Version Plan",
  mockups: "Design Mockups",
}

function item(docType: DocumentType, status: QueueItem["status"], extra: Partial<QueueItem> = {}): QueueItem {
  return {
    docType,
    label: labels[docType] ?? docType,
    status,
    creditCost: 0,
    ...extra,
  }
}

test("buildDocumentGenerationDisplayStates: content wins over stale queue status", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: { prd: true },
    queueItems: [item("prd", "generating")],
  })

  assert.equal(states.prd.displayStatus, "ready")
  assert.equal(states.prd.navStatus, "done")
})

test("buildDocumentGenerationDisplayStates: pending queue item maps to queued", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
    queueItems: [item("mvp", "pending")],
  })

  assert.equal(states.mvp.displayStatus, "queued")
  assert.equal(states.mvp.navStatus, "pending")
  assert.equal(states.mvp.message, "Queued")
})

test("buildDocumentGenerationDisplayStates: missing content without queue state maps to idle", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
  })

  assert.equal(states.prd.displayStatus, "idle")
  assert.equal(states.prd.navStatus, "pending")
})

test("buildDocumentGenerationDisplayStates: completed queue waits for saved content before ready", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: { prd: false },
    queueItems: [item("prd", "done")],
  })

  assert.equal(states.prd.displayStatus, "generating")
  assert.equal(states.prd.navStatus, "in_progress")
  assert.equal(states.prd.message, "Loading saved content")
})

test("buildDocumentGenerationDisplayStates: generating queue item maps to generating", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
    queueItems: [item("mockups", "generating", { stageMessage: "Generating visual directions" })],
  })

  assert.equal(states.mockups.displayStatus, "generating")
  assert.equal(states.mockups.navStatus, "in_progress")
  assert.equal(states.mockups.message, "Generating visual directions")
})

test("buildDocumentGenerationDisplayStates: PRD generating state does not expose stream preview", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
    queueItems: [item("prd", "generating", { stageMessage: "Drafting product requirements" })],
  })

  assert.equal(states.prd.displayStatus, "generating")
  assert.equal(states.prd.navStatus, "in_progress")
  assert.equal("streamPreview" in states.prd, false)
})

test("buildDocumentGenerationDisplayStates: queue error maps to needs_retry", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
    queueItems: [item("competitive", "error", { error: "Market research failed" })],
  })

  assert.equal(states.competitive.displayStatus, "needs_retry")
  assert.equal(states.competitive.navStatus, "needs_retry")
  assert.equal(states.competitive.detail, "Market research failed")
})

test("buildDocumentGenerationDisplayStates: blocked dependents show waiting without retry", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
    queueItems: [
      item("prd", "error", { error: "Product Plan timed out" }),
      item("mvp", "blocked", { error: "Blocked by a failed or missing dependency" }),
      item("mockups", "blocked", { error: "Blocked by a failed or missing dependency" }),
    ],
  })

  assert.equal(states.prd.displayStatus, "needs_retry")
  assert.equal(states.prd.navStatus, "needs_retry")
  assert.equal(states.mvp.displayStatus, "waiting")
  assert.equal(states.mvp.navStatus, "pending")
  assert.equal(states.mvp.message, "Waiting")
  assert.match(states.mvp.detail ?? "", /waiting for the Product Plan/i)
  assert.equal(states.mockups.displayStatus, "waiting")
  assert.equal(states.mockups.navStatus, "pending")
  assert.equal(states.mockups.message, "Waiting")
  assert.match(states.mockups.detail ?? "", /waiting for the First Version Plan/i)
})

test("buildDocumentGenerationDisplayStates: blocked item becomes idle when prerequisite content exists", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: { prd: true },
    queueItems: [
      item("mvp", "blocked", { error: "Blocked by a failed or missing dependency" }),
    ],
  })

  assert.equal(states.prd.displayStatus, "ready")
  assert.equal(states.mvp.displayStatus, "idle")
  assert.equal(states.mvp.navStatus, "pending")
})

test("buildDocumentGenerationDisplayStates: retry detail redacts OpenRouter key links", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
    queueItems: [item("mockups", "error", {
      error: "402 requires fewer max_tokens. Visit https://openrouter.ai/workspaces/default/keys/sk-secret-key-value and adjust key=abc123",
    })],
  })

  assert.equal(
    states.mockups.detail,
    "402 requires fewer max_tokens. Visit the OpenRouter key settings and adjust key=[redacted]",
  )
})

test("buildDocumentGenerationDisplayStates: retry detail hides technical JSON parser errors", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
    queueItems: [item("mockups", "error", {
      error: "The request took too long or hit a temporary service issue. Try again and we will use the latest saved project context.\n\nExpected ',' or ']' after array element in JSON at position 6807 (line 84 column 6)",
    })],
  })

  assert.equal(
    states.mockups.detail,
    "The request took too long or hit a temporary service issue. Try again and we will use the latest saved project context.",
  )
})

test("buildDocumentGenerationDisplayStates: local generation overrides stale queue error", () => {
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
    queueItems: [item("mockups", "error", { error: "Mockups timed out" })],
    locallyGenerating: { mockups: true },
  })

  assert.equal(states.mockups.displayStatus, "generating")
  assert.equal(states.mockups.navStatus, "in_progress")
  assert.equal(states.mockups.detail, "Design mockups will appear here when the generated concepts are ready.")
})

test("buildDocumentGenerationDisplayStates: mockup option statuses are only attached when supplied", () => {
  const options: MockupOptionStatus[] = [
    { label: "Concept 1", status: "ready", message: "Ready" },
    { label: "Concept 2", status: "generating", message: "Generating" },
    { label: "Concept 3", status: "queued", message: "Queued" },
  ]

  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
    queueItems: [item("mockups", "generating")],
    mockupOptionStatuses: options,
  })

  assert.deepEqual(states.mockups.mockupOptionStatuses, options)

  const withoutOptions = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
    queueItems: [item("mockups", "generating")],
  })

  assert.equal(withoutOptions.mockups.mockupOptionStatuses, undefined)
})

test("buildDocumentGenerationDisplayStates: mockup preview images attach only while generating mockups", () => {
  const previewImages = ["/api/mockups/image?projectId=p&path=p%2Fr%2Foption-a-storyboard.png"]
  const states = buildDocumentGenerationDisplayStates({
    documentTypes: docTypes,
    labels,
    hasContent: {},
    queueItems: [item("mockups", "generating")],
    mockupPreviewImages: previewImages,
  })

  assert.deepEqual(states.mockups.mockupPreviewImages, previewImages)
  assert.equal(states.prd.mockupPreviewImages, undefined)
})

import test from "node:test"
import assert from "node:assert/strict"

import {
  buildDocumentGenerationDisplayStates,
  type MockupOptionStatus,
} from "./document-generation-display-status"
import type { DocumentType } from "./document-definitions"
import type { QueueItem } from "./generate-all-helpers"

const docTypes: DocumentType[] = ["competitive", "prd", "mvp", "mockups", "launch"]
const labels: Partial<Record<DocumentType, string>> = {
  competitive: "Competitive Research",
  prd: "PRD",
  mvp: "MVP Plan",
  mockups: "Mockups",
  launch: "Marketing",
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
    queueItems: [item("launch", "error", { error: "Launch failed" })],
  })

  assert.equal(states.launch.displayStatus, "needs_retry")
  assert.equal(states.launch.navStatus, "needs_retry")
  assert.equal(states.launch.detail, "Launch failed")
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

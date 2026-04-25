import assert from "node:assert/strict"
import test from "node:test"

import {
  createSkippedActiveDocumentPayload,
  getActiveDocumentIdentity,
  getActiveDocumentIdentityForAnalysisType,
  getDuplicateActiveDocumentIds,
} from "./active-document-policy"

test("getActiveDocumentIdentity: maps document types to storage identities", () => {
  assert.deepEqual(getActiveDocumentIdentity("competitive"), {
    documentType: "competitive",
    outputTable: "analyses",
    analysisType: "competitive-analysis",
  })
  assert.deepEqual(getActiveDocumentIdentity("launch"), {
    documentType: "launch",
    outputTable: "analyses",
    analysisType: "launch-plan",
  })
  assert.deepEqual(getActiveDocumentIdentity("prd"), {
    documentType: "prd",
    outputTable: "prds",
  })
  assert.equal(getActiveDocumentIdentity("deploy"), null)
})

test("getActiveDocumentIdentityForAnalysisType: maps route types to document identities", () => {
  assert.equal(getActiveDocumentIdentityForAnalysisType("prd")?.documentType, "prd")
  assert.equal(getActiveDocumentIdentityForAnalysisType("mvp-plan")?.documentType, "mvp")
  assert.equal(getActiveDocumentIdentityForAnalysisType("tech-spec")?.documentType, "techspec")
  assert.equal(getActiveDocumentIdentityForAnalysisType("competitive-analysis")?.documentType, "competitive")
  assert.equal(getActiveDocumentIdentityForAnalysisType("gap-analysis"), null)
})

test("getDuplicateActiveDocumentIds: keeps newest row per project and type", () => {
  const duplicateIds = getDuplicateActiveDocumentIds([
    { id: "old-prd", project_id: "p1", created_at: "2026-01-01T00:00:00Z" },
    { id: "new-prd", project_id: "p1", created_at: "2026-01-02T00:00:00Z" },
    { id: "only-prd", project_id: "p2", created_at: "2026-01-01T00:00:00Z" },
    { id: "old-launch", project_id: "p1", type: "launch-plan", created_at: "2026-01-01T00:00:00Z" },
    { id: "new-launch", project_id: "p1", type: "launch-plan", created_at: "2026-01-03T00:00:00Z" },
  ])

  assert.deepEqual(duplicateIds.sort(), ["old-launch", "old-prd"])
})

test("createSkippedActiveDocumentPayload: returns a stable duplicate response", () => {
  assert.deepEqual(
    createSkippedActiveDocumentPayload({
      documentType: "mockups",
      outputTable: "mockups",
      outputId: "m1",
      createdAt: "2026-01-01T00:00:00Z",
    }),
    {
      skipped: true,
      reason: "document_already_exists",
      existingDocument: {
        documentType: "mockups",
        outputTable: "mockups",
        outputId: "m1",
        createdAt: "2026-01-01T00:00:00Z",
      },
    },
  )
})

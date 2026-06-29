import test from "node:test"
import assert from "node:assert/strict"

import {
  normalizeMockupDraftOptionRows,
  type MockupDraftOptionLabel,
} from "./mockup-option-drafts"
import type { Database } from "@/types/database"

type MockupOptionDraftRow = Database["public"]["Tables"]["mockup_option_drafts"]["Row"]

function makeDraftRow({
  label,
  runId = "123e4567-e89b-12d3-a456-426614174000",
  storagePath,
  contentType = "image/png",
}: {
  label: MockupDraftOptionLabel
  runId?: string
  storagePath?: string
  contentType?: string
}): MockupOptionDraftRow {
  return {
    id: `${label.toLowerCase()}-draft`,
    project_id: "project-1",
    user_id: "user-1",
    run_id: runId,
    option_label: label,
    option_json: {
      label,
      title: `Concept ${label}`,
      imageUrl: "/stale-url",
      storagePath: storagePath ?? `project-1/${runId}/option-${label.toLowerCase()}-storyboard.png`,
      description: `Concept ${label} description`,
      contentType,
      screens: [
        { name: "Dashboard", caption: "Review the generated workflow" },
      ],
      width: 1536,
      height: 672,
    },
    model_used: "openai/gpt-5.4-image-2",
    source: "openrouter-image-v2",
    design_plan: null,
    created_at: "2026-06-28T00:00:00.000Z",
    updated_at: "2026-06-28T00:00:00.000Z",
  }
}

test("normalizeMockupDraftOptionRows: sorts options and rebuilds draft proxy URLs", () => {
  const runId = "123e4567-e89b-12d3-a456-426614174000"
  const options = normalizeMockupDraftOptionRows({
    rows: [
      makeDraftRow({ label: "C", runId }),
      makeDraftRow({ label: "A", runId }),
    ],
    projectId: "project-1",
    runId,
  })

  assert.deepEqual(options.map((option) => option.label), ["A", "C"])
  assert.equal(
    options[0]?.imageUrl,
    "/api/mockups/image?projectId=project-1&path=project-1%2F123e4567-e89b-12d3-a456-426614174000%2Foption-a-storyboard.png&draftRunId=123e4567-e89b-12d3-a456-426614174000",
  )
  assert.equal(options[0]?.screens?.[0]?.name, "Dashboard")
})

test("normalizeMockupDraftOptionRows: rejects rows with mismatched paths or unsupported image types", () => {
  const runId = "123e4567-e89b-12d3-a456-426614174000"
  const options = normalizeMockupDraftOptionRows({
    rows: [
      makeDraftRow({
        label: "A",
        runId,
        storagePath: `project-1/other-run/option-a-storyboard.png`,
      }),
      makeDraftRow({
        label: "B",
        runId,
        contentType: "image/svg+xml",
      }),
      makeDraftRow({ label: "C", runId }),
    ],
    projectId: "project-1",
    runId,
  })

  assert.deepEqual(options.map((option) => option.label), ["C"])
})

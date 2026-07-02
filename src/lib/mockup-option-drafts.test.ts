import test from "node:test"
import assert from "node:assert/strict"

import {
  cleanupAbandonedMockupOptionDrafts,
  insertMockupOptionDraftIfMissing,
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

test("insertMockupOptionDraftIfMissing: uses insert-only upsert semantics", async () => {
  const upsertCalls: Array<{ value: unknown; options: unknown }> = []
  const supabase = {
    from(table: string) {
      assert.equal(table, "mockup_option_drafts")
      return {
        upsert(value: unknown, options: unknown) {
          upsertCalls.push({ value, options })
          return { error: null }
        },
      }
    },
  }
  const runId = "123e4567-e89b-12d3-a456-426614174000"

  await insertMockupOptionDraftIfMissing({
    supabase: supabase as never,
    projectId: "project-1",
    userId: "user-1",
    runId,
    model: "openai/gpt-5.4-image-2",
    option: {
      label: "A",
      title: "Recovered Option A",
      imageUrl: "/api/mockups/image?projectId=project-1",
      storagePath: `project-1/${runId}/option-a-storyboard.png`,
      description: "Recovered from Storage",
      contentType: "image/png",
    },
  })

  assert.equal(upsertCalls.length, 1)
  assert.deepEqual(upsertCalls[0]?.options, {
    onConflict: "project_id,run_id,option_label",
    ignoreDuplicates: true,
  })
})

test("cleanupAbandonedMockupOptionDrafts: removes stale unreferenced draft rows and storage objects", async () => {
  const runId = "123e4567-e89b-12d3-a456-426614174000"
  const removedPaths: string[][] = []
  const deletedRunIds: string[] = []
  const supabase = makeCleanupSupabase({
    draftRows: [
      makeDraftRow({ label: "A", runId }),
      makeDraftRow({ label: "B", runId }),
    ],
    canonicalRows: [],
    deletedRunIds,
  })
  const storageSupabase = makeStorageSupabase(removedPaths)

  const result = await cleanupAbandonedMockupOptionDrafts({
    supabase: supabase as never,
    storageSupabase: storageSupabase as never,
    projectId: "project-1",
    userId: "user-1",
    olderThan: new Date("2026-06-29T00:00:00.000Z"),
  })

  assert.deepEqual(result, { runCount: 1, rowCount: 2, storageObjectCount: 2 })
  assert.deepEqual(deletedRunIds, [runId])
  assert.deepEqual(removedPaths[0], [
    `project-1/${runId}/option-a-storyboard.png`,
    `project-1/${runId}/option-b-storyboard.png`,
  ])
})

test("cleanupAbandonedMockupOptionDrafts: protects a whole run when any storage path is canonical", async () => {
  const runId = "123e4567-e89b-12d3-a456-426614174000"
  const removedPaths: string[][] = []
  const deletedRunIds: string[] = []
  const supabase = makeCleanupSupabase({
    draftRows: [
      makeDraftRow({ label: "A", runId }),
      makeDraftRow({ label: "B", runId }),
    ],
    canonicalRows: [
      {
        content: JSON.stringify({
          type: "openrouter-image-v2",
          model: "openai/gpt-5.4-image-2",
          generatedAt: "2026-07-02T00:00:00.000Z",
          options: [
            {
              label: "A",
              title: "Saved option",
              imageUrl: "/api/mockups/image?projectId=project-1",
              storagePath: `project-1/${runId}/option-a-storyboard.png`,
              description: "Canonical saved option",
              contentType: "image/png",
            },
          ],
        }),
        metadata: null,
      },
    ],
    deletedRunIds,
  })
  const storageSupabase = makeStorageSupabase(removedPaths)

  const result = await cleanupAbandonedMockupOptionDrafts({
    supabase: supabase as never,
    storageSupabase: storageSupabase as never,
    projectId: "project-1",
    userId: "user-1",
    olderThan: new Date("2026-06-29T00:00:00.000Z"),
  })

  assert.deepEqual(result, { runCount: 0, rowCount: 0, storageObjectCount: 0 })
  assert.deepEqual(deletedRunIds, [])
  assert.deepEqual(removedPaths, [])
})

function makeCleanupSupabase({
  draftRows,
  canonicalRows,
  deletedRunIds,
}: {
  draftRows: MockupOptionDraftRow[]
  canonicalRows: Array<{ content: string; metadata: unknown }>
  deletedRunIds: string[]
}) {
  return {
    from(table: string) {
      if (table === "mockup_option_drafts") {
        return {
          select() {
            return chain({ data: draftRows, error: null })
          },
          delete() {
            const state: { runId?: string; eqCount: number; error: null } = { eqCount: 0, error: null }
            return {
              error: null,
              eq(column: string, value: string) {
                state.eqCount += 1
                if (column === "run_id") {
                  state.runId = value
                  deletedRunIds.push(value)
                }
                return this
              },
            }
          },
        }
      }
      if (table === "mockups") {
        return {
          select() {
            return {
              eq() {
                return { data: canonicalRows, error: null }
              },
            }
          },
        }
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }
}

function chain(result: unknown) {
  return {
    eq() {
      return this
    },
    lt() {
      return this
    },
    limit() {
      return result
    },
  }
}

function makeStorageSupabase(removedPaths: string[][]) {
  return {
    storage: {
      from(bucket: string) {
        assert.equal(bucket, "mockups")
        return {
          remove(paths: string[]) {
            removedPaths.push(paths)
            return { error: null }
          },
        }
      },
    },
  }
}

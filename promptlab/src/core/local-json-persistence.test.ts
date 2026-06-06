import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import { localJsonPersistence } from "./index.js"

async function createTempStore() {
  const dir = await mkdtemp(path.join(tmpdir(), "promptlab-"))
  const filePath = path.join(dir, "promptlab.local.json")
  return { dir, filePath, store: localJsonPersistence({ path: filePath }) }
}

test("localJsonPersistence saves, lists, and deletes drafts", async () => {
  const { dir, store } = await createTempStore()
  try {
    const draft = await store.saveDraft({
      artifactId: "brief",
      title: "Brief draft",
      model: "openai/gpt-5.4-mini",
      systemPrompt: "System",
      userPrompt: "User",
      notes: "Notes",
    })

    assert.equal(draft.title, "Brief draft")
    assert.equal((await store.listDrafts({ artifactId: "brief" })).length, 1)

    await store.deleteDraft(draft.id)
    assert.deepEqual(await store.listDrafts({ artifactId: "brief" }), [])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test("localJsonPersistence saves run history newest first", async () => {
  const { dir, store } = await createTempStore()
  try {
    await store.saveRun({
      artifactId: "brief",
      title: "First",
      model: "model-a",
      systemPrompt: "System",
      userPrompt: "User",
      result: { kind: "text", content: "First output", metadata: {} },
      status: "completed",
    })
    await store.saveRun({
      artifactId: "brief",
      title: "Second",
      model: "model-a",
      systemPrompt: "System",
      userPrompt: "User",
      result: { kind: "json", value: { ok: true }, metadata: {} },
      status: "completed",
    })

    const runs = await store.listRuns({ artifactId: "brief" })
    assert.equal(runs.length, 2)
    assert.equal(runs[0].title, "Second")
    assert.equal(runs[1].title, "First")
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test("localJsonPersistence preserves corrupted files as a backup", async () => {
  const { dir, filePath, store } = await createTempStore()
  try {
    await writeFile(filePath, "{not-json", "utf8")

    await store.saveDraft({
      artifactId: "brief",
      title: "Recovered",
      model: "model-a",
      systemPrompt: "System",
      userPrompt: "User",
    })

    const backup = await readFile(`${filePath}.corrupt`, "utf8")
    assert.equal(backup, "{not-json")
    assert.equal((await store.listDrafts({ artifactId: "brief" })).length, 1)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

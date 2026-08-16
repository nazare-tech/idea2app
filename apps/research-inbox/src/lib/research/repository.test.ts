import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { ArticleConflictError, createResearchRepository, DocumentTooLargeError, RevisionConflictError } from "./repository"

test("initializes a versioned local JSON document and persists item state", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "research-inbox-test-"))
  const repository = createResearchRepository(directory)
  const initial = await repository.load()
  assert.equal(initial.document.version, 1)
  assert.equal(initial.document.revision, 0)
  assert.ok(initial.document.items.length > 0)

  const saved = await repository.update(initial.document.revision, {
    itemId: initial.document.items[0].id,
    itemPatch: { saved: true, seen: true },
  })
  assert.equal(saved.itemState[initial.document.items[0].id]?.saved, true)
  const disk = JSON.parse(await readFile(path.join(directory, "research-inbox.json"), "utf8"))
  assert.equal(disk.revision, 1)
})

test("rejects stale revisions instead of clobbering a newer JSON write", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "research-inbox-test-"))
  const repository = createResearchRepository(directory)
  const initial = (await repository.load()).document
  await repository.update(initial.revision, { browserMode: "chrome" })
  await assert.rejects(() => repository.update(initial.revision, { browserMode: "safari" }), RevisionConflictError)
})

test("preserves corrupt JSON before recovering a clean seed", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "research-inbox-test-"))
  await writeFile(path.join(directory, "research-inbox.json"), "not-json", "utf8")
  const loaded = await createResearchRepository(directory).load()
  assert.equal(loaded.document.version, 1)
  assert.match(loaded.recovery?.message || "", /preserved/i)
})

test("handles simultaneous first bootstraps without sharing a temp filename", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "research-inbox-test-"))
  const repository = createResearchRepository(directory)
  const loaded = await Promise.all(Array.from({ length: 8 }, () => repository.load()))
  assert.equal(loaded.length, 8)
  assert.ok(loaded.every(({ document }) => document.version === 1))
})

test("merges deduplicated research while preserving existing cards and user state", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "research-inbox-test-"))
  const repository = createResearchRepository(directory)
  const initial = (await repository.load()).document
  const existingId = initial.items[0].id
  await repository.update(initial.revision, { itemId: existingId, itemPatch: { saved: true, draft: "Keep this draft." } })

  const merged = await repository.mergeResearchRun({
    rawItemCount: 12,
    availableSources: 7,
    missingSources: ["x"],
    dateRange: "July 16 to August 15, 2026",
    warnings: ["one bounded warning"],
    items: [
      { ...initial.items[0], id: "duplicate-id" },
      {
        id: "last30days-web-new-card",
        source: "web",
        sourceLabel: "Example",
        title: "New evidence",
        excerpt: "A new validated result.",
        url: "https://example.com/new-evidence",
        publishedAt: "2026-08-15",
        engagementLabel: "Recent",
        tags: ["validation"],
        quality: "strong",
      },
    ],
  })

  assert.equal(merged.importedCount, 1)
  assert.equal(merged.warningCount, 1)
  assert.equal(merged.document.items.length, initial.items.length + 1)
  assert.equal(merged.document.itemState[existingId]?.saved, true)
  assert.equal(merged.document.itemState[existingId]?.draft, "Keep this draft.")
  assert.equal(merged.document.browserMode, initial.browserMode)
  assert.ok(merged.document.visibleIds.includes("last30days-web-new-card"))
  assert.equal(merged.document.workspace.rawItemCount, initial.workspace.rawItemCount + 12)
})

test("persists a sub-100-word reply without a 500-character truncation", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "research-inbox-test-"))
  const repository = createResearchRepository(directory)
  const initial = (await repository.load()).document
  const itemId = initial.items[0].id
  const longReply = Array.from({ length: 99 }, (_, index) => `specificword${index}long`).join(" ")
  assert.ok(longReply.length > 500)

  await repository.update(initial.revision, { itemId, itemPatch: { draft: longReply, seen: true } })
  const reloaded = (await createResearchRepository(directory).load()).document
  assert.equal(reloaded.itemState[itemId]?.draft, longReply)
})

test("atomically saves and explicitly replaces a generated article draft", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "research-inbox-test-"))
  const repository = createResearchRepository(directory)
  const initial = (await repository.load()).document
  const itemId = initial.items[0].id
  const body = Array.from({ length: 900 }, (_, index) => `word${index}`).join(" ")
  const first = { title: "First article", deck: "First deck", body, generatedAt: "2026-08-15T12:00:00.000Z" }
  const saved = await repository.saveArticleDraft(itemId, first)
  assert.deepEqual(saved.itemState[itemId]?.articleDraft, first)
  assert.equal(saved.itemState[itemId]?.seen, true)

  await assert.rejects(() => repository.saveArticleDraft(itemId, { ...first, title: "Second article" }), ArticleConflictError)
  const replaced = await repository.saveArticleDraft(itemId, { ...first, title: "Second article" }, true)
  assert.equal(replaced.itemState[itemId]?.articleDraft?.title, "Second article")
  assert.equal((await createResearchRepository(directory).load()).document.itemState[itemId]?.articleDraft?.title, "Second article")
})

test("rejects writes that would make the next local load treat the document as corrupt", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "research-inbox-test-"))
  const repository = createResearchRepository(directory)
  const initial = (await repository.load()).document
  await assert.rejects(() => repository.update(initial.revision, {
    itemId: initial.items[0].id,
    itemPatch: { draft: "x".repeat(2_000_001) },
  }), DocumentTooLargeError)
  assert.equal((await repository.load()).document.revision, initial.revision)
})

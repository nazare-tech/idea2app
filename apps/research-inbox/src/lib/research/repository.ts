import { constants } from "node:fs"
import { randomUUID } from "node:crypto"
import { access, mkdir, open, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { createSeedDocument } from "./seed"
import type { Last30DaysImportResult } from "./last30days-import"
import type { ArticleDraft, BrowserMode, ResearchDocument, ResearchItemState, ResearchUpdate } from "./types"

const DOCUMENT_NAME = "research-inbox.json"
const LOCK_NAME = "research-inbox.lock"
const MAX_DOCUMENT_BYTES = 2_000_000
const BROWSERS = new Set<BrowserMode>(["default", "chrome", "safari", "firefox", "arc"])

export class RevisionConflictError extends Error {}
export class RepositoryBusyError extends Error {}
export class ArticleConflictError extends Error {}
export class DocumentTooLargeError extends Error {}

function assertDocument(value: unknown): asserts value is ResearchDocument {
  if (!value || typeof value !== "object") throw new Error("Invalid research document")
  const document = value as Partial<ResearchDocument>
  if (document.version !== 1 || !Number.isSafeInteger(document.revision) || !Array.isArray(document.items) || !Array.isArray(document.visibleIds)) {
    throw new Error("Unsupported research document")
  }
  if (!document.workspace || typeof document.workspace.topic !== "string" || !document.itemState || typeof document.itemState !== "object") {
    throw new Error("Incomplete research document")
  }
  if (!BROWSERS.has(document.browserMode as BrowserMode)) throw new Error("Invalid browser mode")
}

function sanitizeItemPatch(patch: ResearchItemState): ResearchItemState {
  const result: ResearchItemState = {}
  for (const key of ["seen", "saved", "archived", "unknownOutcome"] as const) {
    if (typeof patch[key] === "boolean") result[key] = patch[key]
  }
  for (const key of ["repliedAt", "postAttemptedAt", "postDraftHash"] as const) {
    if (typeof patch[key] === "string" && patch[key]!.length <= 128) result[key] = patch[key]
  }
  if (typeof patch.draft === "string") result.draft = patch.draft
  return result
}

function canonicalUrl(value: string) {
  const url = new URL(value)
  url.hash = ""
  return url.toString().replace(/\/$/, "").toLowerCase()
}

async function fileExists(filePath: string) {
  try { await access(filePath, constants.F_OK); return true } catch { return false }
}

async function preserveCorruptFile(filePath: string, directory: string) {
  const backup = `${filePath}.corrupt-${Date.now()}`
  await rename(filePath, backup)
  const backups = (await readdir(directory))
    .filter((name) => name.startsWith(`${DOCUMENT_NAME}.corrupt-`))
    .sort()
  for (const stale of backups.slice(0, Math.max(0, backups.length - 5))) await unlink(path.join(directory, stale))
  return path.basename(backup)
}

export function createResearchRepository(directory = path.join(process.cwd(), ".local")) {
  const filePath = path.join(directory, DOCUMENT_NAME)
  const lockPath = path.join(directory, LOCK_NAME)

  async function writeDocument(document: ResearchDocument) {
    const temporary = path.join(directory, `${DOCUMENT_NAME}.${process.pid}.${randomUUID()}.tmp`)
    const serialized = `${JSON.stringify(document, null, 2)}\n`
    if (Buffer.byteLength(serialized) > MAX_DOCUMENT_BYTES) throw new DocumentTooLargeError("Local research document reached its safe size limit")
    await writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600 })
    await rename(temporary, filePath)
  }

  async function initialize() {
    await mkdir(directory, { recursive: true, mode: 0o700 })
    if (!(await fileExists(filePath))) await writeDocument(createSeedDocument())
  }

  async function readDocument() {
    const raw = await readFile(filePath, "utf8")
    if (Buffer.byteLength(raw) > MAX_DOCUMENT_BYTES) throw new Error("Research document is too large")
    const document: unknown = JSON.parse(raw)
    assertDocument(document)
    return document
  }

  async function load(): Promise<{ document: ResearchDocument; recovery?: { message: string } }> {
    await initialize()
    try {
      return { document: await readDocument() }
    } catch {
      const backup = await preserveCorruptFile(filePath, directory)
      const document = createSeedDocument()
      await writeDocument(document)
      return { document, recovery: { message: `Corrupt local JSON was preserved as ${backup}; a clean workspace was restored.` } }
    }
  }

  async function acquireLock() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try { return await open(lockPath, "wx", 0o600) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
        await new Promise((resolve) => setTimeout(resolve, 15 + attempt * 4))
      }
    }
    throw new RepositoryBusyError("Local research file is busy")
  }

  async function update(expectedRevision: number, updateValue: ResearchUpdate) {
    await initialize()
    const lock = await acquireLock()
    try {
      const current = await readDocument()
      if (current.revision !== expectedRevision) throw new RevisionConflictError("Research data changed in another tab")
      const next: ResearchDocument = structuredClone(current)
      const ids = new Set(current.items.map((item) => item.id))
      if (updateValue.itemPatch) {
        if (!updateValue.itemId || !ids.has(updateValue.itemId)) throw new Error("Unknown research item")
        next.itemState[updateValue.itemId] = {
          ...(next.itemState[updateValue.itemId] ?? {}),
          ...sanitizeItemPatch(updateValue.itemPatch),
        }
      }
      if (updateValue.visibleIds) {
        if (updateValue.visibleIds.length > current.items.length || updateValue.visibleIds.some((id) => !ids.has(id))) throw new Error("Invalid visible item list")
        next.visibleIds = [...new Set(updateValue.visibleIds)]
      }
      if (updateValue.browserMode) {
        if (!BROWSERS.has(updateValue.browserMode)) throw new Error("Invalid browser mode")
        next.browserMode = updateValue.browserMode
      }
      next.revision += 1
      next.updatedAt = new Date().toISOString()
      await writeDocument(next)
      return next
    } finally {
      await lock.close()
      await unlink(lockPath).catch(() => undefined)
    }
  }

  async function mergeResearchRun(result: Last30DaysImportResult) {
    await initialize()
    const lock = await acquireLock()
    try {
      const current = await readDocument()
      const next: ResearchDocument = structuredClone(current)
      const existingUrls = new Set(next.items.map((item) => canonicalUrl(item.url)))
      const existingIds = new Set(next.items.map((item) => item.id))
      const addedIds: string[] = []

      for (const item of result.items) {
        const url = canonicalUrl(item.url)
        if (existingUrls.has(url) || existingIds.has(item.id)) continue
        existingUrls.add(url)
        existingIds.add(item.id)
        next.items.push(item)
        addedIds.push(item.id)
      }

      next.workspace.rawItemCount += result.rawItemCount
      next.workspace.availableSources = Math.max(next.workspace.availableSources, result.availableSources)
      next.workspace.missingSources = result.missingSources
      if (result.dateRange) next.workspace.dateRange = result.dateRange
      next.visibleIds = [...next.visibleIds, ...addedIds.slice(0, 6)]
      next.revision += 1
      next.updatedAt = new Date().toISOString()
      await writeDocument(next)
      return { document: next, importedCount: addedIds.length, warningCount: result.warnings.length }
    } finally {
      await lock.close()
      await unlink(lockPath).catch(() => undefined)
    }
  }

  async function saveArticleDraft(itemId: string, articleDraft: ArticleDraft, replace = false) {
    await initialize()
    const lock = await acquireLock()
    try {
      const current = await readDocument()
      if (!current.items.some((item) => item.id === itemId)) throw new Error("Unknown research item")
      if (current.itemState[itemId]?.articleDraft && !replace) throw new ArticleConflictError("Article draft already exists")
      const next: ResearchDocument = structuredClone(current)
      next.itemState[itemId] = { ...(next.itemState[itemId] ?? {}), seen: true, articleDraft }
      next.revision += 1
      next.updatedAt = new Date().toISOString()
      await writeDocument(next)
      return next
    } finally {
      await lock.close()
      await unlink(lockPath).catch(() => undefined)
    }
  }

  return { filePath, load, update, mergeResearchRun, saveArticleDraft }
}

import { constants } from "node:fs"
import { randomUUID } from "node:crypto"
import { access, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { createSeedDocument } from "./seed"
import type { Last30DaysImportResult } from "./last30days-import"
import type { ArticleDraft, BrowserMode, ResearchDocument, ResearchItemState, ResearchRunReceipt, ResearchUpdate } from "./types"
import { acquireFileLock } from "../server/file-lock"

const DOCUMENT_NAME = "research-inbox.json"
const LOCK_NAME = "research-inbox.lock"
const MAX_DOCUMENT_BYTES = 2_000_000
const MAX_RESEARCH_RUN_RECEIPTS = 100
const BROWSERS = new Set<BrowserMode>(["default", "chrome", "safari", "firefox", "arc"])
const SOURCES = new Set(["reddit", "x", "youtube", "hackernews", "github", "web"])
const QUALITIES = new Set(["strong", "supporting", "thin"])

export class RevisionConflictError extends Error {}
export class RepositoryBusyError extends Error {}
export class ArticleConflictError extends Error {}
export class DocumentTooLargeError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function assertString(value: unknown, field: string) {
  if (typeof value !== "string") throw new Error(`Invalid ${field}`)
}

function assertCount(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`Invalid ${field}`)
}

function assertTimestamp(value: unknown, field: string) {
  assertString(value, field)
  if (!Number.isFinite(Date.parse(value as string))) throw new Error(`Invalid ${field}`)
}

function assertArticleDraft(value: unknown) {
  if (!isRecord(value)) throw new Error("Invalid article draft")
  for (const field of ["title", "deck", "body"] as const) assertString(value[field], `article ${field}`)
  assertTimestamp(value.generatedAt, "article generatedAt")
}

function assertItemState(value: unknown) {
  if (!isRecord(value)) throw new Error("Invalid item state")
  for (const field of ["seen", "saved", "archived", "unknownOutcome"] as const) {
    if (value[field] !== undefined && typeof value[field] !== "boolean") throw new Error(`Invalid item state ${field}`)
  }
  for (const field of ["draft", "repliedAt", "postAttemptedAt", "postDraftHash"] as const) {
    if (value[field] !== undefined) assertString(value[field], `item state ${field}`)
  }
  if (value.articleDraft !== undefined) assertArticleDraft(value.articleDraft)
}

function assertReceipt(value: unknown) {
  if (!isRecord(value)) throw new Error("Invalid research run receipt")
  assertCount(value.importedCount, "receipt importedCount")
  assertCount(value.warningCount, "receipt warningCount")
  assertTimestamp(value.mergedAt, "receipt mergedAt")
}

function assertDocument(value: unknown): asserts value is ResearchDocument {
  if (!isRecord(value)) throw new Error("Invalid research document")
  const document = value
  if (document.version !== 1 || !Number.isSafeInteger(document.revision) || (document.revision as number) < 0 || !Array.isArray(document.items) || !Array.isArray(document.visibleIds)) {
    throw new Error("Unsupported research document")
  }
  assertTimestamp(document.updatedAt, "document updatedAt")
  if (!isRecord(document.workspace) || !isRecord(document.itemState)) {
    throw new Error("Incomplete research document")
  }
  for (const field of ["slug", "name", "topic", "dateRange", "voice"] as const) assertString(document.workspace[field], `workspace ${field}`)
  assertCount(document.workspace.rawItemCount, "workspace rawItemCount")
  assertCount(document.workspace.availableSources, "workspace availableSources")
  if (!Array.isArray(document.workspace.missingSources) || document.workspace.missingSources.some((item) => typeof item !== "string")) {
    throw new Error("Invalid workspace missingSources")
  }

  const itemIds = new Set<string>()
  for (const [index, item] of document.items.entries()) {
    if (!isRecord(item)) throw new Error(`Invalid research item ${index}`)
    for (const field of ["id", "sourceLabel", "title", "excerpt", "url", "publishedAt", "engagementLabel"] as const) {
      assertString(item[field], `item ${index} ${field}`)
    }
    if (!item.id || itemIds.has(item.id as string)) throw new Error(`Invalid item ${index} id`)
    itemIds.add(item.id as string)
    if (!SOURCES.has(item.source as string)) throw new Error(`Invalid item ${index} source`)
    if (!QUALITIES.has(item.quality as string)) throw new Error(`Invalid item ${index} quality`)
    if (!Array.isArray(item.tags) || item.tags.some((tag) => typeof tag !== "string")) throw new Error(`Invalid item ${index} tags`)
    const url = new URL(item.url as string)
    if (url.protocol !== "https:") throw new Error(`Invalid item ${index} URL`)
  }

  for (const [itemId, state] of Object.entries(document.itemState)) {
    if (!itemIds.has(itemId)) throw new Error("State references an unknown item")
    assertItemState(state)
  }
  if (document.visibleIds.some((id) => typeof id !== "string" || !itemIds.has(id))) throw new Error("Invalid visible item list")
  if (!BROWSERS.has(document.browserMode as BrowserMode)) throw new Error("Invalid browser mode")
  if (document.researchRunReceipts !== undefined) {
    if (!isRecord(document.researchRunReceipts)) throw new Error("Invalid research run receipts")
    for (const receipt of Object.values(document.researchRunReceipts)) assertReceipt(receipt)
  }
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
  const serialized = url.toString()
  return url.pathname === "/" && !url.search ? serialized.replace(/\/$/, "") : serialized
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
    return acquireFileLock(lockPath, {
      attempts: 20,
      retryDelayMs: (attempt) => 15 + attempt * 4,
      createBusyError: () => new RepositoryBusyError("Local research file is busy"),
    })
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
      await lock.release()
    }
  }

  async function mergeResearchRun(runId: string, result: Last30DaysImportResult) {
    await initialize()
    const lock = await acquireLock()
    try {
      const current = await readDocument()
      const existingReceipt = current.researchRunReceipts?.[runId]
      if (existingReceipt) return { document: current, ...existingReceipt, alreadyMerged: true }
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
      const receipt: ResearchRunReceipt = {
        importedCount: addedIds.length,
        warningCount: result.warnings.length,
        mergedAt: next.updatedAt,
      }
      const receipts = Object.entries({ ...(next.researchRunReceipts ?? {}), [runId]: receipt })
        .sort(([, left], [, right]) => Date.parse(right.mergedAt) - Date.parse(left.mergedAt))
        .slice(0, MAX_RESEARCH_RUN_RECEIPTS)
      next.researchRunReceipts = Object.fromEntries(receipts)
      await writeDocument(next)
      return { document: next, ...receipt, alreadyMerged: false }
    } finally {
      await lock.release()
    }
  }

  async function getResearchRunReceipt(runId: string) {
    const { document } = await load()
    return document.researchRunReceipts?.[runId] ?? null
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
      await lock.release()
    }
  }

  return { filePath, load, update, mergeResearchRun, getResearchRunReceipt, saveArticleDraft }
}

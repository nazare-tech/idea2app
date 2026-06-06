import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

import type {
  PromptLabDraft,
  PromptLabDraftInput,
  PromptLabPersistenceAdapter,
  PromptLabPersistenceListInput,
  PromptLabRunRecord,
  PromptLabRunRecordInput,
} from "./types.js"

const SCHEMA_VERSION = 1

interface StoreFile {
  schemaVersion: typeof SCHEMA_VERSION
  drafts: PromptLabDraft[]
  runs: PromptLabRunRecord[]
}

export interface LocalJsonPersistenceOptions {
  path?: string
}

export function localJsonPersistence(options: LocalJsonPersistenceOptions = {}): PromptLabPersistenceAdapter {
  const filePath = options.path ?? path.join(process.cwd(), ".promptlab", "promptlab.local.json")

  return {
    async listDrafts(input: PromptLabPersistenceListInput = {}) {
      const store = await readStore(filePath)
      return filterByArtifact(store.drafts, input.artifactId)
    },

    async saveDraft(input: PromptLabDraftInput) {
      const now = new Date().toISOString()
      const draft: PromptLabDraft = {
        ...input,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      }
      const store = await readStore(filePath)
      store.drafts.unshift(draft)
      await writeStore(filePath, store)
      return draft
    },

    async deleteDraft(id: string) {
      const store = await readStore(filePath)
      store.drafts = store.drafts.filter((draft) => draft.id !== id)
      await writeStore(filePath, store)
    },

    async listRuns(input: PromptLabPersistenceListInput = {}) {
      const store = await readStore(filePath)
      return filterByArtifact(store.runs, input.artifactId)
    },

    async saveRun(input: PromptLabRunRecordInput) {
      const now = new Date().toISOString()
      const run: PromptLabRunRecord = {
        ...input,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      }
      const store = await readStore(filePath)
      store.runs.unshift(run)
      await writeStore(filePath, store)
      return run
    },
  }
}

export function createEmptyStore(): StoreFile {
  return {
    schemaVersion: SCHEMA_VERSION,
    drafts: [],
    runs: [],
  }
}

async function readStore(filePath: string): Promise<StoreFile> {
  let raw: string
  try {
    raw = await readFile(filePath, "utf8")
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return createEmptyStore()
    throw error
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoreFile>
    if (parsed.schemaVersion !== SCHEMA_VERSION) return createEmptyStore()
    return {
      schemaVersion: SCHEMA_VERSION,
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
    }
  } catch {
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(`${filePath}.corrupt`, raw, "utf8")
    return createEmptyStore()
  }
}

async function writeStore(filePath: string, store: StoreFile) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`
  await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8")
  await rename(tempPath, filePath)
}

function filterByArtifact<T extends { artifactId: string }>(items: T[], artifactId?: string) {
  return artifactId ? items.filter((item) => item.artifactId === artifactId) : [...items]
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}

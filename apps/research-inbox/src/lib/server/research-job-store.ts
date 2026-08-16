import { randomUUID } from "node:crypto"
import { access, mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

const DOCUMENT_NAME = "research-run.json"
const LOCK_NAME = "research-run.lock"
const ACTIVE_STATUSES = new Set<ResearchRunStatus>(["queued", "running", "importing"])
const TERMINAL_STATUSES = new Set<ResearchRunStatus>(["succeeded", "failed"])
const STORED_STATUSES = new Set<ResearchRunStatus>([...ACTIVE_STATUSES, ...TERMINAL_STATUSES])
const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1_000

export type ResearchRunStatus = "idle" | "queued" | "running" | "importing" | "succeeded" | "failed"

export interface IdleResearchRun {
  status: "idle"
}

export interface StoredResearchRun {
  version: 1
  id: string
  status: Exclude<ResearchRunStatus, "idle">
  topic: string
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  importedCount: number
  warningCount: number
  retryable: boolean
  error: string | null
}

export type ResearchRunSnapshot = IdleResearchRun | StoredResearchRun

export interface ResearchRunUpdate {
  status?: Exclude<ResearchRunStatus, "idle">
  importedCount?: number
  warningCount?: number
  retryable?: boolean
  error?: string | null
}

export interface ResearchJobStoreOptions {
  directory?: string
  now?: () => number
  staleAfterMs?: number
  createId?: () => string
}

export class ResearchJobStoreBusyError extends Error {}

type ActiveResearchRun = StoredResearchRun & { status: "queued" | "running" | "importing" }

function isActive(run: ResearchRunSnapshot): run is ActiveResearchRun {
  return run.status !== "idle" && ACTIVE_STATUSES.has(run.status)
}

function assertCount(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`Invalid ${field}`)
}

function assertStoredRun(value: unknown): asserts value is StoredResearchRun {
  if (!value || typeof value !== "object") throw new Error("Invalid research run")
  const run = value as Partial<StoredResearchRun>
  if (run.version !== 1 || typeof run.id !== "string" || !run.id || typeof run.topic !== "string") {
    throw new Error("Invalid research run identity")
  }
  if (!run.status || !STORED_STATUSES.has(run.status)) throw new Error("Invalid research run status")
  for (const field of ["createdAt", "updatedAt"] as const) {
    if (typeof run[field] !== "string" || !Number.isFinite(Date.parse(run[field]))) throw new Error(`Invalid ${field}`)
  }
  for (const field of ["startedAt", "completedAt"] as const) {
    if (run[field] !== null && (typeof run[field] !== "string" || !Number.isFinite(Date.parse(run[field]!)))) {
      throw new Error(`Invalid ${field}`)
    }
  }
  assertCount(run.importedCount, "importedCount")
  assertCount(run.warningCount, "warningCount")
  if (typeof run.retryable !== "boolean") throw new Error("Invalid retryable")
  if (run.error !== null && typeof run.error !== "string") throw new Error("Invalid error")
}

async function exists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function boundedCount(value: number | undefined, fallback: number) {
  if (value === undefined) return fallback
  assertCount(value, "research run count")
  return value
}

export function createResearchJobStore(options: ResearchJobStoreOptions = {}) {
  const directory = options.directory ?? path.join(process.cwd(), ".local")
  const now = options.now ?? Date.now
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS
  const createId = options.createId ?? randomUUID
  const filePath = path.join(directory, DOCUMENT_NAME)
  const lockPath = path.join(directory, LOCK_NAME)

  if (!Number.isFinite(staleAfterMs) || staleAfterMs <= 0) throw new Error("staleAfterMs must be positive")

  async function initialize() {
    await mkdir(directory, { recursive: true, mode: 0o700 })
  }

  async function acquireLock() {
    await initialize()
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        return await open(lockPath, "wx", 0o600)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
    }
    throw new ResearchJobStoreBusyError("Research job store is busy")
  }

  async function readCurrent(): Promise<ResearchRunSnapshot> {
    if (!(await exists(filePath))) return { status: "idle" }
    const raw = await readFile(filePath, "utf8")
    if (raw.length > 256_000) throw new Error("Research run file is too large")
    const value: unknown = JSON.parse(raw)
    assertStoredRun(value)
    return value
  }

  async function writeCurrent(run: StoredResearchRun) {
    const temporary = path.join(directory, `${DOCUMENT_NAME}.${process.pid}.${randomUUID()}.tmp`)
    try {
      await writeFile(temporary, `${JSON.stringify(run, null, 2)}\n`, { encoding: "utf8", mode: 0o600 })
      await rename(temporary, filePath)
    } finally {
      await unlink(temporary).catch(() => undefined)
    }
  }

  function recoverIfStale(run: ResearchRunSnapshot): { run: ResearchRunSnapshot; recovered: boolean } {
    if (!isActive(run)) return { run, recovered: false }
    const currentTime = now()
    if (currentTime - Date.parse(run.updatedAt) <= staleAfterMs) return { run, recovered: false }
    const timestamp = new Date(currentTime).toISOString()
    return {
      recovered: true,
      run: {
        ...run,
        status: "failed",
        updatedAt: timestamp,
        completedAt: timestamp,
        retryable: true,
        error: "Research run was interrupted and can be retried.",
      },
    }
  }

  async function withLock<T>(operation: () => Promise<T>) {
    const lock = await acquireLock()
    try {
      return await operation()
    } finally {
      await lock.close()
      await unlink(lockPath).catch(() => undefined)
    }
  }

  async function load(): Promise<ResearchRunSnapshot> {
    return withLock(async () => {
      const recovered = recoverIfStale(await readCurrent())
      if (recovered.recovered) await writeCurrent(recovered.run as StoredResearchRun)
      return recovered.run
    })
  }

  async function claim(topic: string): Promise<{ job: StoredResearchRun; reused: boolean }> {
    const normalizedTopic = topic.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 2_000)
    if (!normalizedTopic) throw new Error("Research topic is required")

    return withLock(async () => {
      const recovered = recoverIfStale(await readCurrent())
      if (recovered.recovered) await writeCurrent(recovered.run as StoredResearchRun)
      if (isActive(recovered.run)) return { job: recovered.run, reused: true }

      const timestamp = new Date(now()).toISOString()
      const job: StoredResearchRun = {
        version: 1,
        id: createId(),
        status: "queued",
        topic: normalizedTopic,
        createdAt: timestamp,
        updatedAt: timestamp,
        startedAt: null,
        completedAt: null,
        importedCount: 0,
        warningCount: 0,
        retryable: false,
        error: null,
      }
      await writeCurrent(job)
      return { job, reused: false }
    })
  }

  async function update(id: string, patch: ResearchRunUpdate): Promise<{ job: ResearchRunSnapshot; updated: boolean }> {
    return withLock(async () => {
      const recovered = recoverIfStale(await readCurrent())
      if (recovered.recovered) await writeCurrent(recovered.run as StoredResearchRun)
      const current = recovered.run
      if (current.status === "idle" || current.id !== id || TERMINAL_STATUSES.has(current.status)) {
        return { job: current, updated: false }
      }

      const timestamp = new Date(now()).toISOString()
      const status = patch.status ?? current.status
      const terminal = TERMINAL_STATUSES.has(status)
      const next: StoredResearchRun = {
        ...current,
        status,
        updatedAt: timestamp,
        startedAt: status !== "queued" ? current.startedAt ?? timestamp : current.startedAt,
        completedAt: terminal ? timestamp : null,
        importedCount: boundedCount(patch.importedCount, current.importedCount),
        warningCount: boundedCount(patch.warningCount, current.warningCount),
        retryable: patch.retryable ?? (status === "failed" ? true : current.retryable),
        error: patch.error === undefined ? current.error : patch.error?.slice(0, 1_000) ?? null,
      }
      await writeCurrent(next)
      return { job: next, updated: true }
    })
  }

  return { filePath, claim, load, update }
}

import { randomUUID } from "node:crypto"
import { open, readFile, stat, unlink } from "node:fs/promises"

interface LockOwner {
  pid: number
  nonce: string
  createdAt: string
}

interface FileLockOptions {
  attempts: number
  retryDelayMs: (attempt: number) => number
  createBusyError: () => Error
  legacyStaleAfterMs?: number
}

const DEFAULT_LEGACY_STALE_AFTER_MS = 30_000

function parseOwner(value: string): LockOwner | null {
  try {
    const owner = JSON.parse(value) as Partial<LockOwner>
    if (
      !Number.isSafeInteger(owner.pid) ||
      (owner.pid ?? 0) <= 0 ||
      typeof owner.nonce !== "string" ||
      !owner.nonce ||
      typeof owner.createdAt !== "string" ||
      !Number.isFinite(Date.parse(owner.createdAt))
    ) {
      return null
    }
    return owner as LockOwner
  } catch {
    return null
  }
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH"
  }
}

async function reclaimOrphanedLock(lockPath: string, legacyStaleAfterMs: number) {
  let firstRead: string
  try {
    firstRead = await readFile(lockPath, "utf8")
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT"
  }

  const owner = parseOwner(firstRead)
  if (owner) {
    if (isProcessAlive(owner.pid)) return false
  } else {
    const lockStat = await stat(lockPath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
      throw error
    })
    if (!lockStat) return true
    if (Date.now() - lockStat.mtimeMs <= legacyStaleAfterMs) return false
  }

  // A lock cannot be replaced while its path still exists. Re-read before
  // unlinking so a changed owner is never reclaimed from a stale observation.
  const secondRead = await readFile(lockPath, "utf8").catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  })
  if (secondRead === null) return true
  if (secondRead !== firstRead) return false
  await unlink(lockPath).catch((error) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  })
  return true
}

export async function acquireFileLock(lockPath: string, options: FileLockOptions) {
  const legacyStaleAfterMs = options.legacyStaleAfterMs ?? DEFAULT_LEGACY_STALE_AFTER_MS

  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    const owner: LockOwner = {
      pid: process.pid,
      nonce: randomUUID(),
      createdAt: new Date().toISOString(),
    }

    try {
      const handle = await open(lockPath, "wx", 0o600)
      try {
        await handle.writeFile(`${JSON.stringify(owner)}\n`, "utf8")
        await handle.sync()
      } catch (error) {
        await handle.close().catch(() => undefined)
        await unlink(lockPath).catch(() => undefined)
        throw error
      }

      return {
        async release() {
          await handle.close()
          const current = await readFile(lockPath, "utf8").catch(() => null)
          if (current && parseOwner(current)?.nonce === owner.nonce) {
            await unlink(lockPath).catch(() => undefined)
          }
        },
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      if (await reclaimOrphanedLock(lockPath, legacyStaleAfterMs)) continue
      await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs(attempt)))
    }
  }

  throw options.createBusyError()
}

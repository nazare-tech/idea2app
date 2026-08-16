import assert from "node:assert/strict"
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { createResearchJobStore, ResearchJobStoreBusyError, type ResearchRunSnapshot, type StoredResearchRun } from "./research-job-store"

async function testDirectory(t: test.TestContext) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "research-job-store-test-"))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

function expectStored(run: ResearchRunSnapshot): StoredResearchRun {
  if (run.status === "idle") assert.fail("Expected a stored research run")
  return run
}

test("starts idle and persists a claimed queued job atomically", async (t) => {
  const directory = await testDirectory(t)
  const store = createResearchJobStore({
    directory,
    now: () => Date.parse("2026-08-15T12:00:00.000Z"),
    createId: () => "job-one",
  })

  assert.deepEqual(await store.load(), { status: "idle" })
  const claimed = await store.claim("  Product   validation\nresearch  ")
  assert.equal(claimed.reused, false)
  assert.equal(claimed.job.id, "job-one")
  assert.equal(claimed.job.status, "queued")
  assert.equal(claimed.job.topic, "Product validation research")

  const disk = JSON.parse(await readFile(path.join(directory, "research-run.json"), "utf8"))
  assert.equal(disk.id, "job-one")
  assert.equal(disk.status, "queued")
  assert.deepEqual((await readdir(directory)).filter((name) => name.endsWith(".tmp") || name.endsWith(".lock")), [])
})

test("concurrent claims across store instances reuse one active job", async (t) => {
  const directory = await testDirectory(t)
  let nextId = 0
  const options = {
    directory,
    now: () => Date.parse("2026-08-15T12:00:00.000Z"),
    createId: () => `job-${++nextId}`,
  }
  const stores = [createResearchJobStore(options), createResearchJobStore(options)]

  const claims = await Promise.all(Array.from({ length: 12 }, (_, index) => stores[index % stores.length].claim(`topic ${index}`)))
  assert.equal(new Set(claims.map(({ job }) => job.id)).size, 1)
  assert.equal(claims.filter(({ reused }) => !reused).length, 1)
  assert.equal(nextId, 1)
})

test("reclaims a lock owned by a terminated process", async (t) => {
  const directory = await testDirectory(t)
  await writeFile(
    path.join(directory, "research-run.lock"),
    JSON.stringify({ pid: 2_147_483_647, nonce: "orphan", createdAt: "2026-08-15T00:00:00.000Z" }),
    "utf8",
  )

  assert.deepEqual(await createResearchJobStore({ directory }).load(), { status: "idle" })
})

test("does not reclaim a lock owned by a live process", async (t) => {
  const directory = await testDirectory(t)
  await writeFile(
    path.join(directory, "research-run.lock"),
    JSON.stringify({ pid: process.pid, nonce: "live", createdAt: new Date().toISOString() }),
    "utf8",
  )

  await assert.rejects(() => createResearchJobStore({ directory }).load(), ResearchJobStoreBusyError)
})

test("updates are fenced by job id and terminal jobs are immutable", async (t) => {
  const directory = await testDirectory(t)
  let currentTime = Date.parse("2026-08-15T12:00:00.000Z")
  const store = createResearchJobStore({ directory, now: () => currentTime, createId: () => "active-job" })
  const claimed = await store.claim("Research topic")

  currentTime += 1_000
  const running = await store.update(claimed.job.id, { status: "running" })
  assert.equal(running.updated, true)
  assert.equal(running.job.status, "running")

  const staleWorker = await store.update("older-job", { status: "failed", error: "must not win" })
  assert.equal(staleWorker.updated, false)
  assert.equal(staleWorker.job.status, "running")

  currentTime += 1_000
  assert.equal((await store.update(claimed.job.id, { status: "importing" })).job.status, "importing")
  currentTime += 1_000
  const succeeded = await store.update(claimed.job.id, { status: "succeeded", importedCount: 14, warningCount: 2 })
  assert.equal(succeeded.updated, true)
  assert.equal(succeeded.job.status, "succeeded")
  const storedSuccess = expectStored(succeeded.job)
  assert.equal(storedSuccess.importedCount, 14)
  assert.equal(storedSuccess.warningCount, 2)
  assert.equal(storedSuccess.completedAt, new Date(currentTime).toISOString())

  const lateFailure = await store.update(claimed.job.id, { status: "failed", error: "late failure" })
  assert.equal(lateFailure.updated, false)
  assert.equal(lateFailure.job.status, "succeeded")
})

test("a terminal job allows a new claim with a new id", async (t) => {
  const directory = await testDirectory(t)
  let nextId = 0
  const store = createResearchJobStore({ directory, createId: () => `job-${++nextId}` })
  const first = await store.claim("First run")
  await store.update(first.job.id, { status: "failed", error: "Research failed" })

  const second = await store.claim("Retry run")
  assert.equal(second.reused, false)
  assert.equal(second.job.id, "job-2")
  assert.equal(second.job.status, "queued")
  assert.equal(second.job.topic, "Retry run")
})

test("stale active jobs recover to retryable failure and release single flight", async (t) => {
  const directory = await testDirectory(t)
  let currentTime = Date.parse("2026-08-15T12:00:00.000Z")
  let nextId = 0
  const options = {
    directory,
    now: () => currentTime,
    staleAfterMs: 5_000,
    createId: () => `job-${++nextId}`,
  }
  const firstStore = createResearchJobStore(options)
  const first = await firstStore.claim("Long-running research")
  await firstStore.update(first.job.id, { status: "running" })

  currentTime += 5_001
  const recovered = await createResearchJobStore(options).load()
  assert.equal(recovered.status, "failed")
  const storedRecovery = expectStored(recovered)
  assert.equal(storedRecovery.retryable, true)
  assert.match(storedRecovery.error || "", /interrupted/i)
  assert.equal(storedRecovery.completedAt, new Date(currentTime).toISOString())

  const retry = await createResearchJobStore(options).claim("Retry after interruption")
  assert.equal(retry.reused, false)
  assert.equal(retry.job.id, "job-2")
})

test("reconciles a matching failed job from a durable merge receipt", async (t) => {
  const directory = await testDirectory(t)
  const store = createResearchJobStore({ directory, createId: () => "merged-job" })
  const claimed = await store.claim("Research topic")
  await store.update(claimed.job.id, { status: "failed", error: "Completion write failed" })

  const reconciled = await store.reconcileSucceeded(claimed.job.id, {
    importedCount: 4,
    warningCount: 1,
    mergedAt: "2026-08-15T12:00:00.000Z",
  })
  assert.equal(reconciled.updated, true)
  assert.equal(reconciled.job.status, "succeeded")
  assert.equal(expectStored(reconciled.job).importedCount, 4)
})

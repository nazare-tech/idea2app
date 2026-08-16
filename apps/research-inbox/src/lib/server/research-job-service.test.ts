import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { createResearchRepository } from "../research/repository"
import { createResearchJobService, executeResearchJob } from "./research-job-service"
import { createResearchJobStore } from "./research-job-store"

async function testDirectory(t: test.TestContext) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "research-job-service-test-"))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

function emptyResult() {
  return {
    rawItemCount: 3,
    availableSources: 1,
    missingSources: [],
    dateRange: "August 2026",
    warnings: [],
    items: [],
  }
}

test("a stale worker cannot merge after losing its job fence", async (t) => {
  const directory = await testDirectory(t)
  const repository = createResearchRepository(directory)
  let nextId = 0
  const store = createResearchJobStore({ directory, createId: () => `job-${++nextId}` })
  const stale = await store.claim("Old run")
  await store.update(stale.job.id, { status: "failed", error: "Recovered" })
  await store.claim("Replacement run")
  let runCalled = false

  await executeResearchJob({
    repository,
    store,
    run: async () => {
      runCalled = true
      return emptyResult()
    },
  }, stale.job.id, stale.job.topic)

  assert.equal(runCalled, false)
  assert.equal(await repository.getResearchRunReceipt(stale.job.id), null)
})

test("service load reconciles a failed completion write from its merge receipt", async (t) => {
  const directory = await testDirectory(t)
  const repository = createResearchRepository(directory)
  const store = createResearchJobStore({ directory, createId: () => "job-one" })
  const claimed = await store.claim("Research topic")
  await store.update(claimed.job.id, { status: "running" })
  await store.update(claimed.job.id, { status: "importing" })
  const receipt = await repository.mergeResearchRun(claimed.job.id, emptyResult())
  await store.update(claimed.job.id, { status: "failed", error: "Completion write failed" })

  const service = createResearchJobService({ repository, store, run: async () => emptyResult() })
  const reconciled = await service.load()

  assert.equal(reconciled.status, "succeeded")
  assert.equal(reconciled.status === "succeeded" ? reconciled.importedCount : -1, receipt.importedCount)
})

import assert from "node:assert/strict"
import test, { beforeEach } from "node:test"

import { clearPlanNameCache, getCachedPlanName } from "./plan-name-cache"

beforeEach(() => {
  clearPlanNameCache()
})

test("caches the plan name per user within the TTL", async () => {
  let loads = 0
  const load = async () => {
    loads += 1
    return "Pro"
  }

  assert.equal(await getCachedPlanName("user-1", load, 0), "Pro")
  assert.equal(await getCachedPlanName("user-1", load, 60_000), "Pro")
  assert.equal(loads, 1)
})

test("reloads after the TTL expires", async () => {
  let loads = 0
  const load = async () => {
    loads += 1
    return loads === 1 ? "Free" : "Pro"
  }

  assert.equal(await getCachedPlanName("user-1", load, 0), "Free")
  assert.equal(await getCachedPlanName("user-1", load, 5 * 60 * 1000 + 1), "Pro")
  assert.equal(loads, 2)
})

test("failures are not cached", async () => {
  let loads = 0
  const failing = async (): Promise<string> => {
    loads += 1
    throw new Error("db down")
  }

  await assert.rejects(getCachedPlanName("user-1", failing, 0))
  assert.equal(await getCachedPlanName("user-1", async () => "Starter", 1), "Starter")
  assert.equal(loads, 1)
})

test("keys the cache by user", async () => {
  assert.equal(await getCachedPlanName("user-1", async () => "Free", 0), "Free")
  assert.equal(await getCachedPlanName("user-2", async () => "Pro", 0), "Pro")
  assert.equal(await getCachedPlanName("user-1", async () => "WRONG", 1), "Free")
})

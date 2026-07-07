import test from "node:test"
import assert from "node:assert/strict"

import { getGenerateAllPollDelayMs } from "./generate-all-store"

test("getGenerateAllPollDelayMs backs off long-running queues", () => {
  const startedAt = Date.UTC(2026, 6, 7, 12, 0, 0)

  assert.equal(getGenerateAllPollDelayMs(startedAt, startedAt), 3000)
  assert.equal(getGenerateAllPollDelayMs(startedAt, startedAt + 2 * 60 * 1000), 6000)
  assert.equal(getGenerateAllPollDelayMs(startedAt, startedAt + 8 * 60 * 1000), 10000)
})

test("getGenerateAllPollDelayMs uses the fast cadence before a start time is known", () => {
  assert.equal(getGenerateAllPollDelayMs(null, Date.UTC(2026, 6, 7, 12, 0, 0)), 3000)
})

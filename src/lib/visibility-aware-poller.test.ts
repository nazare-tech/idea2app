import test from "node:test"
import assert from "node:assert/strict"

import { createVisibilityAwarePoller } from "./visibility-aware-poller"

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test("schedule fires poll once after the configured delay", async () => {
  let polls = 0
  const poller = createVisibilityAwarePoller({
    poll: () => {
      polls += 1
    },
    getDelayMs: () => 5,
  })

  poller.schedule()
  assert.equal(polls, 0)
  await wait(30)
  assert.equal(polls, 1)
  poller.stop()
})

test("stop cancels a scheduled poll", async () => {
  let polls = 0
  const poller = createVisibilityAwarePoller({
    poll: () => {
      polls += 1
    },
    getDelayMs: () => 5,
  })

  poller.schedule()
  poller.stop()
  await wait(30)
  assert.equal(polls, 0)
})

test("schedule replaces a previously scheduled poll instead of stacking", async () => {
  let polls = 0
  const poller = createVisibilityAwarePoller({
    poll: () => {
      polls += 1
    },
    getDelayMs: () => 5,
  })

  poller.schedule()
  poller.schedule()
  await wait(30)
  assert.equal(polls, 1)
  poller.stop()
})

test("getDelayMs is re-evaluated on every schedule", async () => {
  const delays: number[] = []
  let nextDelay = 5
  const poller = createVisibilityAwarePoller({
    poll: () => {},
    getDelayMs: () => {
      delays.push(nextDelay)
      return nextDelay
    },
  })

  poller.schedule()
  nextDelay = 6
  poller.schedule()
  assert.deepEqual(delays, [5, 6])
  poller.stop()
})

import test from "node:test"
import assert from "node:assert/strict"

import { advanceSmoothedReveal } from "./use-smoothed-stream"

function words(count: number, wordLength = 6): string {
  return Array.from({ length: count }, () => "x".repeat(wordLength - 1)).join(" ")
}

test("advances two words per tick at small backlogs (baseline reading rate)", () => {
  const full = words(50)
  const next = advanceSmoothedReveal(0, full)
  // Two word boundaries from position 0.
  const firstBoundary = full.indexOf(" ", 1)
  const secondBoundary = full.indexOf(" ", firstBoundary + 1)
  assert.equal(next, secondBoundary)
})

test("never advances more than five words per tick, even with a huge backlog", () => {
  const full = words(5000) // ~30k chars of backlog
  let position = 0
  const next = advanceSmoothedReveal(position, full)
  let boundaries = 0
  while (position < next) {
    position = full.indexOf(" ", position + 1)
    boundaries += 1
  }
  assert.equal(boundaries, 5)
})

test("ramps between baseline and cap proportionally to backlog", () => {
  const full = words(400) // 2400 chars
  const next = advanceSmoothedReveal(0, full)
  // backlog 2400 chars -> floor(2400 / 750) = 3 words this tick
  let position = 0
  let boundaries = 0
  while (position < next) {
    position = full.indexOf(" ", position + 1)
    boundaries += 1
  }
  assert.equal(boundaries, 3)
})

test("restarts when the target shrank (replaced content)", () => {
  assert.equal(advanceSmoothedReveal(500, "short text"), 0)
})

test("stays put when caught up", () => {
  const full = "all caught up"
  assert.equal(advanceSmoothedReveal(full.length, full), full.length)
})

test("clamps to the end of the string on the final step", () => {
  const full = "one two"
  const next = advanceSmoothedReveal(4, full) // past "one ", one word left
  assert.equal(next, full.length)
})

test("consumes a whole unbroken string in one tick (no spaces)", () => {
  const full = "x".repeat(300)
  assert.equal(advanceSmoothedReveal(0, full), full.length)
})

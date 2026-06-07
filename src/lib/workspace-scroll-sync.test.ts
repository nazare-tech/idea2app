import assert from "node:assert/strict"
import test from "node:test"
import {
  chooseActiveScrollCandidate,
  type ScrollSyncCandidate,
} from "./workspace-scroll-sync"

function candidate(id: string, top: number): ScrollSyncCandidate {
  return { id, top }
}

test("chooseActiveScrollCandidate selects the nearest candidate above the viewport marker", () => {
  const candidates = [
    candidate("overview", 0),
    candidate("market-research", 420),
    candidate("prd", 960),
  ]

  assert.deepEqual(chooseActiveScrollCandidate(candidates, 520), {
    id: "market-research",
    top: 420,
  })
})

test("chooseActiveScrollCandidate falls forward when no candidate has reached the marker", () => {
  const candidates = [
    candidate("overview", 240),
    candidate("market-research", 640),
  ]

  assert.deepEqual(chooseActiveScrollCandidate(candidates, 120), {
    id: "overview",
    top: 240,
  })
})

test("chooseActiveScrollCandidate keeps stable ordering when candidates are unsorted", () => {
  const candidates = [
    candidate("prd", 900),
    candidate("overview", 0),
    candidate("market-research-pricing", 660),
    candidate("market-research", 420),
  ]

  assert.deepEqual(chooseActiveScrollCandidate(candidates, 700), {
    id: "market-research-pricing",
    top: 660,
  })
})

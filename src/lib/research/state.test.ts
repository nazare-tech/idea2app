import assert from "node:assert/strict"
import test from "node:test"
import { getResearchStorageKey, parseResearchState, rankResearchCandidates } from "./state"
import type { ResearchInboxState, ResearchItem } from "./types"

const item = (id: string, tags: string[]): ResearchItem => ({
  id, tags, source: "reddit", sourceLabel: "r/test", title: id, excerpt: id,
  url: `https://example.com/${id}`, publishedAt: "2026-08-15", engagementLabel: "1 point", quality: "strong",
})

test("storage keys isolate authenticated users", () => {
  assert.notEqual(getResearchStorageKey("user-a", "maker"), getResearchStorageKey("user-b", "maker"))
})

test("corrupt or incompatible persistence resets safely", () => {
  assert.deepEqual(parseResearchState("not-json"), { version: 1, items: {} })
  assert.deepEqual(parseResearchState('{"version":2,"items":{}}'), { version: 1, items: {} })
})

test("replied exemplars transfer preference to similar unseen items", () => {
  const replied = item("replied", ["validation", "founders"])
  const saved = item("saved", ["scope"])
  const similar = item("similar", ["validation"])
  const savedLike = item("saved-like", ["scope"])
  const unrelated = item("unrelated", ["design"])
  const state: ResearchInboxState = {
    version: 1,
    items: { replied: { repliedAt: "now" }, saved: { saved: true } },
  }
  assert.deepEqual(
    rankResearchCandidates([unrelated, savedLike, similar], [replied, saved], state).map(({ item: ranked }) => ranked.id),
    ["similar", "saved-like", "unrelated"],
  )
})

test("no feedback preserves neutral source order", () => {
  const candidates = [item("one", ["a"]), item("two", ["b"])]
  assert.deepEqual(rankResearchCandidates(candidates, candidates, { version: 1, items: {} }).map(({ item: ranked }) => ranked.id), ["one", "two"])
})

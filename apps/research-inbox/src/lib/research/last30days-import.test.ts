import assert from "node:assert/strict"
import test from "node:test"

import { InvalidLast30DaysImportError, parseLast30DaysImport } from "./last30days-import"

function validItem(overrides: Record<string, unknown> = {}) {
  return {
    source: "reddit",
    sourceLabel: " r/SaaS ",
    title: "  A useful   discussion ",
    excerpt: "Specific evidence about a customer problem.",
    url: "https://www.reddit.com/r/SaaS/comments/abc/example/?utm_source=test#comments",
    publishedAt: "2026-08-14",
    engagementLabel: "42 points · 8 comments",
    tags: ["validation", "Validation", "customer-research"],
    quality: "strong",
    ...overrides,
  }
}

function validPayload(items: unknown[] = [validItem()]) {
  return JSON.stringify({ rawItemCount: 12, availableSources: 4, missingSources: ["X / Twitter"], dateRange: "Jul 16 – Aug 15, 2026", items })
}

test("parses JSON-only output, sanitizes cards, and creates stable IDs", () => {
  const first = parseLast30DaysImport(validPayload())
  const second = parseLast30DaysImport(validPayload())

  assert.equal(first.rawItemCount, 12)
  assert.equal(first.availableSources, 4)
  assert.deepEqual(first.missingSources, ["X / Twitter"])
  assert.equal(first.dateRange, "Jul 16 – Aug 15, 2026")
  assert.equal(first.items.length, 1)
  assert.equal(first.items[0].id, second.items[0].id)
  assert.match(first.items[0].id, /^last30days-reddit-[a-f0-9]{20}$/)
  assert.equal(first.items[0].title, "A useful discussion")
  assert.equal(first.items[0].url, "https://www.reddit.com/r/SaaS/comments/abc/example")
  assert.deepEqual(first.items[0].tags, ["validation", "customer-research"])
})

test("rejects non-JSON, invalid counts, and malformed envelopes", () => {
  assert.throws(() => parseLast30DaysImport("```json\n{}\n```"), InvalidLast30DaysImportError)
  assert.throws(() => parseLast30DaysImport(JSON.stringify({ rawItemCount: -1, availableSources: 0, missingSources: [], items: [] })), /rawItemCount/)
  assert.throws(() => parseLast30DaysImport(JSON.stringify({ rawItemCount: 0, availableSources: 25, missingSources: [], items: [] })), /availableSources/)
  assert.throws(() => parseLast30DaysImport(JSON.stringify({ rawItemCount: 0, availableSources: 0, missingSources: [], items: {} })), /items/)
})

test("accepts up to 24 available channels and rejects zero valid cards", () => {
  const result = parseLast30DaysImport(JSON.stringify({
    rawItemCount: 1,
    availableSources: 24,
    missingSources: [],
    items: [validItem()],
  }))
  assert.equal(result.availableSources, 24)

  assert.throws(() => parseLast30DaysImport(JSON.stringify({
    rawItemCount: 1,
    availableSources: 1,
    missingSources: [],
    items: [validItem({ url: "http://example.com/insecure" })],
  })), /no valid research items/)
})

test("keeps six supported sources and drops unsafe or unsupported cards", () => {
  const supported = ["reddit", "x", "youtube", "hackernews", "github", "web"]
    .map((source, index) => validItem({ source, url: `https://example.com/${index}` }))
  const result = parseLast30DaysImport(validPayload([
    ...supported,
    validItem({ source: "mastodon", url: "https://example.com/mastodon" }),
    validItem({ url: "http://example.com/insecure" }),
    validItem({ url: "https://user:secret@example.com/private" }),
  ]))

  assert.deepEqual(result.items.map((item) => item.source), supported.map((item) => item.source))
  assert.equal(result.items.length, 6)
  assert.equal(result.warnings.filter((warning) => warning.includes("skipped")).length, 3)
})

test("bounds text, tags, missing sources, duplicates, and reported item count", () => {
  const longTitle = "x".repeat(300)
  const duplicate = validItem({ title: "Duplicate title", quality: "unknown" })
  const payload = JSON.stringify({
    rawItemCount: 0,
    availableSources: 1,
    missingSources: [" X ", "x", "y".repeat(100)],
    items: [
      validItem({ title: longTitle, tags: Array.from({ length: 12 }, (_, index) => `tag-${index}`) }),
      duplicate,
    ],
  })
  const result = parseLast30DaysImport(payload)

  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].title.length, 240)
  assert.equal(result.items[0].tags.length, 8)
  assert.equal(result.rawItemCount, 1)
  assert.deepEqual(result.missingSources.map((value) => value.length), [1, 80])
  assert.ok(result.warnings.some((warning) => warning.includes("duplicate source URL")))
  assert.ok(result.warnings.some((warning) => warning.includes("rawItemCount raised")))
})

test("uses source and canonical URL for deterministic identity", () => {
  const reddit = parseLast30DaysImport(validPayload([validItem()])).items[0]
  const trackedVariant = parseLast30DaysImport(validPayload([validItem({ url: "https://www.reddit.com/r/SaaS/comments/abc/example?utm_campaign=other" })])).items[0]
  const x = parseLast30DaysImport(validPayload([validItem({ source: "x" })])).items[0]

  assert.equal(reddit.id, trackedVariant.id)
  assert.notEqual(reddit.id, x.id)
})

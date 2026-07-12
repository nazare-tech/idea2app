import test from "node:test"
import assert from "node:assert/strict"

import {
  buildCompetitorMentionSegments,
  buildCompetitorSourceMetadata,
  getCompetitorSourcesFromMetadata,
  mergeStreamingCompetitorSources,
  normalizeCompetitorSources,
} from "./competitor-mention-links"

test("normalizes only absolute HTTP(S) competitor sources", () => {
  assert.deepEqual(
    normalizeCompetitorSources([
      { name: " Linear ", url: " https://linear.app " },
      { name: "Basecamp", url: "http://basecamp.com" },
      { name: "Unsafe", url: "javascript:alert(1)" },
      { name: "Relative", url: "/competitors/relative" },
      { name: "Malformed", url: "https://" },
      { name: "Local", url: "http://127.0.0.1/admin" },
      { name: "Private", url: "http://192.168.1.20" },
      { name: "Credentialed", url: "https://trusted.com@evil.com" },
      { name: "Reserved", url: "https://reserved.example" },
      { name: "", url: "https://empty-name.com" },
    ]),
    [
      { name: "Linear", url: "https://linear.app/" },
      { name: "Basecamp", url: "http://basecamp.com/" },
    ]
  )
})

test("prefers the longest exact name and keeps lowercase common words plain", () => {
  const segments = buildCompetitorMentionSegments(
    "LinearB leads while Linear is cheaper; a linear rollout and nonlinear workflows stay plain.",
    [
      { name: "Linear", url: "https://linear.example.com" },
      { name: "LinearB", url: "https://linearb.example.com" },
    ]
  )

  assert.deepEqual(segments, [
    { text: "LinearB", url: "https://linearb.example.com/" },
    { text: " leads while ", url: null },
    { text: "Linear", url: "https://linear.example.com/" },
    {
      text: " is cheaper; a linear rollout and nonlinear workflows stay plain.",
      url: null,
    },
  ])
})

test("matches multi-word competitor names case-insensitively", () => {
  const linked = buildCompetitorMentionSegments(
    "competitor one leads.",
    [{ name: "Competitor One", url: "https://competitor-one.example.com" }]
  )

  assert.equal(linked[0]?.url, "https://competitor-one.example.com/")
})

test("links repeated punctuation-delimited mentions without partial-name false positives", () => {
  const segments = buildCompetitorMentionSegments(
    "(Meta), Meta's tools, and metadata about Metabase.",
    [{ name: "Meta", url: "https://meta.example.com" }]
  )

  assert.deepEqual(
    segments.filter((segment) => segment.url).map((segment) => segment.text),
    ["Meta", "Meta"]
  )
})

test("bounds hostile source lists before building the matcher", () => {
  const sources = Array.from({ length: 80 }, (_, index) => ({
    name: `Competitor ${index}`,
    url: `https://competitor-${index}.example.com`,
  }))
  sources.unshift({
    name: "X".repeat(121),
    url: "https://overlong.example.com",
  })

  const normalized = normalizeCompetitorSources(sources)

  assert.equal(normalized.length, 50)
  assert.equal(normalized.some((source) => source.name.length > 120), false)
})

test("buildCompetitorSourceMetadata round-trips through the metadata reader", () => {
  const sources = [
    { name: "Enterpret", url: "https://www.enterpret.com/" },
    { name: "Productboard", url: "https://www.productboard.com/" },
  ]

  assert.deepEqual(
    getCompetitorSourcesFromMetadata(buildCompetitorSourceMetadata(sources)),
    sources
  )
})

test("mergeStreamingCompetitorSources replaces on non-empty payloads and is sticky otherwise", () => {
  const first = [
    { name: "Enterpret", url: "https://www.enterpret.com/" },
    { name: "Productboard", url: "https://www.productboard.com/" },
  ]

  const adopted = mergeStreamingCompetitorSources([], first)
  assert.deepEqual(adopted, first)

  // Absent or empty payloads (no streaming item this poll) keep what we have.
  assert.equal(mergeStreamingCompetitorSources(adopted, undefined), adopted)
  assert.equal(mergeStreamingCompetitorSources(adopted, []), adopted)
  assert.equal(mergeStreamingCompetitorSources(adopted, "junk"), adopted)

  // The server always sends the whole current set: a replaced run's smaller
  // set wins outright.
  const replaced = [{ name: "Dovetail", url: "https://dovetail.com/" }]
  assert.deepEqual(mergeStreamingCompetitorSources(adopted, replaced), replaced)

  // Malformed entries are dropped by the shared validator.
  assert.deepEqual(
    mergeStreamingCompetitorSources([], [{ name: "Ok", url: "https://ok.com" }, { name: 5 }, "junk"]),
    [{ name: "Ok", url: "https://ok.com/" }]
  )
})

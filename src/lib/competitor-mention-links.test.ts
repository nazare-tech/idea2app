import test from "node:test"
import assert from "node:assert/strict"

import {
  buildCompetitorMentionSegments,
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

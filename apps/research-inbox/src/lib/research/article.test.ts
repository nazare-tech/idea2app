import assert from "node:assert/strict"
import test from "node:test"

import { InvalidArticleDraftError, isArticleCandidate, parseArticleDraft } from "./article"
import type { ResearchItem } from "./types"

function item(url: string, source: ResearchItem["source"] = "web"): ResearchItem {
  return {
    id: "item",
    source,
    sourceLabel: "Publication",
    title: "Finding",
    excerpt: "Evidence",
    url,
    publishedAt: "2026-08-15",
    engagementLabel: "Published today",
    tags: [],
    quality: "strong",
  }
}

function words(count: number, width = 1) {
  return Array.from({ length: count }, (_, index) => `word${index}${"x".repeat(width - 1)}`).join(" ")
}

function draft(body = words(900), overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    title: " A useful   article ",
    deck: "A specific deck for the generated article.",
    body,
    ...overrides,
  })
}

test("detects eligible HTTPS web findings deterministically", () => {
  const candidate = item("https://www.techradar.com/pro/example")
  assert.equal(isArticleCandidate(candidate), true)
  assert.equal(isArticleCandidate(candidate), true)
  assert.equal(isArticleCandidate(item("https://notx.com/article")), true)
  assert.equal(isArticleCandidate(item("https://example.com/article", "reddit")), false)
  assert.equal(isArticleCandidate(item("http://example.com/article")), false)
  assert.equal(isArticleCandidate(item("https://user:secret@example.com/article")), false)
  assert.equal(isArticleCandidate(item("not a URL")), false)
})

test("excludes known social, video, repository, market, and post hosts including subdomains", () => {
  const blocked = [
    "x.com", "twitter.com", "reddit.com", "youtu.be", "youtube.com", "github.com",
    "news.ycombinator.com", "tiktok.com", "instagram.com", "threads.net", "bsky.app",
    "facebook.com", "linkedin.com", "mastodon.social", "digg.com", "polymarket.com",
  ]
  for (const host of blocked) {
    assert.equal(isArticleCandidate(item(`https://${host}/post`)), false, host)
    assert.equal(isArticleCandidate(item(`https://www.${host}/post`)), false, `subdomain ${host}`)
  }
})

test("parses exact JSON and normalizes bounded plain text", () => {
  const result = parseArticleDraft(draft(words(850).replace("word400 ", "word400\n\n")), new Date("2026-08-15T22:30:00Z"))
  assert.equal(result.title, "A useful article")
  assert.equal(result.body.split(/\s+/).length, 850)
  assert.match(result.body, /\n\n/)
  assert.equal(result.generatedAt, "2026-08-15T22:30:00.000Z")

  assert.equal(parseArticleDraft(draft(words(1_050))).body.split(/\s+/).length, 1_050)
})

test("rejects non-JSON, extra fields, missing fields, and wrong types", () => {
  assert.throws(() => parseArticleDraft(`\`\`\`json\n${draft()}\n\`\`\``), InvalidArticleDraftError)
  assert.throws(() => parseArticleDraft(draft(undefined, { extra: true })), /only title, deck, and body/)
  assert.equal(parseArticleDraft(JSON.stringify({ title: "Title", deck: "Deck", body: words(900) })).title, "Title")
  assert.throws(() => parseArticleDraft(draft(undefined, { title: 3 })), /title must be text/)
})

test("enforces body word and character bounds", () => {
  assert.throws(() => parseArticleDraft(draft(words(849))), /850 to 1050 words/)
  assert.throws(() => parseArticleDraft(draft(words(1_051))), /850 to 1050 words/)
  assert.throws(() => parseArticleDraft(draft(words(850, 16))), /12000 characters/)
})

test("rejects HTML, control characters, oversized inline fields, and invalid server timestamps", () => {
  assert.throws(() => parseArticleDraft(draft(undefined, { title: "<h1>Title</h1>" })), /must not contain HTML/)
  assert.throws(() => parseArticleDraft(draft(`${words(899)} <script>alert(1)</script>`)), /must not contain HTML/)
  assert.throws(() => parseArticleDraft(draft(undefined, { deck: `Deck\u0000hidden` })), /control characters/)
  assert.throws(() => parseArticleDraft(draft(undefined, { title: "x".repeat(161) })), /160 characters/)
  assert.throws(() => parseArticleDraft(draft(undefined, { deck: "x".repeat(321) })), /320 characters/)
  assert.throws(() => parseArticleDraft(draft(), new Date("invalid")), /timestamp is invalid/)
})

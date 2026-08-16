import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { ResearchItem, ResearchItemState } from "../lib/research/types"
import { ResearchCard } from "./research-inbox"

const baseItem: ResearchItem = {
  id: "item-1",
  source: "reddit",
  sourceLabel: "r/startups",
  title: "A specific research finding",
  excerpt: "Useful evidence for a thoughtful response.",
  url: "https://www.reddit.com/r/startups/comments/example",
  publishedAt: "2026-08-15",
  engagementLabel: "Active discussion",
  tags: ["validation"],
  quality: "strong",
}

function render(item: ResearchItem, state: ResearchItemState = {}) {
  return renderToStaticMarkup(<ResearchCard item={item} state={state} generating={false} patch={() => undefined} generateReply={() => undefined} generateArticle={() => undefined} openArticle={() => undefined} openToReply={() => undefined} />)
}

test("article-like web cards offer Article Studio instead of Reply Studio", () => {
  const html = render({ ...baseItem, source: "web", sourceLabel: "Tech publication", url: "https://example.com/article" })
  assert.match(html, /Article studio/)
  assert.match(html, /Generate article/)
  assert.doesNotMatch(html, /Generate reply/)
})

test("social cards keep Reply Studio without a character-limited textarea", () => {
  const html = render(baseItem, { draft: Array.from({ length: 90 }, (_, index) => `longword${index}`).join(" ") })
  assert.match(html, /Reply studio/)
  assert.match(html, /Generate reply|Regenerate reply/)
  assert.match(html, /90 words/)
  assert.doesNotMatch(html, /maxlength=/i)
  assert.doesNotMatch(html, /\/500/)
})

test("saved web articles expose a dialog trigger", () => {
  const html = render({ ...baseItem, source: "web", sourceLabel: "Publication", url: "https://example.com/story" }, {
    articleDraft: { title: "Draft title", deck: "Draft deck", body: "Draft body", generatedAt: "2026-08-15T12:00:00.000Z" },
  })
  assert.match(html, /Open article/)
  assert.match(html, /aria-haspopup="dialog"/)
  assert.match(html, /Regenerate article/)
})

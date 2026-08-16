import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { ArticleSheet } from "./article-sheet"

test("renders one labeled article dialog with full plain-text content", () => {
  const html = renderToStaticMarkup(<ArticleSheet itemTitle="Source finding" onClose={() => undefined} article={{
    title: "A useful article title",
    deck: "A clear summary for the reader.",
    body: "First paragraph.\n\nSecond paragraph.",
    generatedAt: "2026-08-15T12:00:00.000Z",
  }} />)
  assert.match(html, /<dialog/)
  assert.match(html, /aria-modal="true"/)
  assert.match(html, /aria-labelledby="article-sheet-title"/)
  assert.match(html, /6 min read/)
  assert.match(html, /First paragraph/)
  assert.match(html, /Second paragraph/)
  assert.match(html, /Copy article/)
  assert.match(html, /Close article: Source finding/)
  assert.doesNotMatch(html, /dangerouslySetInnerHTML/)
})

test("renders nothing when no article is selected", () => {
  assert.equal(renderToStaticMarkup(<ArticleSheet itemTitle="None" article={null} onClose={() => undefined} />), "")
})

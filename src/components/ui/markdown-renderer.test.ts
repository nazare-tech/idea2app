import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { MarkdownRenderer, sanitizeMermaidSvg } from "./markdown-renderer"

test("sanitizeMermaidSvg fails closed when DOMPurify has no DOM", () => {
  const sanitized = sanitizeMermaidSvg(`
    <svg viewBox="0 0 100 100" onclick="alert('xss')">
      <script>alert('xss')</script>
      <foreignObject><div>unsafe</div></foreignObject>
      <a href="https://example.com"><text>link</text></a>
      <text>safe</text>
    </svg>
  `)

  assert.equal(sanitized, "")
  assert.doesNotMatch(sanitized, /safe/)
  assert.doesNotMatch(sanitized, /script/i)
  assert.doesNotMatch(sanitized, /foreignObject/i)
  assert.doesNotMatch(sanitized, /onclick/i)
  assert.doesNotMatch(sanitized, /href/i)
})

test("MarkdownRenderer routes GFM tables through the shared report table shell", () => {
  const html = renderToStaticMarkup(
    React.createElement(MarkdownRenderer, {
      content: `| Feature | Detail |
|---|---|
| Setup | Fast |`,
    })
  )

  assert.match(html, /overflow-x-auto/)
  assert.match(html, /rounded-lg/)
  assert.match(html, /\[&amp;_thead\]:bg-foreground/)
  assert.match(html, /min-w-max/)
  assert.match(html, /<th>Feature<\/th>/)
  assert.match(html, /<td>Fast<\/td>/)
})

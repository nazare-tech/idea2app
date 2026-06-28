import test from "node:test"
import assert from "node:assert/strict"

import { sanitizeMermaidSvg } from "./markdown-renderer"

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

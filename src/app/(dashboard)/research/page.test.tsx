import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { ResearchInboxMovedNotice } from "./page"

test("retired Maker research route points to the standalone local app", () => {
  const html = renderToStaticMarkup(<ResearchInboxMovedNotice />)

  assert.match(html, /Research Inbox moved/)
  assert.match(html, /npm run research-inbox:dev/)
  assert.match(html, /http:\/\/127\.0\.0\.1:4310\//)
  assert.doesNotMatch(html, /Generate reply/)
})

import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"

import { ScrollableContent } from "./scrollable-content"

test("ScrollableContent mounts the derived AI Prompts workspace section after mockups", () => {
  const html = renderToStaticMarkup(
    <ScrollableContent
      projectId="project-1"
      documents={{
        competitive: { content: null, isGenerating: false },
        prd: { content: null, isGenerating: false },
        mvp: { content: null, isGenerating: false },
        mockups: { content: null, isGenerating: false },
      }}
    />,
  )

  assert.match(html, /id="mockups"/)
  assert.match(html, /id="ai-prompts"/)
  assert.match(html, /data-section="ai-prompts"/)
  assert.ok(html.indexOf('id="mockups"') < html.indexOf('id="ai-prompts"'))
  assert.match(html, /AI Prompts/)
})

test("ScrollableContent contains below-fold inactive document frames only", () => {
  const html = renderToStaticMarkup(
    <ScrollableContent
      projectId="project-1"
      activeDocument="prd"
      documents={{
        competitive: { content: null, isGenerating: false },
        prd: { content: null, isGenerating: false },
        mvp: { content: null, isGenerating: false },
        mockups: { content: null, isGenerating: false },
      }}
    />,
  )

  assert.doesNotMatch(html, /id="executive-summary"[^>]*content-visibility:auto/)
  assert.doesNotMatch(html, /id="prd"[^>]*content-visibility:auto/)
  assert.match(html, /id="market-research"[^>]*content-visibility:auto/)
  assert.match(html, /id="mvp"[^>]*content-visibility:auto/)
  assert.match(html, /id="mockups"[^>]*content-visibility:auto/)
})

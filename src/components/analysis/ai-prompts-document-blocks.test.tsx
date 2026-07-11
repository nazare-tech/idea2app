import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { AiPromptsDocumentBlocks } from "@/components/analysis/first-version-plan-blocks"

test("AiPromptsDocumentBlocks shows queued placeholders while a source plan is still generating", () => {
  const html = renderToStaticMarkup(
    <AiPromptsDocumentBlocks
      projectId="project-1"
      prdContent={null}
      mvpContent={`# First Version Plan

## MVP Summary
Build the smallest useful version.

## Recommended AI Build Tool
### Cursor
- **Why it fits**: Repo-aware.

## Next Prompt for AI Coding Tool
Build the shell.
`}
      prdSettled={false}
      mvpSettled={true}
    />,
  )

  // Available files render as real interactive cards...
  assert.match(html, /first-prompt\.md/)
  assert.match(html, /Copy first-prompt\.md/)
  // ...while files whose source plan has not settled render as queued,
  // non-interactive placeholders with their real identity.
  assert.match(html, /functional-requirements\.md/)
  assert.match(html, /Queued/)
  assert.doesNotMatch(html, /Copy functional-requirements\.md/)
  assert.doesNotMatch(html, /Still assembling AI Prompts/)
})

test("AiPromptsDocumentBlocks labels settled missing source sections as incomplete", () => {
  const html = renderToStaticMarkup(
    <AiPromptsDocumentBlocks
      projectId="project-1"
      prdContent="# PRD\n\n## 1. Introduction\/overview\nPartial."
      mvpContent="# First Version Plan\n\n## MVP Summary\nPartial."
      prdSettled
      mvpSettled
    />,
  )

  assert.match(html, /Some AI Prompts files are unavailable/)
  assert.doesNotMatch(html, /Still assembling AI Prompts/)
})

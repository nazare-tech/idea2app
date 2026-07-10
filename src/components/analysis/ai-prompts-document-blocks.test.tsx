import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { AiPromptsDocumentBlocks } from "@/components/analysis/first-version-plan-blocks"

test("AiPromptsDocumentBlocks labels progressively available content as still assembling", () => {
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

  assert.match(html, /Still assembling AI Prompts/)
  assert.match(html, /Available files can be inspected now/)
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

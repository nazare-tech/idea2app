import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE } from "@/lib/openrouter-image-mockup-format"
import { MockupRenderer } from "./mockup-renderer"

test("MockupRenderer: renders storyboard images with screen captions", () => {
  const content = JSON.stringify({
    type: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
    model: "fixture/mockup-no-credit",
    generatedAt: "2026-05-25T12:00:00.000Z",
    options: [
      {
        label: "A",
        title: "Focused dashboard",
        imageUrl: "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E",
        storagePath: "project/run/option-a-storyboard.svg",
        description: "Dense but calm workflow.",
        contentType: "image/svg+xml",
        screens: [
          { name: "Intake complete", caption: "Capture context" },
          { name: "Active workspace", caption: "Use the workflow" },
        ],
      },
    ],
  })

  const markup = renderToStaticMarkup(<MockupRenderer content={content} projectName="Fixture" />)

  assert.match(markup, /mockups-concept-1/)
  assert.match(markup, /Focused dashboard/)
  assert.match(markup, /Intake complete/)
  assert.match(markup, /Capture context/)
  assert.match(markup, /Export Image/)
  assert.doesNotMatch(markup, /max-height/)
})

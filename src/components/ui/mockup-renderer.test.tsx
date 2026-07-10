import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE } from "@/lib/mockups/openrouter-image-format"
import { MockupImageLightbox, MockupRenderer } from "./mockup-renderer"

test("MockupImageLightbox: opts into the near-full-viewport media presentation", () => {
  const markup = renderToStaticMarkup(
    <MockupImageLightbox
      fileName="fixture-mockup-option-a.png"
      imageUrl="/mockup.png"
      imageAlt="Concept 1: Focused dashboard"
      copied={false}
      onCopy={() => undefined}
      onDownload={() => undefined}
      onClose={() => undefined}
    />,
  )

  assert.match(markup, /h-\[calc\(100dvh-2rem\)\]/)
  assert.match(markup, /max-w-\[calc\(100vw-2rem\)\]/)
  assert.match(markup, /flex min-h-0 flex-1 items-center justify-center/)
  assert.match(markup, /h-full w-full max-w-full object-contain/)
  assert.match(markup, /alt="Concept 1: Focused dashboard"/)
  assert.match(markup, /aria-label="Copy fixture-mockup-option-a\.png"/)
  assert.match(markup, /aria-label="Download fixture-mockup-option-a\.png"/)
  assert.match(markup, /aria-label="Close preview"/)
})

test("MockupRenderer: renders simplified storyboard concept cards", () => {
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
  assert.match(markup, /Concept 1/)
  assert.match(markup, /Focused dashboard/)
  assert.match(markup, /Dense but calm workflow/)
  assert.match(markup, /Export Image/)
  assert.match(markup, /Open Concept 1 mockup in lightbox/)
  assert.match(markup, /cursor-zoom-in/)
  assert.doesNotMatch(markup, /Intake complete/)
  assert.doesNotMatch(markup, /Capture context/)
  assert.doesNotMatch(markup, /Option A/)
  assert.doesNotMatch(markup, /min-w-\[960px\]/)
  assert.doesNotMatch(markup, /max-height/)
})

test("MockupRenderer: renders draft storyboard placeholders for missing options", () => {
  const content = JSON.stringify({
    type: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
    model: "draft",
    generatedAt: "",
    options: [
      {
        label: "A",
        title: "Focused dashboard",
        imageUrl: "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E",
        storagePath: "project/run/option-a-storyboard.svg",
        description: "Dense but calm workflow.",
        contentType: "image/svg+xml",
      },
    ],
  })

  const markup = renderToStaticMarkup(
    <MockupRenderer
      content={content}
      expectedOptionLabels={["A", "B", "C"]}
      optionStatuses={[
        { label: "Option A", status: "ready", message: "Ready" },
        { label: "Option B", status: "generating", message: "Generating" },
        { label: "Option C", status: "generating", message: "Generating" },
      ]}
    />,
  )

  assert.match(markup, /Concept 1/)
  assert.match(markup, /Focused dashboard/)
  assert.match(markup, /Concept 2/)
  assert.match(markup, /Concept 3/)
  assert.match(markup, /Generating/)
  assert.doesNotMatch(markup, /Option B/)
  assert.doesNotMatch(markup, /Option C/)
})

test("MockupRenderer: renders retry messages for failed missing options", () => {
  const content = JSON.stringify({
    type: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
    model: "draft",
    generatedAt: "",
    options: [],
  })

  const markup = renderToStaticMarkup(
    <MockupRenderer
      content={content}
      expectedOptionLabels={["A", "B", "C"]}
      optionStatuses={[
        { label: "Option A", status: "needs_retry", message: "Needs retry" },
        { label: "Option B", status: "needs_retry", message: "Needs retry" },
        { label: "Option C", status: "needs_retry", message: "Needs retry" },
      ]}
    />,
  )

  assert.match(markup, /Concept 1/)
  assert.match(markup, /Needs retry/)
  assert.doesNotMatch(markup, /Waiting for image/)
})

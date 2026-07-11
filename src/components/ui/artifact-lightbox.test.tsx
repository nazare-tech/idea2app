import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { ArtifactLightbox } from "./artifact-lightbox"

test("ArtifactLightbox: keeps the default document presentation", () => {
  const markup = renderToStaticMarkup(
    <ArtifactLightbox fileName="project-context.md" onClose={() => undefined}>
      <article>Document preview</article>
    </ArtifactLightbox>,
  )

  assert.match(markup, /role="dialog"/)
  assert.match(markup, /aria-modal="true"/)
  assert.match(markup, /aria-label="project-context\.md preview"/)
  assert.match(markup, /max-h-\[calc\(100vh-4rem\)\]/)
  assert.match(markup, /max-w-4xl/)
  assert.match(markup, /overflow-y-auto/)
  assert.doesNotMatch(markup, /h-\[calc\(100dvh-2rem\)\]/)
  assert.doesNotMatch(markup, /max-w-\[calc\(100vw-2rem\)\]/)
  assert.match(markup, /aria-label="Close preview"/)
})

test("ArtifactLightbox: displayName replaces the file name in header and action labels", () => {
  const markup = renderToStaticMarkup(
    <ArtifactLightbox
      fileName="first-prompt.md"
      displayName="First prompt"
      onClose={() => undefined}
      onCopy={() => undefined}
      onDownload={() => undefined}
    >
      <article>Document preview</article>
    </ArtifactLightbox>,
  )

  assert.match(markup, /aria-label="First prompt preview"/)
  assert.match(markup, /aria-label="Copy First prompt"/)
  assert.match(markup, /aria-label="Download First prompt"/)
  assert.match(markup, />First prompt</)
  assert.doesNotMatch(markup, />first-prompt\.md</)
})

test("ArtifactLightbox: media presentation uses the available viewport without flex overflow", () => {
  const markup = renderToStaticMarkup(
    <ArtifactLightbox
      fileName="mockup-option-a.png"
      presentation="media"
      onClose={() => undefined}
      onCopy={() => undefined}
      onDownload={() => undefined}
    >
      <div>Mockup preview</div>
    </ArtifactLightbox>,
  )

  assert.match(markup, /h-\[calc\(100dvh-2rem\)\]/)
  assert.match(markup, /max-w-\[calc\(100vw-2rem\)\]/)
  assert.match(markup, /flex min-h-0 flex-1 overflow-hidden/)
  assert.match(markup, /aria-label="Copy mockup-option-a\.png"/)
  assert.match(markup, /aria-label="Download mockup-option-a\.png"/)
  assert.match(markup, /aria-label="Close preview"/)
})

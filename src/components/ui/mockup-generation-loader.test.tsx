import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { MockupGenerationLoader } from "./mockup-generation-loader"

test("MockupGenerationLoader: uses img-fx effect only before generated images exist", () => {
  const markup = renderToStaticMarkup(<MockupGenerationLoader />)

  assert.match(markup, /mockup-generation-loader/)
  assert.match(markup, /data-preview-image-count="0"/)
  assert.match(markup, /data-effect-image-count="0"/)
  assert.match(markup, /data-loader-image-source="effect-only"/)
  assert.match(markup, /data-auto-reveal="false"/)
  assert.doesNotMatch(markup, /mockup-loader-sweep/)
  assert.doesNotMatch(markup, /data:image\/svg/)
  assert.doesNotMatch(markup, /Rendering options/)
  assert.doesNotMatch(markup, /OpenRouter image storyboard/)
  assert.match(markup, /image-gen-root/)
  assert.doesNotMatch(markup, /landing\/hero/)
})

test("MockupGenerationLoader: keeps the stable loader while partial generated images exist", () => {
  const generatedImage = "/api/mockups/image?projectId=project-1&path=project-1%2Frun-1%2Foption-a-storyboard.png"
  const markup = renderToStaticMarkup(<MockupGenerationLoader images={["/api/mockups/image?old", generatedImage]} />)

  assert.match(markup, /mockup-generation-loader/)
  assert.match(markup, /data-preview-image-count="2"/)
  assert.match(markup, /data-effect-image-count="0"/)
  assert.match(markup, /data-loader-image-source="effect-only"/)
  assert.match(markup, /data-auto-reveal="false"/)
  assert.match(markup, /image-gen-root/)
  assert.doesNotMatch(markup, /data:image\/svg/)
  assert.doesNotMatch(markup, /mockup-loader-sweep/)
  assert.doesNotMatch(markup, /landing\/hero/)
})

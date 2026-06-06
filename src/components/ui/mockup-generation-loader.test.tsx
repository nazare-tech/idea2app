import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { MockupGenerationLoader } from "./mockup-generation-loader"

test("MockupGenerationLoader: renders the image generation loading surface", () => {
  const markup = renderToStaticMarkup(<MockupGenerationLoader />)

  assert.match(markup, /Rendering options/)
  assert.match(markup, /OpenRouter image storyboard/)
  assert.match(markup, /image-gen-root/)
})

import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { SpectralSignalClient } from "./spectral-signal-client"

test("SpectralSignalClient renders the exact static reference before WebGL is ready", () => {
  const markup = renderToStaticMarkup(<SpectralSignalClient />)

  assert.match(markup, /data-testid="spectral-signal"/)
  assert.match(markup, /data-renderer="fallback"/)
  assert.match(markup, /\/experiments\/spectral-signal\/reference\.png/)
  assert.match(markup, /<canvas[^>]*aria-hidden="true"/)
  assert.doesNotMatch(markup, /<canvas[^>]*role=/)
})

test("SpectralSignalClient exposes a stopped deterministic capture mode", () => {
  const markup = renderToStaticMarkup(<SpectralSignalClient captureMode />)

  assert.match(markup, /data-capture-mode="true"/)
  assert.match(markup, /data-animation-state="stopped"/)
})

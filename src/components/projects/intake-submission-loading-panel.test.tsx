import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"

import {
  INTAKE_LOADER_MESSAGES,
  INTAKE_LOADER_MESSAGE_INTERVAL_MS,
  getLoaderLineWidth,
  getLoaderMessageIndex,
  IntakeSubmissionLoadingPanel,
} from "./intake-submission-loading-panel"

test("getLoaderMessageIndex: advances one message per interval", () => {
  const count = INTAKE_LOADER_MESSAGES.length
  assert.equal(getLoaderMessageIndex(0, count), 0)
  assert.equal(getLoaderMessageIndex(INTAKE_LOADER_MESSAGE_INTERVAL_MS - 1, count), 0)
  assert.equal(getLoaderMessageIndex(INTAKE_LOADER_MESSAGE_INTERVAL_MS, count), 1)
  assert.equal(getLoaderMessageIndex(INTAKE_LOADER_MESSAGE_INTERVAL_MS * 2.5, count), 2)
})

test("getLoaderMessageIndex: clamps to the final message and holds", () => {
  const count = INTAKE_LOADER_MESSAGES.length
  const past = INTAKE_LOADER_MESSAGE_INTERVAL_MS * (count + 20)
  assert.equal(getLoaderMessageIndex(past, count), count - 1)
})

test("getLoaderLineWidth: fills monotonically and caps at 100", () => {
  const count = INTAKE_LOADER_MESSAGES.length
  const full = INTAKE_LOADER_MESSAGE_INTERVAL_MS * count
  assert.equal(getLoaderLineWidth(0, count), 0)
  assert.equal(getLoaderLineWidth(full / 2, count), 50)
  assert.equal(getLoaderLineWidth(full, count), 100)
  assert.equal(getLoaderLineWidth(full * 3, count), 100)
})

test("getLoaderLineWidth: never negative for pre-start clock skew", () => {
  assert.equal(getLoaderLineWidth(-5000, INTAKE_LOADER_MESSAGES.length), 0)
})

test("IntakeSubmissionLoadingPanel: renders the loader kicker and artifact labels", () => {
  const html = renderToStaticMarkup(<IntakeSubmissionLoadingPanel />)

  assert.match(html, /Creating your project/)
  assert.match(html, /about to get/)
  assert.match(html, /Market research/)
  assert.match(html, /Executive summary/)
  // First message renders (server render has elapsed 0 → index 0).
  assert.match(html, /Sending your idea to the research desk/)
})

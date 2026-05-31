import assert from "node:assert/strict"
import test from "node:test"

import {
  OPENROUTER_LONG_TEXT_TIMEOUT_MS,
  OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS,
  buildOpenRouterTimeoutMessage,
  formatOpenRouterTimeoutDuration,
  isOpenRouterAbortError,
} from "./openrouter-timeout"

test("OpenRouter long text timeout stays below the 300s route envelope", () => {
  assert.equal(OPENROUTER_LONG_TEXT_TIMEOUT_MS, 240_000)
  assert.ok(OPENROUTER_LONG_TEXT_TIMEOUT_MS < 300_000)
})

test("OpenRouter planning document timeout supports longer PRD and MVP runs", () => {
  assert.equal(OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS, 480_000)
  assert.ok(OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS < 540_000)
})

test("formatOpenRouterTimeoutDuration formats whole minutes", () => {
  assert.equal(formatOpenRouterTimeoutDuration(), "4 minutes")
  assert.equal(formatOpenRouterTimeoutDuration(OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS), "8 minutes")
  assert.equal(formatOpenRouterTimeoutDuration(90_000), "90 seconds")
})

test("isOpenRouterAbortError detects abort and timeout failures", () => {
  assert.equal(isOpenRouterAbortError(new DOMException("This operation was aborted", "AbortError")), true)
  assert.equal(isOpenRouterAbortError(new Error("Request timeout reached")), true)
  assert.equal(isOpenRouterAbortError(new Error("Provider returned 400")), false)
})

test("buildOpenRouterTimeoutMessage returns a user-facing timeout message", () => {
  assert.match(buildOpenRouterTimeoutMessage("Product Plan"), /Product Plan generation timed out after 4 minutes/)
  assert.match(
    buildOpenRouterTimeoutMessage("Product Plan", OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS),
    /Product Plan generation timed out after 8 minutes/,
  )
  assert.match(buildOpenRouterTimeoutMessage("Product Plan"), /smaller prompt/)
})

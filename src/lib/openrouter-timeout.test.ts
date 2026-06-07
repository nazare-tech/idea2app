import assert from "node:assert/strict"
import test from "node:test"

import {
  OPENROUTER_LONG_TEXT_TIMEOUT_MS,
  buildOpenRouterTimeoutMessage,
  formatOpenRouterTimeoutDuration,
  isOpenRouterAbortError,
} from "./openrouter-timeout"

test("OpenRouter long text timeout matches the Pro route envelope", () => {
  assert.equal(OPENROUTER_LONG_TEXT_TIMEOUT_MS, 790_000)
  assert.ok(OPENROUTER_LONG_TEXT_TIMEOUT_MS < 800_000)
})

test("formatOpenRouterTimeoutDuration formats whole minutes", () => {
  assert.equal(formatOpenRouterTimeoutDuration(), "790 seconds")
  assert.equal(formatOpenRouterTimeoutDuration(90_000), "90 seconds")
})

test("isOpenRouterAbortError detects abort and timeout failures", () => {
  assert.equal(isOpenRouterAbortError(new DOMException("This operation was aborted", "AbortError")), true)
  assert.equal(isOpenRouterAbortError(new Error("Request timeout reached")), true)
  assert.equal(isOpenRouterAbortError(new Error("Provider returned 400")), false)
})

test("buildOpenRouterTimeoutMessage returns a user-facing timeout message", () => {
  assert.match(buildOpenRouterTimeoutMessage("Product Plan"), /Product Plan generation timed out after 790 seconds/)
  assert.match(buildOpenRouterTimeoutMessage("Product Plan"), /smaller prompt/)
})

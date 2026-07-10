import test from "node:test"
import assert from "node:assert/strict"

import { shouldSubmitOnEnter } from "@/lib/intake/keyboard-submit"

function keyboardEvent(
  overrides: Partial<Parameters<typeof shouldSubmitOnEnter>[0]> = {}
): Parameters<typeof shouldSubmitOnEnter>[0] {
  return {
    key: "Enter",
    shiftKey: false,
    repeat: false,
    isComposing: false,
    ...overrides,
  }
}

test("shouldSubmitOnEnter accepts a plain Enter keydown", () => {
  assert.equal(shouldSubmitOnEnter(keyboardEvent()), true)
})

test("shouldSubmitOnEnter preserves Shift+Enter for a newline", () => {
  assert.equal(shouldSubmitOnEnter(keyboardEvent({ shiftKey: true })), false)
})

test("shouldSubmitOnEnter ignores non-Enter keys", () => {
  assert.equal(shouldSubmitOnEnter(keyboardEvent({ key: "a" })), false)
})

test("shouldSubmitOnEnter ignores IME composition keydowns", () => {
  assert.equal(shouldSubmitOnEnter(keyboardEvent({ isComposing: true })), false)
})

test("shouldSubmitOnEnter ignores repeated keydowns", () => {
  assert.equal(shouldSubmitOnEnter(keyboardEvent({ repeat: true })), false)
})

test("shouldSubmitOnEnter ignores disabled submissions", () => {
  assert.equal(shouldSubmitOnEnter(keyboardEvent(), true), false)
})

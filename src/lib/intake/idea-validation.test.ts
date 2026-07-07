import test from "node:test"
import assert from "node:assert/strict"

import {
  MAX_IDEA_LENGTH,
  MIN_IDEA_LENGTH,
  validateIdeaInput,
} from "@/lib/intake/idea-validation"

test("validateIdeaInput accepts a normal multi-sentence idea", () => {
  const result = validateIdeaInput(
    "A scheduling tool for dog walkers that handles bookings, payments, and route planning."
  )
  assert.equal(result.status, "ok")
})

test("validateIdeaInput rejects empty and whitespace-only input", () => {
  assert.equal(validateIdeaInput("").status, "empty")
  assert.equal(validateIdeaInput("   \n\t  ").status, "empty")
})

test("validateIdeaInput rejects input below the character floor", () => {
  const result = validateIdeaInput("app for walking dogs")
  assert.equal(result.status, "too-short")
})

test("validateIdeaInput boundary: 29 chars fails, 30 chars with enough words passes", () => {
  const twentyNine = "a tool for tracking my plants"
  assert.equal(twentyNine.length, 29)
  assert.equal(validateIdeaInput(twentyNine).status, "too-short")

  const thirty = "a tool for tracking my plantss"
  assert.equal(thirty.length, MIN_IDEA_LENGTH)
  assert.equal(validateIdeaInput(thirty).status, "ok")
})

test("validateIdeaInput rejects long input with too few words", () => {
  const result = validateIdeaInput("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa idea app")
  assert.equal(result.status, "too-few-words")
})

test("validateIdeaInput normalizes whitespace before counting", () => {
  const result = validateIdeaInput("  build   a   marketplace \n for vintage   camera gear  ")
  assert.equal(result.status, "ok")
  if (result.status === "ok") {
    assert.equal(result.idea, "build a marketplace for vintage camera gear")
  }
})

test("validateIdeaInput caps runaway input at the max length", () => {
  const result = validateIdeaInput(`build a tool that ${"does things ".repeat(2000)}`)
  assert.equal(result.status, "ok")
  if (result.status === "ok") {
    assert.ok(result.idea.length <= MAX_IDEA_LENGTH)
  }
})

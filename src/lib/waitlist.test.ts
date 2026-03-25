import test from "node:test"
import assert from "node:assert/strict"
import { WAITLIST_LIMIT, isWaitlistMode, validateWaitlistEmail } from "./waitlist"

// --- WAITLIST_LIMIT ---

test("WAITLIST_LIMIT is 200", () => {
  assert.equal(WAITLIST_LIMIT, 200)
})

// --- isWaitlistMode ---

test("isWaitlistMode returns false when no users have signed up", () => {
  assert.equal(isWaitlistMode(0), false)
})

test("isWaitlistMode returns false for 1 user below the limit", () => {
  assert.equal(isWaitlistMode(199), false)
})

test("isWaitlistMode returns true at exactly the limit", () => {
  assert.equal(isWaitlistMode(200), true)
})

test("isWaitlistMode returns true when user count exceeds the limit", () => {
  assert.equal(isWaitlistMode(201), true)
  assert.equal(isWaitlistMode(10_000), true)
})

// --- validateWaitlistEmail ---

test("validateWaitlistEmail returns null for a valid email", () => {
  assert.equal(validateWaitlistEmail("user@example.com"), null)
})

test("validateWaitlistEmail returns null for an email with a subdomain", () => {
  assert.equal(validateWaitlistEmail("user@mail.example.co.uk"), null)
})

test("validateWaitlistEmail returns null for an email with plus addressing", () => {
  assert.equal(validateWaitlistEmail("user+tag@example.org"), null)
})

test("validateWaitlistEmail returns an error for null input", () => {
  assert.notEqual(validateWaitlistEmail(null), null)
})

test("validateWaitlistEmail returns an error for undefined input", () => {
  assert.notEqual(validateWaitlistEmail(undefined), null)
})

test("validateWaitlistEmail returns an error for an empty string", () => {
  assert.notEqual(validateWaitlistEmail(""), null)
})

test("validateWaitlistEmail returns an error for a whitespace-only string", () => {
  assert.notEqual(validateWaitlistEmail("   "), null)
})

test("validateWaitlistEmail returns an error for a non-string input", () => {
  assert.notEqual(validateWaitlistEmail(42), null)
})

test("validateWaitlistEmail returns an error when '@' is missing", () => {
  assert.notEqual(validateWaitlistEmail("notanemail.com"), null)
})

test("validateWaitlistEmail returns an error when TLD is missing after '@'", () => {
  assert.notEqual(validateWaitlistEmail("user@nodot"), null)
})

test("validateWaitlistEmail returns an error for an email that is too long", () => {
  const longEmail = `${"a".repeat(250)}@example.com`
  assert.notEqual(validateWaitlistEmail(longEmail), null)
})

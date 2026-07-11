import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { CONTACT_MESSAGE_MAX, CONTACT_NAME_MAX, validateContactRequest } from "./contact"

const validInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "The mockup generator keeps timing out on step two.",
}

describe("validateContactRequest", () => {
  it("accepts a fully valid submission", () => {
    assert.equal(validateContactRequest(validInput), null)
  })

  it("accepts a missing or empty optional name", () => {
    assert.equal(validateContactRequest({ ...validInput, name: undefined }), null)
    assert.equal(validateContactRequest({ ...validInput, name: "" }), null)
  })

  it("rejects a non-string name", () => {
    assert.match(validateContactRequest({ ...validInput, name: 42 }) ?? "", /name must be text/i)
  })

  it("rejects a name over the max length", () => {
    const name = "a".repeat(CONTACT_NAME_MAX + 1)
    assert.match(validateContactRequest({ ...validInput, name }) ?? "", /name is too long/i)
  })

  it("requires an email", () => {
    assert.match(validateContactRequest({ ...validInput, email: undefined }) ?? "", /email is required/i)
    assert.match(validateContactRequest({ ...validInput, email: "   " }) ?? "", /email is required/i)
  })

  it("rejects malformed emails", () => {
    assert.match(validateContactRequest({ ...validInput, email: "not-an-email" }) ?? "", /valid email/i)
    assert.match(validateContactRequest({ ...validInput, email: "a@b" }) ?? "", /valid email/i)
  })

  it("rejects every email the DB constraint rejects (no retry-proof 500s)", () => {
    // contact_requests_email_format: '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    assert.match(validateContactRequest({ ...validInput, email: "john smith@gmail.com" }) ?? "", /valid email/i)
    assert.match(validateContactRequest({ ...validInput, email: "a@b@c.com" }) ?? "", /valid email/i)
    assert.match(validateContactRequest({ ...validInput, email: "a@b c.com" }) ?? "", /valid email/i)
    assert.equal(validateContactRequest({ ...validInput, email: "ada+notes@sub.example.co" }), null)
  })

  it("rejects an email over 254 characters", () => {
    const email = `${"a".repeat(250)}@example.com`
    assert.match(validateContactRequest({ ...validInput, email }) ?? "", /too long/i)
  })

  it("requires a message", () => {
    assert.match(validateContactRequest({ ...validInput, message: undefined }) ?? "", /message is required/i)
    assert.match(validateContactRequest({ ...validInput, message: "   " }) ?? "", /message is required/i)
  })

  it("rejects a message shorter than the minimum after trimming", () => {
    assert.match(validateContactRequest({ ...validInput, message: "  help  " }) ?? "", /more detail/i)
  })

  it("rejects a message over the max length", () => {
    const message = "a".repeat(CONTACT_MESSAGE_MAX + 1)
    assert.match(validateContactRequest({ ...validInput, message }) ?? "", /too long/i)
  })
})

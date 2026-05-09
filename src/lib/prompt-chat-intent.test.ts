import test from "node:test"
import assert from "node:assert/strict"

import { shouldResummarizePromptChatMessage } from "@/lib/prompt-chat-stage"

test("re-summarizes explicit idea edits", () => {
  assert.equal(
    shouldResummarizePromptChatMessage("Actually change the target audience to solo accountants instead of small agencies."),
    true,
  )
})

test("re-summarizes concrete business-model refinements", () => {
  assert.equal(
    shouldResummarizePromptChatMessage("Update the business model to a monthly subscription and remove the marketplace angle."),
    true,
  )
})

test("does not re-summarize a short general advice question", () => {
  assert.equal(
    shouldResummarizePromptChatMessage("What do you think about this market?"),
    false,
  )
})

test("does not re-summarize a broad implementation question", () => {
  assert.equal(
    shouldResummarizePromptChatMessage("How would you launch this?"),
    false,
  )
})

test("re-summarizes explicit summary requests", () => {
  assert.equal(
    shouldResummarizePromptChatMessage("Can you update the summary based on that change?"),
    true,
  )
})

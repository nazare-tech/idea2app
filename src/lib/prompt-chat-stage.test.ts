import test from "node:test"
import assert from "node:assert/strict"

import {
  determinePromptChatStage,
  shouldSummarizePromptChatReply,
} from "@/lib/prompt-chat-stage"

test("does not summarize immediately on a thin reply after question turn", () => {
  const history = [
    { role: "user", content: "I want to build software for freelancers." },
    {
      role: "assistant",
      content: "## Questions to Refine\n1. **Who is it for?**\n\nfreelancers, agencies\n2. **What problem does it solve?**\n\ninvoicing, taxes\n3. **What makes it different?**\n\nautomation, niche focus\n4. **How will you make money?**\n\nsubscription, one-time\n",
      metadata: { stage: "questions" },
    },
  ]

  assert.equal(shouldSummarizePromptChatReply("Freelancers mostly.", history), false)
  assert.equal(
    determinePromptChatStage({
      isInitial: false,
      hasSummary: false,
      history,
      message: "Freelancers mostly.",
    }),
    "gathering",
  )
})

test("summarizes when user provides a substantial multi-point answer", () => {
  const history = [
    { role: "user", content: "I want to build software for freelancers." },
    {
      role: "assistant",
      content: "## Questions to Refine\n1. **Who is it for?**\n\nfreelancers, agencies\n2. **What problem does it solve?**\n\ninvoicing, taxes\n3. **What makes it different?**\n\nautomation, niche focus\n4. **How will you make money?**\n\nsubscription, one-time\n",
      metadata: { stage: "questions" },
    },
  ]

  const reply = `1. Solo freelancers and small agencies\n2. It helps with invoicing, late payments, and tax tracking\n3. The wedge is automated follow-up and cash-flow visibility\n4. Monthly subscription with a free trial`

  assert.equal(shouldSummarizePromptChatReply(reply, history), true)
  assert.equal(
    determinePromptChatStage({
      isInitial: false,
      hasSummary: false,
      history,
      message: reply,
    }),
    "summary",
  )
})

test("keeps gathering when there is no summary yet and the reply is still partial", () => {
  const history = [
    { role: "user", content: "I want to build a local services marketplace." },
    {
      role: "assistant",
      content: "## Questions to Refine\n1. **Who are the buyers and sellers?**\n\nhomeowners, contractors\n2. **What transactions happen?**\n\nbookings, quotes\n3. **What is the niche?**\n\nplumbers, electricians\n4. **How do you make money?**\n\ncommission, subscription\n",
      metadata: { stage: "questions" },
    },
  ]

  assert.equal(
    determinePromptChatStage({
      isInitial: false,
      hasSummary: false,
      history,
      message: "Starting with plumbers in one city.",
    }),
    "gathering",
  )
})

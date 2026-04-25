import test from "node:test"
import assert from "node:assert/strict"
import { COMPETITIVE_ANALYSIS_SYSTEM_PROMPT } from "./prompts"

test("competitive analysis prompt requires a short founder verdict headline", () => {
  assert.match(
    COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
    /Founder Verdict.*2-8 words.*headline style.*exactly 3 concise bullets/s
  )
})

test("competitive analysis prompt requires direct competitor website links and key edge", () => {
  assert.match(
    COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
    /Direct Competitors.*### \[Competitor Name\]\(https:\/\/competitor-site\.example\).*Key Edge/s
  )
})

test("competitive analysis prompt defines workspace section ownership", () => {
  assert.match(
    COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
    /Executive Summary`: overview/
  )
  assert.match(
    COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
    /Strategic Recommendations`: market-research/
  )
})

import test from "node:test"
import assert from "node:assert/strict"
import { COMPETITIVE_ANALYSIS_SYSTEM_PROMPT } from "./prompts"

test("competitive analysis prompt includes verdict guidance inside executive summary", () => {
  assert.match(
    COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
    /Executive Summary.*2-8 words.*headline style.*exactly 3 concise bullets/s
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
    /Executive Summary`: executive-summary/
  )
  assert.match(
    COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
    /Recommended Next Moves`: market-research/
  )
})

test("competitive analysis prompt requires scored positioning evidence", () => {
  assert.match(
    COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
    /Positioning Map.*0-10.*Evidence Confidence/s
  )
  assert.match(
    COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
    /do not invent precision/i
  )
})

import test from "node:test"
import assert from "node:assert/strict"
import {
  COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
  buildCompetitiveAnalysisUserPrompt,
} from "./prompts"

test("competitive analysis prompt includes assessment guidance inside executive summary", () => {
  assert.match(
    COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
    /Executive Summary.*assessment line.*2-8 words.*headline style.*exactly 3 concise bullets covering assessment/s
  )
  assert.doesNotMatch(COMPETITIVE_ANALYSIS_SYSTEM_PROMPT, /verdict line/i)
})

test("competitive analysis prompt requires direct competitor website links and key edge when research exists", () => {
  assert.match(
    COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
    /Direct Competitors.*### \[Competitor Name\]\(https:\/\/competitor-site\.example\).*Key Edge/s
  )
})

test("competitive analysis prompt forbids fabricated direct profiles without live research", () => {
  const userPrompt = buildCompetitiveAnalysisUserPrompt(
    "A marketplace for neighborhood pet sitters",
    "Trusted Neighbors Pet Care",
    "   "
  )

  assert.match(
    COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
    /If live competitor research is unavailable or empty, do not output any `###` competitor profiles/
  )
  assert.match(
    userPrompt,
    /Live competitor research did not return usable competitor data/
  )
  assert.match(userPrompt, /Do not invent named direct competitors/)
  assert.match(userPrompt, /do not output H3 competitor profiles/i)
  assert.doesNotMatch(userPrompt, /identified through live web research/)
})

test("competitive analysis prompt treats empty-search sentinel as no live research", () => {
  const userPrompt = buildCompetitiveAnalysisUserPrompt(
    "AI travel planning for pet owners",
    "Paws Away",
    "No competitor data gathered from external search."
  )

  assert.match(
    userPrompt,
    /Live competitor research did not return usable competitor data/
  )
  assert.doesNotMatch(userPrompt, /identified through live web research/)
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

test("competitive analysis prompt omits market research risk sections", () => {
  assert.doesNotMatch(COMPETITIVE_ANALYSIS_SYSTEM_PROMPT, /Risks & Competitor Responses/)
  assert.doesNotMatch(COMPETITIVE_ANALYSIS_SYSTEM_PROMPT, /\*\*Risk:\*\*.*\*\*Competitor response:\*\*/s)
  assert.doesNotMatch(COMPETITIVE_ANALYSIS_SYSTEM_PROMPT, /SWOT Analysis/)
  assert.doesNotMatch(COMPETITIVE_ANALYSIS_SYSTEM_PROMPT, /Internal\/External and Positive\/Negative/)
})

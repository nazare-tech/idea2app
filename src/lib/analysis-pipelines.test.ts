import test from "node:test"
import assert from "node:assert/strict"

import { buildCompetitiveAnalysisUserPrompt } from "./prompts"
import {
  buildCompetitorContext,
  getCompetitorSearchStatus,
} from "./analysis-pipelines"

test("empty competitor search results produce no live-research prompt context", () => {
  const competitorContext = buildCompetitorContext([], [])
  const prompt = buildCompetitiveAnalysisUserPrompt(
    "AI travel planning for pet owners",
    "Paws Away",
    competitorContext,
  )

  assert.equal(competitorContext, "")
  assert.match(prompt, /No company-level live competitor research inputs are available/)
  assert.match(prompt, /output 3-5 conservative H3 competitor candidate profiles/)
  assert.match(prompt, /Start that section directly with the first `### Competitor Name` profile/)
  assert.doesNotMatch(prompt, /identified through live web research/)
})

test("competitors without usable URLs produce no live-research prompt context", () => {
  const perplexityData = {
    competitors: [
      {
        name: "Example Competitor",
        description: "A possible adjacent product",
        whyCompetes: "Targets a similar workflow",
        url: "not-a-url",
      },
    ],
    rawResponse: "{}",
  }
  const competitorContext = buildCompetitorContext(
    perplexityData.competitors,
    [],
  )

  assert.equal(competitorContext, "")
  assert.equal(getCompetitorSearchStatus(perplexityData), "unusable")
})

test("competitors with usable URLs preserve live-research prompt context", () => {
  const competitorContext = buildCompetitorContext(
    [
      {
        name: "Example Competitor",
        description: "A direct workflow product",
        whyCompetes: "Targets the same buyer",
        url: "https://competitor.example",
      },
    ],
    [
      {
        url: "https://competitor.example",
        content: "Competitor example offers a booking workflow and team dashboard.",
      },
    ],
  )

  assert.match(competitorContext, /## Example Competitor/)
  assert.match(competitorContext, /URL Content \(from https:\/\/competitor\.example\)/)
})

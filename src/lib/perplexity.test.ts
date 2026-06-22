import test from "node:test"
import assert from "node:assert/strict"

import { parsePerplexityCompetitorResponse } from "./perplexity"

test("parsePerplexityCompetitorResponse parses valid competitor JSON", () => {
  const result = parsePerplexityCompetitorResponse(`\`\`\`json
{
  "competitors": [
    {
      "name": "Competitor One",
      "description": "Workflow software",
      "whyCompetes": "Same buyer and job",
      "url": "https://competitor-one.example"
    }
  ]
}
\`\`\``)

  assert.equal(result.parseFailed, undefined)
  assert.equal(result.competitors.length, 1)
  assert.equal(result.competitors[0]?.name, "Competitor One")
  assert.equal(result.competitors[0]?.url, "https://competitor-one.example")
})

test("parsePerplexityCompetitorResponse marks prose without JSON as parse failed", () => {
  const result = parsePerplexityCompetitorResponse(
    "I found several competitors, but here they are in prose instead of JSON."
  )

  assert.equal(result.parseFailed, true)
  assert.deepEqual(result.competitors, [])
})

test("parsePerplexityCompetitorResponse treats empty response as empty", () => {
  const result = parsePerplexityCompetitorResponse("")

  assert.equal(result.parseFailed, undefined)
  assert.deepEqual(result.competitors, [])
})

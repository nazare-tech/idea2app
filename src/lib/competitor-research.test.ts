import test from "node:test"
import assert from "node:assert/strict"

import {
  getCompetitorSearchStatus,
  getUsableCompetitors,
  parseCompetitorSearchResponse,
} from "./competitor-research"

test("parseCompetitorSearchResponse parses fenced competitor JSON", () => {
  const result = parseCompetitorSearchResponse(`\`\`\`json
{
  "competitors": [
    {
      "name": "Competitor One",
      "description": "Workflow software",
      "whyCompetes": "Same buyer and job",
      "url": "https://competitor-one.com"
    }
  ]
}
\`\`\``)

  assert.equal(result.parseFailed, undefined)
  assert.deepEqual(result.competitors, [
    {
      name: "Competitor One",
      description: "Workflow software",
      whyCompetes: "Same buyer and job",
      url: "https://competitor-one.com",
    },
  ])
})

test("parseCompetitorSearchResponse extracts one balanced object from surrounding prose", () => {
  const rawResponse = `Research note with a literal { brace.
{"competitors":[{"name":"Brace Corp","description":"Handles } in quoted text","whyCompetes":"Same workflow","url":"https://brace.com"}]}
Trailing telemetry: {"ignored":true}`

  const result = parseCompetitorSearchResponse(rawResponse)

  assert.equal(result.parseFailed, undefined)
  assert.equal(result.rawResponse, rawResponse)
  assert.equal(result.competitors[0]?.name, "Brace Corp")
  assert.equal(result.competitors[0]?.description, "Handles } in quoted text")
})

test("parseCompetitorSearchResponse preserves current empty and malformed semantics", () => {
  assert.deepEqual(parseCompetitorSearchResponse(""), {
    competitors: [],
    rawResponse: "",
  })

  const prose = parseCompetitorSearchResponse("Several competitors were found in prose.")
  assert.equal(prose.parseFailed, true)
  assert.deepEqual(prose.competitors, [])

  const wrongShape = parseCompetitorSearchResponse('{"results":[]}')
  assert.equal(wrongShape.parseFailed, true)
  assert.deepEqual(wrongShape.competitors, [])
})

test("parseCompetitorSearchResponse bounds JSON scanning", () => {
  const result = parseCompetitorSearchResponse(
    `${"x".repeat(100_001)}{"competitors":[]}`,
  )

  assert.equal(result.parseFailed, true)
  assert.deepEqual(result.competitors, [])
})

test("parseCompetitorSearchResponse bounds candidate count and field lengths", () => {
  const competitors = Array.from({ length: 12 }, (_, index) => index === 0
    ? {
        name: ` Competitor ${index} ${"n".repeat(300)} `,
        description: "d".repeat(2_500),
        whyCompetes: "w".repeat(2_500),
        url: `https://example.com/${"u".repeat(2_100)}`,
      }
    : {
        name: `Competitor ${index}`,
        description: "Description",
        whyCompetes: "Same workflow",
        url: `https://example.com/${index}`,
      })
  const result = parseCompetitorSearchResponse(JSON.stringify({ competitors }))

  assert.equal(result.competitors.length, 10)
  assert.equal(result.competitors[0]?.name.length, 200)
  assert.equal(result.competitors[0]?.description.length, 2_000)
  assert.equal(result.competitors[0]?.whyCompetes.length, 2_000)
  assert.equal(result.competitors[0]?.url.length, 2_048)
  assert.equal(result.competitors[0]?.name.startsWith("Competitor 0"), true)
})

test("getUsableCompetitors keeps only named candidates with safe public URLs", () => {
  const usable = getUsableCompetitors([
    {
      name: " Safe Corp ",
      description: "A product",
      whyCompetes: "Same job",
      url: " https://safe.com/product ",
    },
    {
      name: "Local Corp",
      description: "A product",
      whyCompetes: "Same job",
      url: "http://127.0.0.1/internal",
    },
    {
      name: " ",
      description: "A product",
      whyCompetes: "Same job",
      url: "https://unnamed.com",
    },
  ])

  assert.deepEqual(usable, [
    {
      name: " Safe Corp ",
      description: "A product",
      whyCompetes: "Same job",
      url: "https://safe.com/product",
    },
  ])
})

test("getCompetitorSearchStatus distinguishes parse, empty, unusable, and found results", () => {
  assert.equal(
    getCompetitorSearchStatus({ competitors: [], rawResponse: "bad", parseFailed: true }),
    "parse_failed",
  )
  assert.equal(
    getCompetitorSearchStatus({ competitors: [], rawResponse: "" }),
    "empty",
  )
  assert.equal(
    getCompetitorSearchStatus({
      competitors: [{ name: "Unsafe", description: "", whyCompetes: "", url: "javascript:alert(1)" }],
      rawResponse: "{}",
    }),
    "unusable",
  )
  assert.equal(
    getCompetitorSearchStatus({
      competitors: [{ name: "Safe", description: "", whyCompetes: "", url: "https://safe.com" }],
      rawResponse: "{}",
    }),
    "found",
  )
})

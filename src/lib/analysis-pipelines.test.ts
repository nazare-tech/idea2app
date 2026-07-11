import test from "node:test"
import assert from "node:assert/strict"

import { buildCompetitiveAnalysisUserPrompt } from "./prompts"
import {
  buildCompetitorContext,
  buildCompetitorSourcesMetadata,
  gatherCompetitorResearch,
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
        url: "https://competitor.example.com",
      },
    ],
    [
      {
        url: "https://competitor.example.com",
        content: "Competitor example offers a booking workflow and team dashboard.",
      },
    ],
  )

  assert.match(competitorContext, /## Example Competitor/)
  assert.match(competitorContext, /URL Content \(from https:\/\/competitor\.example\.com\/\)/)
})

test("competitor source metadata persists only normalized HTTP(S) pairs", () => {
  assert.deepEqual(
    buildCompetitorSourcesMetadata([
      { name: " Example Competitor ", url: " https://competitor.example.com " },
      { name: "Unextracted", url: "https://unextracted.example.com" },
      { name: "Unsafe", url: "javascript:alert(1)" },
      { name: "Fake HTTP", url: "http-not-a-url" },
      { name: "Relative", url: "/competitor" },
    ], [
      { url: "https://competitor.example.com" },
      { url: "javascript:alert(1)" },
    ]),
    [{ name: "Example Competitor", url: "https://competitor.example.com/" }]
  )
})

const candidate = {
  name: "Current Competitor",
  description: "A current product",
  whyCompetes: "Same buyer and workflow",
  url: "https://current.example.com/",
}

test("OpenRouter Exa is primary and accepts syntactically safe candidates without identity validation", async () => {
  let perplexityCalls = 0
  let tavilyCalls = 0

  const result = await gatherCompetitorResearch(
    { idea: "A product idea", name: "Test Project", model: "test/model" },
    {
      openrouterExaDisabled: false,
      searchOpenRouterExa: async () => ({
        competitors: [candidate],
        rawResponse: "{}",
        citations: [
          {
            url: "https://different-source.example.com/research",
            title: "Different source",
            content: "Search evidence returned by Exa.",
          },
        ],
        evidenceResults: [
          {
            url: "https://different-source.example.com/research",
            title: "Different source",
            content: "Search evidence returned by Exa.",
          },
        ],
        modelUsed: "google/gemini-3.5-flash",
      }),
      searchPerplexity: async () => {
        perplexityCalls += 1
        return { competitors: [], rawResponse: "" }
      },
      extractTavily: async () => {
        tavilyCalls += 1
        return { results: [], failed_results: [] }
      },
    }
  )

  assert.equal(result.providerUsed, "openrouter_exa")
  assert.equal(result.fallbackUsed, false)
  assert.equal(result.openrouterExaStatus, "found")
  assert.equal(result.openrouterCitationCount, 1)
  assert.equal(perplexityCalls, 0)
  assert.equal(tavilyCalls, 0)
  assert.deepEqual(result.competitors, [candidate])
  const context = buildCompetitorContext(result.competitors, result.evidenceResults)
  assert.match(context, /Additional Research Evidence/)
  assert.match(context, /https:\/\/different-source\.example\.com\/research/)
  assert.match(context, /Search evidence returned by Exa/)
})

test("research progress reaches evidence review after Exa returns", async () => {
  const calls: string[] = []
  await gatherCompetitorResearch(
    { idea: "A product idea", name: "Test Project", model: "test/model" },
    {
      openrouterExaDisabled: false,
      searchOpenRouterExa: async () => {
        calls.push("exa")
        return {
          competitors: [candidate],
          rawResponse: "{}",
          citations: [{ url: candidate.url, content: "Evidence" }],
          evidenceResults: [{ url: candidate.url, content: "Evidence" }],
          modelUsed: "test/research-model",
        }
      },
      onEvidenceStage: () => calls.push("evidence_stage"),
    },
  )

  assert.deepEqual(calls, ["exa", "evidence_stage"])
})

test("fallback evidence stage fires before Tavily extraction", async () => {
  const calls: string[] = []
  await gatherCompetitorResearch(
    { idea: "A product idea", name: "Test Project", model: "test/model" },
    {
      openrouterExaDisabled: false,
      searchOpenRouterExa: async () => {
        calls.push("exa")
        throw new Error("unavailable")
      },
      searchPerplexity: async () => {
        calls.push("perplexity")
        return { competitors: [candidate], rawResponse: "{}" }
      },
      extractTavily: async () => {
        calls.push("tavily")
        return { results: [], failed_results: [] }
      },
      onEvidenceStage: () => calls.push("evidence_stage"),
    },
  )

  assert.deepEqual(calls, ["exa", "perplexity", "evidence_stage", "tavily"])
})

test("a progress callback failure is not misclassified as an Exa provider failure", async () => {
  let perplexityCalls = 0

  await assert.rejects(
    gatherCompetitorResearch(
      { idea: "A product idea", name: "Test Project", model: "test/model" },
      {
        openrouterExaDisabled: false,
        searchOpenRouterExa: async () => ({
          competitors: [candidate],
          rawResponse: "{}",
          citations: [{ url: candidate.url, content: "Evidence" }],
          evidenceResults: [{ url: candidate.url, content: "Evidence" }],
          modelUsed: "test/research-model",
        }),
        searchPerplexity: async () => {
          perplexityCalls += 1
          return { competitors: [candidate], rawResponse: "{}" }
        },
        onEvidenceStage: () => {
          throw new Error("stream disconnected")
        },
      },
    ),
    /progress callback failed/,
  )

  assert.equal(perplexityCalls, 0)
})

test("a fallback progress callback failure does not get reported as Tavily failure", async () => {
  let tavilyCalls = 0

  await assert.rejects(
    gatherCompetitorResearch(
      { idea: "A product idea", name: "Test Project", model: "test/model" },
      {
        openrouterExaDisabled: true,
        searchPerplexity: async () => ({ competitors: [candidate], rawResponse: "{}" }),
        extractTavily: async () => {
          tavilyCalls += 1
          return { results: [], failed_results: [] }
        },
        onEvidenceStage: () => {
          throw new Error("stream disconnected")
        },
      },
    ),
    /progress callback failed/,
  )

  assert.equal(tavilyCalls, 0)
})

for (const scenario of [
  { name: "missing", extract: async () => { throw new Error("Tavily API key not configured") }, status: "not_configured", provider: "perplexity" },
  { name: "thrown", extract: async () => { throw new Error("network error") }, status: "failed", provider: "perplexity" },
  { name: "empty", extract: async () => ({ results: [], failed_results: [] }), status: "empty", provider: "perplexity" },
  { name: "all failed", extract: async () => ({ results: [], failed_results: [{ url: candidate.url, error: "failed" }] }), status: "failed", provider: "perplexity" },
  { name: "partial", extract: async () => ({ results: [{ url: candidate.url, content: "Evidence" }], failed_results: [{ url: "https://other.example.com", error: "failed" }] }), status: "partial", provider: "perplexity_tavily" },
] as const) {
  test(`fallback provenance is accurate when Tavily is ${scenario.name}`, async () => {
    const result = await gatherCompetitorResearch(
      { idea: "A product idea", name: "Test Project", model: "test/model" },
      {
        openrouterExaDisabled: true,
        searchPerplexity: async () => ({ competitors: [candidate], rawResponse: "{}" }),
        extractTavily: scenario.extract,
      },
    )

    assert.equal(result.tavilyExtractStatus, scenario.status)
    assert.equal(result.providerUsed, scenario.provider)
  })
}

test("OpenRouter output without Exa citations falls back to Perplexity and Tavily", async () => {
  const calls: string[] = []

  const result = await gatherCompetitorResearch(
    { idea: "A product idea", name: "Test Project", model: "test/model" },
    {
      openrouterExaDisabled: false,
      searchOpenRouterExa: async () => {
        calls.push("openrouter_exa")
        return {
          competitors: [candidate],
          rawResponse: "{}",
          citations: [],
          evidenceResults: [],
          modelUsed: "google/gemini-3.5-flash",
        }
      },
      searchPerplexity: async () => {
        calls.push("perplexity")
        return { competitors: [candidate], rawResponse: "{}" }
      },
      extractTavily: async () => {
        calls.push("tavily")
        return {
          results: [
            {
              url: candidate.url,
              title: candidate.name,
              content: "Current Competitor serves the same workflow.",
            },
          ],
          failed_results: [],
        }
      },
    }
  )

  assert.deepEqual(calls, ["openrouter_exa", "perplexity", "tavily"])
  assert.equal(result.providerUsed, "perplexity_tavily")
  assert.equal(result.fallbackUsed, true)
  assert.equal(result.fallbackReason, "openrouter_no_citations")
})

test("OpenRouter Exa rollback flag uses the legacy path", async () => {
  let openrouterCalls = 0

  const result = await gatherCompetitorResearch(
    { idea: "A product idea", name: "Test Project", model: "test/model" },
    {
      openrouterExaDisabled: true,
      searchOpenRouterExa: async () => {
        openrouterCalls += 1
        throw new Error("should not run")
      },
      searchPerplexity: async () => ({ competitors: [candidate], rawResponse: "{}" }),
      extractTavily: async () => ({
        results: [{ url: candidate.url, content: "Legacy evidence" }],
        failed_results: [],
      }),
    }
  )

  assert.equal(openrouterCalls, 0)
  assert.equal(result.providerUsed, "perplexity_tavily")
  assert.equal(result.openrouterExaStatus, "disabled")
  assert.equal(result.fallbackUsed, false)
})

test("OpenRouter Exa errors fall back without failing Market Research", async () => {
  const result = await gatherCompetitorResearch(
    { idea: "A product idea", name: "Test Project", model: "test/model" },
    {
      openrouterExaDisabled: false,
      searchOpenRouterExa: async () => {
        throw new Error("tool unavailable")
      },
      searchPerplexity: async () => ({ competitors: [candidate], rawResponse: "{}" }),
      extractTavily: async () => ({
        results: [{ url: candidate.url, content: "Legacy evidence" }],
        failed_results: [],
      }),
    }
  )

  assert.equal(result.openrouterExaStatus, "failed")
  assert.equal(result.fallbackReason, "openrouter_error")
  assert.equal(result.providerUsed, "perplexity_tavily")
})

import test from "node:test"
import assert from "node:assert/strict"

import {
  buildOpenRouterExaCompetitorRequest,
  parseOpenRouterExaCompletion,
} from "./openrouter-competitor-research"

test("OpenRouter competitor research explicitly selects bounded Exa search", () => {
  const request = buildOpenRouterExaCompetitorRequest(
    "A feedback intelligence platform",
    "Signal Roadmap",
    "google/gemini-3.5-flash"
  )

  assert.equal(request.model, "google/gemini-3.5-flash")
  assert.deepEqual(request.tools, [
    {
      type: "openrouter:web_search",
      parameters: {
        engine: "exa",
        max_results: 5,
        max_total_results: 5,
        max_characters: 2_000,
      },
    },
  ])
  assert.match(
    request.messages[1]?.content ?? "",
    /must call the web search tool before answering/i
  )
})

test("OpenRouter Exa completion returns competitor JSON and bounded citations without identity validation", () => {
  const parsed = parseOpenRouterExaCompletion({
    model: "google/gemini-3.5-flash-20260519",
    choices: [
      {
        message: {
          content: JSON.stringify({
            competitors: [
              {
                name: "Example Competitor",
                description: "A relevant product",
                whyCompetes: "Targets the same workflow",
                url: "https://competitor.example.com",
              },
            ],
          }),
          annotations: [
            {
              type: "url_citation",
              url_citation: {
                url: "https://source.example.com/product",
                title: "Source title",
                content: "Direct Exa highlight",
                start_index: 0,
                end_index: 10,
              },
            },
            {
              type: "url_citation",
              url_citation: {
                url: "javascript:alert(1)",
                title: "Unsafe",
                content: "Ignored",
                start_index: 0,
                end_index: 10,
              },
            },
          ],
        },
      },
    ],
  })

  assert.equal(parsed.competitors.length, 1)
  assert.equal(parsed.modelUsed, "google/gemini-3.5-flash-20260519")
  assert.deepEqual(parsed.citations, [
    {
      url: "https://source.example.com/product",
      title: "Source title",
      content: "Direct Exa highlight",
    },
  ])
  assert.deepEqual(parsed.evidenceResults, parsed.citations)
})

test("OpenRouter Exa completion preserves parse-failure status", () => {
  const parsed = parseOpenRouterExaCompletion({
    model: "google/gemini-3.5-flash",
    choices: [{ message: { content: "not json", annotations: [] } }],
  })

  assert.equal(parsed.parseFailed, true)
  assert.deepEqual(parsed.competitors, [])
  assert.deepEqual(parsed.citations, [])
})

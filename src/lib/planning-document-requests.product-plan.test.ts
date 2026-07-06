import assert from "node:assert/strict"
import test from "node:test"

import {
  PRODUCT_PLAN_DEFAULT_MODEL,
  PRODUCT_PLAN_MAX_TOKENS,
  PRODUCT_PLAN_TEMPERATURE,
  buildProductPlanPromptRequest,
} from "./planning-document-requests"
import { buildPromptLabDefaultPrompts } from "@/lib/prompt-lab"

test("buildProductPlanPromptRequest includes full Market Research context without downstream truncation", () => {
  const markerNearEnd = "THIS COMPETITIVE DETAIL MUST SURVIVE"
  const longMarketResearch = `${"Market context. ".repeat(600)}${markerNearEnd}`

  const request = buildProductPlanPromptRequest({
    idea: "Gamified finance app for teens",
    name: "Money Quest",
    competitiveAnalysis: longMarketResearch,
  })

  assert.equal(request.model, PRODUCT_PLAN_DEFAULT_MODEL)
  assert.equal(request.maxTokens, PRODUCT_PLAN_MAX_TOKENS)
  assert.equal(request.temperature, PRODUCT_PLAN_TEMPERATURE)
  assert.match(request.userPrompt, /Gamified finance app for teens/)
  assert.match(request.userPrompt, /Money Quest/)
  assert.match(request.userPrompt, /Competitive and Gap analysis/)
  assert.match(request.userPrompt, new RegExp(markerNearEnd))
  assert.doesNotMatch(request.userPrompt, /truncated to first 6000 characters/i)
})

test("Product Plan production request matches Prompt Lab default prompt construction", () => {
  const input = {
    idea: "AI scheduling assistant for clinics",
    name: "ClinicFlow",
    competitiveAnalysis: "Competitor A has weak intake automation.",
  }

  const productionRequest = buildProductPlanPromptRequest(input)
  const labDefault = buildPromptLabDefaultPrompts({
    artifact: "prd",
    ...input,
  })

  assert.equal(labDefault.systemPrompt, productionRequest.systemPrompt)
  assert.equal(labDefault.userPrompt, productionRequest.userPrompt)
  assert.equal(labDefault.model, productionRequest.model)
})

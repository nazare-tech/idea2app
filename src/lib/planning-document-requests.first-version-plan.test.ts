import assert from "node:assert/strict"
import test from "node:test"

import {
  FIRST_VERSION_PLAN_DEFAULT_MODEL,
  FIRST_VERSION_PLAN_MAX_TOKENS,
  FIRST_VERSION_PLAN_TEMPERATURE,
  buildFirstVersionPlanPromptRequest,
} from "./planning-document-requests"
import { buildPromptLabDefaultPrompts } from "@/lib/prompt-lab"

test("buildFirstVersionPlanPromptRequest includes full Product Plan context without downstream truncation", () => {
  const markerNearEnd = "THIS PRODUCT PLAN DETAIL MUST SURVIVE"
  const longProductPlan = `${"Product requirement context. ".repeat(600)}${markerNearEnd}`

  const request = buildFirstVersionPlanPromptRequest({
    idea: "Gamified finance app for teens",
    name: "Money Quest",
    prd: longProductPlan,
  })

  assert.equal(request.model, FIRST_VERSION_PLAN_DEFAULT_MODEL)
  assert.equal(request.maxTokens, FIRST_VERSION_PLAN_MAX_TOKENS)
  assert.equal(request.temperature, FIRST_VERSION_PLAN_TEMPERATURE)
  assert.match(request.userPrompt, /Gamified finance app for teens/)
  assert.match(request.userPrompt, /Money Quest/)
  assert.match(request.userPrompt, /Product Plan:/)
  assert.match(request.userPrompt, new RegExp(markerNearEnd))
  assert.doesNotMatch(request.userPrompt, /truncated to first 6000 characters/i)
})

test("First Version Plan production request matches Prompt Lab default prompt construction", () => {
  const input = {
    idea: "AI scheduling assistant for clinics",
    name: "ClinicFlow",
    prd: "## Product Plan\n\nClinics need intake automation and appointment triage.",
  }

  const productionRequest = buildFirstVersionPlanPromptRequest(input)
  const labDefault = buildPromptLabDefaultPrompts({
    artifact: "mvp",
    ...input,
  })

  assert.equal(labDefault.systemPrompt, productionRequest.systemPrompt)
  assert.equal(labDefault.userPrompt, productionRequest.userPrompt)
  assert.equal(labDefault.model, productionRequest.model)
})

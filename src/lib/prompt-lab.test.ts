import assert from "node:assert/strict"
import test from "node:test"

import {
  buildPromptLabDefaultPrompts,
  isMockupOptionLabel,
  isPromptLabArtifact,
  isPromptLabEnabled,
} from "./prompt-lab"

test("isPromptLabEnabled: blocks production environments", () => {
  assert.equal(isPromptLabEnabled({ NODE_ENV: "production", VERCEL_ENV: undefined }), false)
  assert.equal(isPromptLabEnabled({ NODE_ENV: "development", VERCEL_ENV: "production" }), false)
  assert.equal(isPromptLabEnabled({ NODE_ENV: "development", VERCEL_ENV: undefined }), true)
})

test("Prompt Lab artifact validation only accepts supported artifacts", () => {
  assert.equal(isPromptLabArtifact("competitive"), true)
  assert.equal(isPromptLabArtifact("launch"), true)
  assert.equal(isPromptLabArtifact("techspec"), false)
  assert.equal(isPromptLabArtifact(null), false)
})

test("Prompt Lab mockup option validation only accepts A/B/C", () => {
  assert.equal(isMockupOptionLabel("A"), true)
  assert.equal(isMockupOptionLabel("B"), true)
  assert.equal(isMockupOptionLabel("D"), false)
})

test("buildPromptLabDefaultPrompts: builds upstream-aware PRD prompt", () => {
  const result = buildPromptLabDefaultPrompts({
    artifact: "prd",
    idea: "AI scheduling assistant for clinics",
    name: "ClinicFlow",
    competitiveAnalysis: "Competitor A has weak intake automation.",
  })

  assert.equal(result.model, "anthropic/claude-sonnet-4-6")
  assert.match(result.systemPrompt, /Product Plan Agent/)
  assert.match(result.userPrompt, /ClinicFlow/)
  assert.match(result.userPrompt, /Competitor A has weak intake automation/)
})

test("buildPromptLabDefaultPrompts: builds single-option mockup prompt", () => {
  const result = buildPromptLabDefaultPrompts({
    artifact: "mockups",
    idea: "AI scheduling assistant for clinics",
    name: "ClinicFlow",
    mvpPlan: "# First Version Plan\n\nCore scheduling workflow.",
    mockupOption: "B",
  })

  assert.match(result.systemPrompt, /static UI mockup images/)
  assert.match(result.userPrompt, /Create option B/)
  assert.match(result.userPrompt, /Core scheduling workflow/)
})

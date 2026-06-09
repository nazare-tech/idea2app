import assert from "node:assert/strict"
import test from "node:test"

import {
  PROMPT_LAB_DEFAULT_MODELS,
  PROMPT_LAB_IMAGE_MODEL_OPTIONS,
  PROMPT_LAB_MOCKUP_SKIP_IMAGE_GENERATION_DEFAULT,
  PROMPT_LAB_TEXT_MODEL_OPTIONS,
  applyPromptLabMockupPlatformOverride,
  buildPromptLabDefaultPrompts,
  getBasePromptLabModelOptions,
  getPromptLabModelOptions,
  isMockupOptionLabel,
  isPromptLabArtifact,
  isPromptLabEnabled,
} from "./prompt-lab"
import type { MockupDesignPlan } from "./mockup-design-plan"
import { PRODUCT_PLAN_DEFAULT_MODEL } from "./product-plan-config"
import { FIRST_VERSION_PLAN_DEFAULT_MODEL } from "./first-version-plan-config"

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

test("Prompt Lab mockup runs default to prompt-only image generation", () => {
  assert.equal(PROMPT_LAB_MOCKUP_SKIP_IMAGE_GENERATION_DEFAULT, true)
})

test("applyPromptLabMockupPlatformOverride: selected platform wins over parsed planner output", () => {
  const designPlan: MockupDesignPlan = {
    version: "mockup-design-plan-v1",
    primaryPlatform: "native-mobile-app",
    happyPathScenario: "A user completes the main flow.",
    persona: "Primary user",
    screens: [],
    directions: [],
  }

  assert.equal(
    applyPromptLabMockupPlatformOverride(designPlan, "mobile-web").primaryPlatform,
    "mobile-web",
  )
  assert.equal(
    applyPromptLabMockupPlatformOverride(designPlan, "auto").primaryPlatform,
    "native-mobile-app",
  )
})

test("buildPromptLabDefaultPrompts: builds upstream-aware PRD prompt", () => {
  const result = buildPromptLabDefaultPrompts({
    artifact: "prd",
    idea: "AI scheduling assistant for clinics",
    name: "ClinicFlow",
    competitiveAnalysis: "Competitor A has weak intake automation.",
  })

  assert.equal(result.model, PRODUCT_PLAN_DEFAULT_MODEL)
  assert.match(result.systemPrompt, /expert product manager and PRD writer/)
  assert.match(result.userPrompt, /ClinicFlow/)
  assert.match(result.userPrompt, /Competitor A has weak intake automation/)
})

test("buildPromptLabDefaultPrompts: builds upstream-aware First Version Plan prompt", () => {
  const result = buildPromptLabDefaultPrompts({
    artifact: "mvp",
    idea: "AI scheduling assistant for clinics",
    name: "ClinicFlow",
    prd: "## Product Plan\n\nPrioritize intake automation and appointment triage.",
  })

  assert.equal(result.model, FIRST_VERSION_PLAN_DEFAULT_MODEL)
  assert.match(result.systemPrompt, /MVP Plan Generator/)
  assert.match(result.userPrompt, /ClinicFlow/)
  assert.match(result.userPrompt, /Product Plan:/)
  assert.match(result.userPrompt, /Prioritize intake automation/)
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

test("Prompt Lab model options filter text and image models by artifact", () => {
  const textOptions = getBasePromptLabModelOptions("prd")
  const mockupOptions = getBasePromptLabModelOptions("mockups")

  assert.deepEqual(textOptions, PROMPT_LAB_TEXT_MODEL_OPTIONS)
  assert.deepEqual(mockupOptions, PROMPT_LAB_IMAGE_MODEL_OPTIONS)
  assert.ok(textOptions.some((option) => option.id === "anthropic/claude-sonnet-4-6"))
  assert.ok(textOptions.some((option) => option.id === "google/gemini-3.1-pro-preview"))
  assert.ok(textOptions.some((option) => option.id === "qwen/qwen3.6-plus"))
  assert.ok(textOptions.some((option) => option.id === "xiaomi/mimo-v2.5-pro"))
  assert.ok(mockupOptions.some((option) => option.id === "openai/gpt-5.4-image-2"))
  assert.ok(mockupOptions.some((option) => option.id === "google/gemini-2.5-flash-image"))
  assert.equal(mockupOptions.some((option) => option.id === "anthropic/claude-sonnet-4-6"), false)
  assert.equal(mockupOptions.some((option) => option.id === "qwen/qwen3.6-plus"), false)
  assert.equal(mockupOptions.some((option) => option.id === "xiaomi/mimo-v2.5-pro"), false)
})

test("Prompt Lab curated options include configured defaults or a current-model fallback", () => {
  for (const [artifact, defaultModel] of Object.entries(PROMPT_LAB_DEFAULT_MODELS)) {
    const options = getPromptLabModelOptions(artifact as keyof typeof PROMPT_LAB_DEFAULT_MODELS, defaultModel)
    assert.ok(
      options.some((option) => option.id === defaultModel),
      `${artifact} default model should be selectable`,
    )
  }
})

test("Prompt Lab model options keep saved legacy models selectable", () => {
  const options = getPromptLabModelOptions("launch", "custom/provider-model")

  assert.equal(options[0].id, "custom/provider-model")
  assert.match(options[0].label, /current/)
  assert.ok(options.some((option) => option.id === "openai/gpt-5.4-mini"))
})

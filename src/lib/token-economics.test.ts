import test from "node:test"
import assert from "node:assert/strict"
import {
  BASE_ACTION_TOKENS,
  GENERATE_ALL_ACTION_MAP,
  estimateGenerateAllCost,
  getModelTokenMultiplier,
  getTokenCost,
} from "./token-economics"

// =============================================================================
// BASE_ACTION_TOKENS
// =============================================================================

test("BASE_ACTION_TOKENS: competitive-analysis base is 10", () => {
  assert.equal(BASE_ACTION_TOKENS["competitive-analysis"], 10)
})

test("BASE_ACTION_TOKENS: prd base is 10", () => {
  assert.equal(BASE_ACTION_TOKENS["prd"], 10)
})

test("BASE_ACTION_TOKENS: mvp-plan base is 10", () => {
  assert.equal(BASE_ACTION_TOKENS["mvp-plan"], 10)
})

test("BASE_ACTION_TOKENS: mockup base is 30", () => {
  assert.equal(BASE_ACTION_TOKENS["mockup"], 30)
})

test("BASE_ACTION_TOKENS: launch-plan base is 5", () => {
  assert.equal(BASE_ACTION_TOKENS["launch-plan"], 5)
})

// =============================================================================
// GENERATE_ALL_ACTION_MAP
// =============================================================================

test("GENERATE_ALL_ACTION_MAP: competitive → competitive-analysis", () => {
  assert.equal(GENERATE_ALL_ACTION_MAP["competitive"], "competitive-analysis")
})

test("GENERATE_ALL_ACTION_MAP: prd → prd", () => {
  assert.equal(GENERATE_ALL_ACTION_MAP["prd"], "prd")
})

test("GENERATE_ALL_ACTION_MAP: mvp → mvp-plan", () => {
  assert.equal(GENERATE_ALL_ACTION_MAP["mvp"], "mvp-plan")
})

test("GENERATE_ALL_ACTION_MAP: mockups → mockup", () => {
  assert.equal(GENERATE_ALL_ACTION_MAP["mockups"], "mockup")
})

test("GENERATE_ALL_ACTION_MAP: launch → launch-plan", () => {
  assert.equal(GENERATE_ALL_ACTION_MAP["launch"], "launch-plan")
})

test("GENERATE_ALL_ACTION_MAP: covers all 5 Generate All doc types", () => {
  const keys = Object.keys(GENERATE_ALL_ACTION_MAP)
  assert.ok(keys.includes("competitive"))
  assert.ok(keys.includes("prd"))
  assert.ok(keys.includes("mvp"))
  assert.ok(keys.includes("mockups"))
  assert.ok(keys.includes("launch"))
  assert.equal(keys.length, 5)
})

// =============================================================================
// getModelTokenMultiplier
// =============================================================================

test("getModelTokenMultiplier: returns 1.0 for undefined", () => {
  assert.equal(getModelTokenMultiplier(undefined), 1.0)
})

test("getModelTokenMultiplier: returns 1.0 for unknown model", () => {
  assert.equal(getModelTokenMultiplier("some-unknown-model-xyz"), 1.0)
})

test("getModelTokenMultiplier: returns 1.0 for 'stitch' (Mockups fixed model)", () => {
  // Stitch SDK has no multiplier entry — uses default 1.0
  assert.equal(getModelTokenMultiplier("stitch"), 1.0)
})

// --- gpt-5 family ---

test("getModelTokenMultiplier: gpt-5-mini returns 0.85 (cheaper than gpt-5)", () => {
  assert.equal(getModelTokenMultiplier("openai/gpt-5-mini"), 0.85)
})

test("getModelTokenMultiplier: gpt-5 (non-mini) returns 1.5 (premium)", () => {
  assert.equal(getModelTokenMultiplier("openai/gpt-5"), 1.5)
})

// CRITICAL regression guard: gpt-5-mini must NOT match the gpt-5 pattern.
// The original bug was that MODEL_MULTIPLIERS checked "gpt-5" before "gpt-5-mini",
// making gpt-5-mini get 1.5x instead of 0.85x.
test("REGRESSION: gpt-5-mini multiplier (0.85) is less than gpt-5 multiplier (1.5)", () => {
  const miniMultiplier = getModelTokenMultiplier("openai/gpt-5-mini")
  const fullMultiplier = getModelTokenMultiplier("openai/gpt-5")
  assert.equal(miniMultiplier, 0.85)
  assert.equal(fullMultiplier, 1.5)
  assert.ok(miniMultiplier < fullMultiplier, "mini should be cheaper than full gpt-5")
})

test("getModelTokenMultiplier: gpt-5-mini with version suffix stays 0.85", () => {
  assert.equal(getModelTokenMultiplier("openai/gpt-5-mini-2024-07-18"), 0.85)
})

// --- Claude family ---

test("getModelTokenMultiplier: claude-opus returns 1.35", () => {
  assert.equal(getModelTokenMultiplier("anthropic/claude-opus-4"), 1.35)
})

test("getModelTokenMultiplier: claude-sonnet returns 1.15", () => {
  assert.equal(getModelTokenMultiplier("claude-sonnet-4-6"), 1.15)
})

test("getModelTokenMultiplier: claude-sonnet (full ID) returns 1.15", () => {
  assert.equal(getModelTokenMultiplier("anthropic/claude-sonnet-4-6"), 1.15)
})

// claude-opus must NOT match claude-sonnet pattern (more specific first)
test("REGRESSION: claude-opus multiplier (1.35) is different from claude-sonnet (1.15)", () => {
  const opusMultiplier = getModelTokenMultiplier("anthropic/claude-opus-4")
  const sonnetMultiplier = getModelTokenMultiplier("anthropic/claude-sonnet-4-6")
  assert.notEqual(opusMultiplier, sonnetMultiplier)
})

// --- Other providers ---

test("getModelTokenMultiplier: grok-4-1-fast returns 0.8", () => {
  assert.equal(getModelTokenMultiplier("x-ai/grok-4-1-fast"), 0.8)
})

test("getModelTokenMultiplier: deepseek returns 0.8", () => {
  assert.equal(getModelTokenMultiplier("deepseek/deepseek-v3"), 0.8)
})

test("getModelTokenMultiplier: free models return 0.5", () => {
  assert.equal(getModelTokenMultiplier("some-model:free"), 0.5)
})

test("getModelTokenMultiplier: gemini-2.5-flash returns 0.9", () => {
  assert.equal(getModelTokenMultiplier("google/gemini-2.5-flash"), 0.9)
})

test("getModelTokenMultiplier: is case-insensitive", () => {
  assert.equal(getModelTokenMultiplier("OpenAI/GPT-5-MINI"), 0.85)
  assert.equal(getModelTokenMultiplier("CLAUDE-OPUS-4"), 1.35)
  assert.equal(getModelTokenMultiplier("X-AI/GROK-4-1-FAST"), 0.8)
})

// =============================================================================
// getTokenCost
// =============================================================================

test("getTokenCost: competitive-analysis with no model = base × 1.0 = 10", () => {
  assert.equal(getTokenCost("competitive-analysis"), 10)
})

test("getTokenCost: prd with no model = 10", () => {
  assert.equal(getTokenCost("prd"), 10)
})

test("getTokenCost: mvp-plan with no model = 10", () => {
  assert.equal(getTokenCost("mvp-plan"), 10)
})

test("getTokenCost: mockup with no model = 30", () => {
  assert.equal(getTokenCost("mockup"), 30)
})

test("getTokenCost: launch-plan with no model = 5", () => {
  assert.equal(getTokenCost("launch-plan"), 5)
})

test("getTokenCost: mockup with stitch model = 30 (no multiplier, uses default 1.0)", () => {
  assert.equal(getTokenCost("mockup", "stitch"), 30)
})

test("getTokenCost: uses ceiling rounding (never rounds down)", () => {
  // competitive-analysis=10, claude-sonnet=1.15x → 10 × 1.15 = 11.5 → ceil = 12
  assert.equal(getTokenCost("competitive-analysis", "claude-sonnet-4-6"), 12)
})

test("getTokenCost: minimum is 1 (never returns 0)", () => {
  // chat=1 × :free=0.5 → 0.5 → ceil=1, max(1,1)=1
  assert.equal(getTokenCost("chat", "some-model:free"), 1)
})

test("getTokenCost: grok-4-1-fast (0.8x) on competitive-analysis (10) → ceil(8.0) = 8", () => {
  assert.equal(getTokenCost("competitive-analysis", "x-ai/grok-4-1-fast"), 8)
})

test("getTokenCost: grok-4-1-fast (0.8x) on launch-plan (5) → ceil(4.0) = 4", () => {
  assert.equal(getTokenCost("launch-plan", "x-ai/grok-4-1-fast"), 4)
})

test("getTokenCost: gpt-5-mini (0.85x) on competitive-analysis (10) → ceil(8.5) = 9", () => {
  assert.equal(getTokenCost("competitive-analysis", "openai/gpt-5-mini"), 9)
})

test("getTokenCost: gpt-5 (1.5x) on competitive-analysis (10) → 15", () => {
  assert.equal(getTokenCost("competitive-analysis", "openai/gpt-5"), 15)
})

test("getTokenCost: gpt-5 (1.5x) on mockup (30) → 45", () => {
  assert.equal(getTokenCost("mockup", "openai/gpt-5"), 45)
})

test("getTokenCost: claude-opus (1.35x) on prd (10) → ceil(13.5) = 14", () => {
  assert.equal(getTokenCost("prd", "anthropic/claude-opus-4"), 14)
})

test("getTokenCost: deep-seek (0.8x) on mvp-plan (10) → 8", () => {
  assert.equal(getTokenCost("mvp-plan", "deepseek/deepseek-v3"), 8)
})

// =============================================================================
// estimateGenerateAllCost
// =============================================================================

// Default models: grok-4-1-fast (0.8x) for text docs, stitch (1.0x) for mockups
// competitive: ceil(10×0.8)=8, prd: 8, mvp: 8, mockups: 30, launch: ceil(5×0.8)=4 → total=58
const DEFAULT_MODELS = {
  competitive: "x-ai/grok-4-1-fast",
  prd: "x-ai/grok-4-1-fast",
  mvp: "x-ai/grok-4-1-fast",
  mockups: "stitch",
  launch: "x-ai/grok-4-1-fast",
}

test("estimateGenerateAllCost: all 5 docs with default grok models = 58 credits", () => {
  assert.equal(estimateGenerateAllCost(DEFAULT_MODELS), 58)
})

test("estimateGenerateAllCost: skipping all docs = 0", () => {
  const skipAll = new Set(["competitive", "prd", "mvp", "mockups", "launch"])
  assert.equal(estimateGenerateAllCost(DEFAULT_MODELS, skipAll), 0)
})

test("estimateGenerateAllCost: skipping mockups (30 credits) reduces total by 30", () => {
  const full = estimateGenerateAllCost(DEFAULT_MODELS)
  const withoutMockups = estimateGenerateAllCost(DEFAULT_MODELS, new Set(["mockups"]))
  assert.equal(full - withoutMockups, 30)
})

test("estimateGenerateAllCost: skipping competitive reduces total by 8 (grok 0.8x on base 10)", () => {
  const full = estimateGenerateAllCost(DEFAULT_MODELS)
  const withoutCompetitive = estimateGenerateAllCost(DEFAULT_MODELS, new Set(["competitive"]))
  assert.equal(full - withoutCompetitive, 8)
})

test("estimateGenerateAllCost: skipping launch reduces total by 4 (grok 0.8x on base 5)", () => {
  const full = estimateGenerateAllCost(DEFAULT_MODELS)
  const withoutLaunch = estimateGenerateAllCost(DEFAULT_MODELS, new Set(["launch"]))
  assert.equal(full - withoutLaunch, 4)
})

test("estimateGenerateAllCost: switching competitive to gpt-5 (1.5x) increases cost", () => {
  const premiumModels = { ...DEFAULT_MODELS, competitive: "openai/gpt-5" }
  const baseCost = estimateGenerateAllCost(DEFAULT_MODELS)
  const premiumCost = estimateGenerateAllCost(premiumModels)
  // competitive: gpt-5 → 15 vs grok → 8, difference = 7
  assert.equal(premiumCost - baseCost, 7)
})

test("estimateGenerateAllCost: switching mockups to gpt-5 (1.5x) raises mockup cost to 45", () => {
  const premiumModels = { ...DEFAULT_MODELS, mockups: "openai/gpt-5" }
  const premiumCost = estimateGenerateAllCost(premiumModels)
  // mockup: gpt-5 → 45 vs stitch → 30, difference = 15
  const baseCost = estimateGenerateAllCost(DEFAULT_MODELS)
  assert.equal(premiumCost - baseCost, 15)
})

test("estimateGenerateAllCost: skipping competitive and prd saves 16 credits (8+8)", () => {
  const skip = new Set(["competitive", "prd"])
  const full = estimateGenerateAllCost(DEFAULT_MODELS)
  const partial = estimateGenerateAllCost(DEFAULT_MODELS, skip)
  assert.equal(full - partial, 16)
})

test("estimateGenerateAllCost: empty model selections uses default multiplier 1.0", () => {
  // competitive-analysis=10×1.0=10, prd=10, mvp=10, mockup=30, launch=5 → total=65
  const cost = estimateGenerateAllCost({})
  assert.equal(cost, 65)
})

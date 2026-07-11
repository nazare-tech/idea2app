import test from "node:test"
import assert from "node:assert/strict"

import {
  DEFAULT_REASONING_HEADROOM_TOKENS,
  PRO_TIER_TEXT_MODEL,
  STANDARD_TIER_TEXT_MODEL,
  getReasoningParams,
  isTierModelRoutingEnabled,
  resolveGenerationTier,
  resolveTierTextModel,
  withReasoningHeadroom,
} from "./generation-model-policy"

const POLICY_ENV_KEYS = [
  "TIER_MODEL_ROUTING_DISABLED",
  "OPENROUTER_STANDARD_TIER_MODEL",
  "OPENROUTER_PRO_TIER_MODEL",
] as const

function withCleanPolicyEnv(run: () => void) {
  const saved = POLICY_ENV_KEYS.map((key) => [key, process.env[key]] as const)
  for (const key of POLICY_ENV_KEYS) delete process.env[key]
  try {
    run()
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test("resolveGenerationTier: free and starter plans are standard tier", () => {
  assert.equal(resolveGenerationTier("Free"), "standard")
  assert.equal(resolveGenerationTier("starter"), "standard")
  assert.equal(resolveGenerationTier("Basic"), "standard")
})

test("resolveGenerationTier: pro and higher plans are pro tier", () => {
  assert.equal(resolveGenerationTier("Pro"), "pro")
  assert.equal(resolveGenerationTier("growth"), "pro")
  assert.equal(resolveGenerationTier("Team"), "pro")
  assert.equal(resolveGenerationTier("business"), "pro")
  assert.equal(resolveGenerationTier("Enterprise"), "pro")
  assert.equal(resolveGenerationTier("Internal  Dev"), "pro")
})

test("resolveGenerationTier: unknown or missing plans fail safe to standard", () => {
  assert.equal(resolveGenerationTier("mystery plan"), "standard")
  assert.equal(resolveGenerationTier(""), "standard")
  assert.equal(resolveGenerationTier(null), "standard")
  assert.equal(resolveGenerationTier(undefined), "standard")
})

test("resolveTierTextModel: maps tiers to the policy models", () => {
  withCleanPolicyEnv(() => {
    assert.equal(resolveTierTextModel("Starter"), STANDARD_TIER_TEXT_MODEL)
    assert.equal(resolveTierTextModel("Pro"), PRO_TIER_TEXT_MODEL)
  })
})

test("resolveTierTextModel: honors per-tier env overrides", () => {
  withCleanPolicyEnv(() => {
    process.env.OPENROUTER_STANDARD_TIER_MODEL = "vendor/cheap-model"
    process.env.OPENROUTER_PRO_TIER_MODEL = "vendor/fancy-model"
    assert.equal(resolveTierTextModel("Free"), "vendor/cheap-model")
    assert.equal(resolveTierTextModel("Pro"), "vendor/fancy-model")
  })
})

test("isTierModelRoutingEnabled: enabled by default, disabled by kill switch", () => {
  withCleanPolicyEnv(() => {
    assert.equal(isTierModelRoutingEnabled(), true)
    process.env.TIER_MODEL_ROUTING_DISABLED = "1"
    assert.equal(isTierModelRoutingEnabled(), false)
    process.env.TIER_MODEL_ROUTING_DISABLED = "true"
    assert.equal(isTierModelRoutingEnabled(), false)
    process.env.TIER_MODEL_ROUTING_DISABLED = "0"
    assert.equal(isTierModelRoutingEnabled(), true)
  })
})

test("getReasoningParams: high effort for tier models, empty otherwise", () => {
  withCleanPolicyEnv(() => {
    assert.deepEqual(getReasoningParams(STANDARD_TIER_TEXT_MODEL), {
      reasoning: { effort: "high" },
    })
    assert.deepEqual(getReasoningParams(PRO_TIER_TEXT_MODEL), {
      reasoning: { effort: "high" },
    })
    assert.deepEqual(getReasoningParams("anthropic/claude-sonnet-4-6"), {})
  })
})

test("getReasoningParams: follows env-overridden tier models", () => {
  withCleanPolicyEnv(() => {
    process.env.OPENROUTER_PRO_TIER_MODEL = "vendor/fancy-model"
    assert.deepEqual(getReasoningParams("vendor/fancy-model"), {
      reasoning: { effort: "high" },
    })
    // The replaced default is no longer a tier model.
    assert.deepEqual(getReasoningParams(PRO_TIER_TEXT_MODEL), {})
  })
})

test("withReasoningHeadroom: adds headroom for tier models only", () => {
  withCleanPolicyEnv(() => {
    assert.equal(
      withReasoningHeadroom(STANDARD_TIER_TEXT_MODEL, 4096),
      4096 + DEFAULT_REASONING_HEADROOM_TOKENS
    )
    assert.equal(withReasoningHeadroom(PRO_TIER_TEXT_MODEL, 8192, 2048), 8192 + 2048)
    assert.equal(withReasoningHeadroom("anthropic/claude-sonnet-4-6", 4096), 4096)
  })
})

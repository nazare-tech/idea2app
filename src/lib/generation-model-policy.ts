// src/lib/generation-model-policy.ts
// Single source of truth for plan-tier AI model routing (NAZ-123).
//
// Policy: Free/Starter tiers generate with Gemini 3 Flash at high thinking;
// Pro and higher tiers generate with GPT 5.6 Sol at high thinking. Every
// text-generation path (analysis documents, generate-all queue, project
// composer) resolves its model through this module so future tier or model
// changes stay one-file edits.
//
// Rollback: set TIER_MODEL_ROUTING_DISABLED=1 to revert every call site to
// its legacy fixed default without a deploy rollback. Either tier model can
// be hot-swapped via OPENROUTER_STANDARD_TIER_MODEL / OPENROUTER_PRO_TIER_MODEL.

export type GenerationTier = "standard" | "pro"

export const STANDARD_TIER_TEXT_MODEL = "google/gemini-3.5-flash"
export const PRO_TIER_TEXT_MODEL = "openai/gpt-5.6-sol"

/** Reasoning effort requested for both tier models ("high thinking"). */
export const TIER_REASONING_EFFORT = "high"

/**
 * Extra completion-token budget for tier models. OpenRouter counts reasoning
 * tokens against max_tokens for these providers, and the pipelines treat a
 * "length" finish reason as a failed generation, so routed calls need
 * headroom above their document-sized caps.
 */
export const DEFAULT_REASONING_HEADROOM_TOKENS = 8_192

/** Plans that receive the Pro-tier model. Everything else is standard. */
const PRO_TIER_PLAN_NAMES = new Set([
  "pro",
  "growth",
  "team",
  "business",
  "enterprise",
  "internal dev",
])

/** Kill switch: revert all call sites to their legacy fixed defaults. */
export function isTierModelRoutingEnabled(): boolean {
  const flag = (process.env.TIER_MODEL_ROUTING_DISABLED ?? "").trim().toLowerCase()
  return flag !== "1" && flag !== "true"
}

export function getStandardTierTextModel(): string {
  return process.env.OPENROUTER_STANDARD_TIER_MODEL?.trim() || STANDARD_TIER_TEXT_MODEL
}

export function getProTierTextModel(): string {
  return process.env.OPENROUTER_PRO_TIER_MODEL?.trim() || PRO_TIER_TEXT_MODEL
}

export function resolveGenerationTier(planName: string | null | undefined): GenerationTier {
  const normalized = (planName ?? "").trim().toLowerCase().replace(/\s+/g, " ")
  return PRO_TIER_PLAN_NAMES.has(normalized) ? "pro" : "standard"
}

/** Plan name -> tier text model. Unknown/missing plans fail safe to standard. */
export function resolveTierTextModel(planName: string | null | undefined): string {
  return resolveGenerationTier(planName) === "pro"
    ? getProTierTextModel()
    : getStandardTierTextModel()
}

function isTierReasoningModel(model: string): boolean {
  return model === getStandardTierTextModel() || model === getProTierTextModel()
}

/**
 * OpenRouter reasoning params for tier models, spreadable into a
 * chat.completions.create call. Empty for non-tier models (including env
 * override models whose reasoning support is unknown).
 */
export function getReasoningParams(model: string): Record<string, unknown> {
  if (!isTierReasoningModel(model)) return {}
  return { reasoning: { effort: TIER_REASONING_EFFORT } }
}

/**
 * Adds reasoning-token headroom to a completion cap when the model is a tier
 * reasoning model; returns the base cap unchanged otherwise.
 */
export function withReasoningHeadroom(
  model: string,
  baseMaxTokens: number,
  headroomTokens: number = DEFAULT_REASONING_HEADROOM_TOKENS
): number {
  if (!isTierReasoningModel(model)) return baseMaxTokens
  return baseMaxTokens + headroomTokens
}

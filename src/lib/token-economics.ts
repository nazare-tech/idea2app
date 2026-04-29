export type TokenBillableAction =
  | "competitive-analysis"
  | "gap-analysis"
  | "prd"
  | "mvp-plan"
  | "tech-spec"
  | "mockup"
  | "launch-plan"
  | "app-static"
  | "app-dynamic"
  | "app-spa"
  | "app-pwa"
  | "chat"
  | "document-edit"

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// Keep this configurable from one place.
// 20 = $0.20 per token.
export const TOKEN_VALUE_CENTS = toNumber(
  process.env.NEXT_PUBLIC_TOKEN_VALUE_CENTS || process.env.TOKEN_VALUE_CENTS,
  20
)

export const BASE_ACTION_TOKENS: Record<TokenBillableAction, number> = {
  "competitive-analysis": 15, // raised from 10 (+5 for complexity)
  "gap-analysis": 5,
  prd: 10,
  "mvp-plan": 10,
  "tech-spec": 10,
  mockup: 0,
  "launch-plan": 5,
  "app-static": 50,
  "app-dynamic": 100,
  "app-spa": 150,
  "app-pwa": 200,
  chat: 1,            // Math.ceil(1 × mult) → 1 (budget) or 2 (premium)
  "document-edit": 2, // flat cost, no multiplier applied
}

const DEFAULT_MODEL_MULTIPLIER = toNumber(
  process.env.NEXT_PUBLIC_TOKEN_MODEL_DEFAULT_MULTIPLIER || process.env.TOKEN_MODEL_DEFAULT_MULTIPLIER,
  1
)

const MODEL_MULTIPLIERS: Array<{ match: string; multiplier: number }> = [
  // More specific patterns MUST come before less specific ones
  // (Array.find returns the first match)
  { match: "gpt-5.4-mini", multiplier: 0.85 },  // GPT-5.4 Mini (Fastest)
  { match: "gpt-5-mini", multiplier: 0.85 },     // legacy alias
  { match: "gpt-5", multiplier: 1.5 },
  { match: "claude-opus", multiplier: 1.35 },
  { match: "gemini-3.1-pro", multiplier: 1.25 }, // Gemini 3.1 Pro Preview (Thinking)
  { match: "gemini-3", multiplier: 1.25 },
  { match: "claude-sonnet", multiplier: 1.15 },  // Claude Sonnet 4.6 (Efficient)
  { match: "claude-haiku", multiplier: 0.85 },   // Claude Haiku 4.5
  { match: "gpt-4", multiplier: 1.1 },
  { match: "gemini-2.5-flash", multiplier: 0.9 },
  { match: "kimi-k2", multiplier: 0.9 },         // Kimi K2.5
  { match: "qwen", multiplier: 0.8 },            // Qwen 3.5 Flash
  { match: "grok-4-1-fast", multiplier: 0.8 },
  { match: "deepseek", multiplier: 0.8 },
  { match: ":free", multiplier: 0.5 },
]

export function getModelTokenMultiplier(modelId?: string) {
  if (!modelId) return DEFAULT_MODEL_MULTIPLIER
  const normalized = modelId.toLowerCase()
  const match = MODEL_MULTIPLIERS.find((m) => normalized.includes(m.match))
  return match?.multiplier ?? DEFAULT_MODEL_MULTIPLIER
}

// Rounds up to the nearest multiple of 5 (ceiling)
function ceilTo5(x: number): number {
  return Math.ceil(x / 5) * 5
}

export function getTokenCost(action: TokenBillableAction, modelId?: string) {
  // fixed-cost actions: no model multiplier applied
  if (action === "document-edit" || action === "mockup") return BASE_ACTION_TOKENS[action]
  const base = BASE_ACTION_TOKENS[action]
  const multiplier = getModelTokenMultiplier(modelId)
  // chat: 1 or 2 per message depending on model tier
  if (action === "chat") return Math.max(1, Math.ceil(base * multiplier))
  // all other generations: round up to nearest 5
  return ceilTo5(base * multiplier)
}

export function estimateFullReportTokens(modelId?: string) {
  const actions: TokenBillableAction[] = [
    "competitive-analysis",
    "prd",
    "mvp-plan",
    "tech-spec",
  ]

  return actions.reduce((sum, action) => sum + getTokenCost(action, modelId), 0)
}

/** Maps Generate All document types to their billable action names */
export const GENERATE_ALL_ACTION_MAP: Record<string, TokenBillableAction> = {
  competitive: "competitive-analysis",
  prd: "prd",
  mvp: "mvp-plan",
  mockups: "mockup",
  launch: "launch-plan",
}

/** Calculate total credit cost for Generate All given per-doc model selections and skipped types */
export function estimateGenerateAllCost(
  modelSelections: Record<string, string>,
  skipTypes: Set<string> = new Set(),
): number {
  return Object.entries(GENERATE_ALL_ACTION_MAP).reduce((sum, [docType, action]) => {
    if (skipTypes.has(docType)) return sum
    return sum + getTokenCost(action, modelSelections[docType])
  }, 0)
}

export function tokensToUsdCents(tokens: number) {
  return Math.round(tokens * TOKEN_VALUE_CENTS)
}

export const PRICING_CARD_TOKENS = {
  free: 40,
  starter: 250,
  pro: 900,
}

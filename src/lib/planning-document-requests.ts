import {
  MVP_PLAN_SYSTEM_PROMPT,
  PRD_SYSTEM_PROMPT,
  buildMVPPlanUserPrompt,
  buildPRDUserPrompt,
} from "@/lib/prompts"

// Shared OpenRouter request settings for the two long-form planning documents.
// Production pipelines and the Dev Prompt Lab both build requests through the
// helpers below so their defaults can never drift apart.

export const PRODUCT_PLAN_DEFAULT_MODEL = "xiaomi/mimo-v2.5-pro"
export const PRODUCT_PLAN_MAX_TOKENS = 16_384
export const PRODUCT_PLAN_TEMPERATURE = 0.3

export const FIRST_VERSION_PLAN_DEFAULT_MODEL = "xiaomi/mimo-v2.5-pro"
// 16,384 truncated real First Version Plans mid-table (the build-sequence and
// validation tables are token-heavy), which stranded the derived AI Prompts
// files. Generation now fails loudly on truncation; this cap gives headroom.
export const FIRST_VERSION_PLAN_MAX_TOKENS = 24_576
export const FIRST_VERSION_PLAN_TEMPERATURE = 0.3

export interface PlanningPromptRequest {
  systemPrompt: string
  userPrompt: string
  model: string
  maxTokens: number
  temperature: number
}

export interface ProductPlanPromptRequestInput {
  idea: string
  name: string
  competitiveAnalysis?: string | null
  model?: string | null
}

export type ProductPlanPromptRequest = PlanningPromptRequest

export function buildProductPlanCompetitiveContext(competitiveAnalysis?: string | null) {
  return competitiveAnalysis
    ? `\n\nCompetitive and Gap analysis: ${competitiveAnalysis}`
    : ""
}

export function buildProductPlanPromptRequest({
  idea,
  name,
  competitiveAnalysis,
  model,
}: ProductPlanPromptRequestInput): ProductPlanPromptRequest {
  return {
    systemPrompt: PRD_SYSTEM_PROMPT,
    userPrompt: buildPRDUserPrompt(
      idea,
      name,
      buildProductPlanCompetitiveContext(competitiveAnalysis),
    ),
    model: model?.trim() || PRODUCT_PLAN_DEFAULT_MODEL,
    maxTokens: PRODUCT_PLAN_MAX_TOKENS,
    temperature: PRODUCT_PLAN_TEMPERATURE,
  }
}

export interface FirstVersionPlanPromptRequestInput {
  idea: string
  name: string
  prd?: string | null
  model?: string | null
}

export type FirstVersionPlanPromptRequest = PlanningPromptRequest

export function buildFirstVersionPlanPrdContext(prd?: string | null) {
  return prd ? `\nProduct Plan: ${prd}` : ""
}

export function buildFirstVersionPlanPromptRequest({
  idea,
  name,
  prd,
  model,
}: FirstVersionPlanPromptRequestInput): FirstVersionPlanPromptRequest {
  return {
    systemPrompt: MVP_PLAN_SYSTEM_PROMPT,
    userPrompt: buildMVPPlanUserPrompt(
      idea,
      name,
      buildFirstVersionPlanPrdContext(prd),
    ),
    model: model?.trim() || FIRST_VERSION_PLAN_DEFAULT_MODEL,
    maxTokens: FIRST_VERSION_PLAN_MAX_TOKENS,
    temperature: FIRST_VERSION_PLAN_TEMPERATURE,
  }
}

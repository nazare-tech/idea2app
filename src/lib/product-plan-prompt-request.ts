import { PRD_SYSTEM_PROMPT, buildPRDUserPrompt } from "@/lib/prompts"
import {
  PRODUCT_PLAN_DEFAULT_MODEL,
  PRODUCT_PLAN_MAX_TOKENS,
  PRODUCT_PLAN_TEMPERATURE,
} from "@/lib/product-plan-config"

export {
  PRODUCT_PLAN_DEFAULT_MODEL,
  PRODUCT_PLAN_MAX_TOKENS,
  PRODUCT_PLAN_TEMPERATURE,
}

export interface ProductPlanPromptRequestInput {
  idea: string
  name: string
  competitiveAnalysis?: string | null
  model?: string | null
}

export interface ProductPlanPromptRequest {
  systemPrompt: string
  userPrompt: string
  model: string
  maxTokens: number
  temperature: number
}

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

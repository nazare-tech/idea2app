import { MVP_PLAN_SYSTEM_PROMPT, buildMVPPlanUserPrompt } from "@/lib/prompts"
import {
  FIRST_VERSION_PLAN_DEFAULT_MODEL,
  FIRST_VERSION_PLAN_MAX_TOKENS,
  FIRST_VERSION_PLAN_TEMPERATURE,
} from "@/lib/first-version-plan-config"

export {
  FIRST_VERSION_PLAN_DEFAULT_MODEL,
  FIRST_VERSION_PLAN_MAX_TOKENS,
  FIRST_VERSION_PLAN_TEMPERATURE,
}

export interface FirstVersionPlanPromptRequestInput {
  idea: string
  name: string
  prd?: string | null
  model?: string | null
}

export interface FirstVersionPlanPromptRequest {
  systemPrompt: string
  userPrompt: string
  model: string
  maxTokens: number
  temperature: number
}

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

import OpenAI from "openai"
import { COMPETITOR_SEARCH_SYSTEM_PROMPT, buildCompetitorSearchUserPrompt } from "@/lib/prompts"
import { withRetry } from "@/lib/with-retry"
import { logWarn } from "@/lib/logger"
import {
  parseCompetitorSearchResponse,
  type CompetitorSearchResult,
} from "@/lib/competitor-research"

// Perplexity uses an OpenAI-compatible interface with a different base URL
const perplexity = new OpenAI({
  baseURL: "https://api.perplexity.ai",
  apiKey: process.env.PERPLEXITY_API_KEY || "",
})

export type PerplexityCompetitorResult = CompetitorSearchResult

export function parsePerplexityCompetitorResponse(
  rawResponse: string
): PerplexityCompetitorResult {
  const result = parseCompetitorSearchResponse(rawResponse)
  if (result.parseFailed) {
    logWarn("Perplexity", "competitor_json_invalid", {
      rawResponseLength: rawResponse.length,
    })
  }

  return result
}

export async function searchCompetitors(
  idea: string,
  name: string
): Promise<PerplexityCompetitorResult> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured")
  }

  const response = await withRetry(
    () =>
      perplexity.chat.completions.create({
        model: "sonar-pro",
        messages: [
          { role: "system", content: COMPETITOR_SEARCH_SYSTEM_PROMPT },
          { role: "user", content: buildCompetitorSearchUserPrompt(idea, name) },
        ],
        max_tokens: 2048,
        temperature: 0.2,
      }),
    { label: "Perplexity competitor search" }
  )

  const rawResponse = response.choices[0]?.message?.content || ""

  return parsePerplexityCompetitorResponse(rawResponse)
}

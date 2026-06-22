import OpenAI from "openai"
import { COMPETITOR_SEARCH_SYSTEM_PROMPT, buildCompetitorSearchUserPrompt } from "@/lib/prompts"
import { withRetry } from "@/lib/with-retry"
import { logWarn } from "@/lib/logger"

// Perplexity uses an OpenAI-compatible interface with a different base URL
const perplexity = new OpenAI({
  baseURL: "https://api.perplexity.ai",
  apiKey: process.env.PERPLEXITY_API_KEY || "",
})

export interface PerplexityCompetitorResult {
  competitors: Array<{
    name: string
    description: string
    whyCompetes: string
    url: string
  }>
  rawResponse: string
  parseFailed?: boolean
}

export function parsePerplexityCompetitorResponse(
  rawResponse: string
): PerplexityCompetitorResult {
  try {
    // Extract JSON from response (Perplexity may wrap it in markdown code blocks)
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      if (rawResponse.trim().length > 0) {
        logWarn("Perplexity", "competitor_json_missing", {
          rawResponseLength: rawResponse.length,
        })
        return { competitors: [], rawResponse, parseFailed: true }
      }

      return { competitors: [], rawResponse }
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed || !Array.isArray(parsed.competitors)) {
      logWarn("Perplexity", "competitor_json_shape_invalid", {
        rawResponseLength: rawResponse.length,
      })
      return { competitors: [], rawResponse, parseFailed: true }
    }

    return {
      competitors: parsed.competitors
        .filter((competitor: unknown) => competitor && typeof competitor === "object")
        .map((competitor: Record<string, unknown>) => ({
          name: String(competitor.name || ""),
          description: String(competitor.description || ""),
          whyCompetes: String(competitor.whyCompetes || ""),
          url: String(competitor.url || ""),
        })),
      rawResponse,
    }
  } catch {
    // If JSON parsing fails, return empty competitors but preserve raw response.
    logWarn("Perplexity", "competitor_json_parse_failed", {
      rawResponseLength: rawResponse.length,
    })
    return { competitors: [], rawResponse, parseFailed: true }
  }
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

import type OpenAI from "openai"

import {
  type CompetitorEvidencePage,
  type CompetitorSearchResult,
  parseCompetitorSearchResponse,
} from "@/lib/competitor-research"
import { getStandardTierTextModel } from "@/lib/generation-model-policy"
import { getSafeExternalHttpUrl } from "@/lib/competitor-mention-links"
import { getOpenRouterClient, isOpenRouterConfigured } from "@/lib/openrouter"
import {
  EXA_COMPETITOR_SEARCH_SYSTEM_PROMPT,
  buildExaCompetitorSearchUserPrompt,
} from "@/lib/prompts"
import { withRetry } from "@/lib/with-retry"

const OPENROUTER_EXA_TIMEOUT_MS = 120_000
const OPENROUTER_EXA_MAX_RESULTS = 7
const OPENROUTER_EXA_MAX_CHARACTERS = 2_000
const MAX_CITATIONS = 10
const MAX_CITATION_TITLE_LENGTH = 300
const MAX_CITATION_CONTENT_LENGTH = 3_000

interface OpenRouterExaTool {
  type: "openrouter:web_search"
  parameters: {
    engine: "exa"
    max_results: number
    max_total_results: number
    max_characters: number
  }
}

export interface OpenRouterExaCompetitorRequest {
  model: string
  messages: Array<{ role: "system" | "user"; content: string }>
  max_tokens: number
  temperature: number
  tools: OpenRouterExaTool[]
}

interface CompletionCitation {
  type?: unknown
  url_citation?: unknown
}

export interface OpenRouterExaCompletion {
  model?: string
  choices?: Array<{
    message?: {
      content?: string | null
      annotations?: CompletionCitation[]
    }
  }>
}

export interface OpenRouterCompetitorResearchResult
  extends CompetitorSearchResult {
  citations: CompetitorEvidencePage[]
  evidenceResults: CompetitorEvidencePage[]
  modelUsed: string
}

interface OpenRouterCompetitorResearchDependencies {
  createCompletion?: (
    request: OpenRouterExaCompetitorRequest,
    signal: AbortSignal
  ) => Promise<OpenRouterExaCompletion>
  model?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function boundedText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function extractCitations(
  annotations: CompletionCitation[] | undefined
): CompetitorEvidencePage[] {
  if (!Array.isArray(annotations)) return []

  const citations: CompetitorEvidencePage[] = []
  const seenUrls = new Set<string>()

  for (const annotation of annotations) {
    if (
      annotation?.type !== "url_citation" ||
      !isRecord(annotation.url_citation)
    ) {
      continue
    }

    const url = getSafeExternalHttpUrl(annotation.url_citation.url)
    if (!url || seenUrls.has(url)) continue

    seenUrls.add(url)
    citations.push({
      url,
      title: boundedText(
        annotation.url_citation.title,
        MAX_CITATION_TITLE_LENGTH
      ),
      content: boundedText(
        annotation.url_citation.content,
        MAX_CITATION_CONTENT_LENGTH
      ),
    })
    if (citations.length >= MAX_CITATIONS) break
  }

  return citations
}

export function getOpenRouterCompetitorResearchModel() {
  return (
    process.env.OPENROUTER_COMPETITOR_RESEARCH_MODEL?.trim() ||
    getStandardTierTextModel()
  )
}

export function buildOpenRouterExaCompetitorRequest(
  idea: string,
  name: string,
  model = getOpenRouterCompetitorResearchModel()
): OpenRouterExaCompetitorRequest {
  return {
    model,
    messages: [
      { role: "system", content: EXA_COMPETITOR_SEARCH_SYSTEM_PROMPT },
      {
        role: "user",
        content: `You must call the web search tool before answering.\n\n${buildExaCompetitorSearchUserPrompt(
          idea,
          name
        )}`,
      },
    ],
    max_tokens: 2_048,
    temperature: 0.1,
    tools: [
      {
        type: "openrouter:web_search",
        parameters: {
          engine: "exa",
          max_results: OPENROUTER_EXA_MAX_RESULTS,
          max_total_results: OPENROUTER_EXA_MAX_RESULTS,
          max_characters: OPENROUTER_EXA_MAX_CHARACTERS,
        },
      },
    ],
  }
}

export function parseOpenRouterExaCompletion(
  completion: OpenRouterExaCompletion,
  requestedModel = getOpenRouterCompetitorResearchModel()
): OpenRouterCompetitorResearchResult {
  const message = completion.choices?.[0]?.message
  const rawResponse = message?.content ?? ""
  const parsed = parseCompetitorSearchResponse(rawResponse)
  const citations = extractCitations(message?.annotations)

  return {
    ...parsed,
    competitors: parsed.competitors.slice(0, OPENROUTER_EXA_MAX_RESULTS),
    citations,
    evidenceResults: citations,
    modelUsed: completion.model || requestedModel,
  }
}

async function createOpenRouterCompletion(
  request: OpenRouterExaCompetitorRequest,
  signal: AbortSignal
) {
  const openrouter = getOpenRouterClient()
  return openrouter.chat.completions.create(
    request as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    { signal }
  )
}

export async function searchCompetitorsWithOpenRouterExa(
  idea: string,
  name: string,
  dependencies: OpenRouterCompetitorResearchDependencies = {}
): Promise<OpenRouterCompetitorResearchResult> {
  if (!dependencies.createCompletion && !isOpenRouterConfigured()) {
    throw new Error("OpenRouter API key not configured")
  }

  const model = dependencies.model || getOpenRouterCompetitorResearchModel()
  const request = buildOpenRouterExaCompetitorRequest(idea, name, model)
  const signal = AbortSignal.timeout(OPENROUTER_EXA_TIMEOUT_MS)
  const completion = await withRetry(
    () =>
      (dependencies.createCompletion ?? createOpenRouterCompletion)(
        request,
        signal
      ),
    { label: "OpenRouter Exa competitor search" }
  )

  return parseOpenRouterExaCompletion(completion, model)
}

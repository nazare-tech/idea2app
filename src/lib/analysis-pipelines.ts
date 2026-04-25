import OpenAI from "openai"
import { searchCompetitors } from "./perplexity"
import { extractCompetitorInfo, type TavilyExtractResult } from "./tavily"
import { COMPETITIVE_ANALYSIS_SYSTEM_PROMPT, buildCompetitiveAnalysisUserPrompt, PRD_SYSTEM_PROMPT, buildPRDUserPrompt, MVP_PLAN_SYSTEM_PROMPT, buildMVPPlanUserPrompt, TECH_SPEC_SYSTEM_PROMPT, buildTechSpecUserPrompt } from "@/lib/prompts"

// Re-use the same OpenRouter client pattern from openrouter.ts
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

const DEFAULT_MODEL =
  process.env.OPENROUTER_ANALYSIS_MODEL || "anthropic/claude-sonnet-4-6"
const MAX_DOWNSTREAM_CONTEXT_CHARS = 6_000
const DOWNSTREAM_DOCUMENT_MAX_TOKENS = 4_096

// ─── Type Definitions ────────────────────────────────────────────────

export interface AnalysisResult {
  content: string
  source: "inhouse"
  model: string
}

export interface CompetitiveAnalysisInput {
  idea: string
  name: string
  model?: string
}

export interface PRDInput {
  idea: string
  name: string
  competitiveAnalysis?: string
  model?: string
}

export interface MVPPlanInput {
  idea: string
  name: string
  prd?: string
  model?: string
}

export interface TechSpecInput {
  idea: string
  name: string
  prd?: string
  model?: string
}

export interface StreamCallbacks {
  onStage?: (message: string, step: number, totalSteps: number) => void
  onToken?: (content: string) => void
}

function trimDownstreamContext(content: string, label: string) {
  const normalized = content.trim()
  if (normalized.length <= MAX_DOWNSTREAM_CONTEXT_CHARS) return normalized

  return [
    normalized.slice(0, MAX_DOWNSTREAM_CONTEXT_CHARS),
    "",
    `[${label} truncated to first ${MAX_DOWNSTREAM_CONTEXT_CHARS} characters for downstream generation.]`,
  ].join("\n")
}

// ─── Streaming Helper ────────────────────────────────────────────────

async function consumeStream(
  apiResponse: import("openai/streaming").Stream<import("openai/resources/chat/completions").ChatCompletionChunk> | import("openai/resources/chat/completions").ChatCompletion,
  onToken?: (token: string) => void
): Promise<string> {
  if (onToken && Symbol.asyncIterator in apiResponse) {
    let content = ""
    try {
      for await (const chunk of apiResponse as import("openai/streaming").Stream<import("openai/resources/chat/completions").ChatCompletionChunk>) {
        const token = chunk.choices?.[0]?.delta?.content ?? ""
        if (token) {
          content += token
          onToken(token)
        }
      }
    } catch (err) {
      throw new Error(
        `Stream interrupted: ${err instanceof Error ? err.message : String(err)}`
      )
    }
    return content
  } else {
    const resp = apiResponse as import("openai/resources/chat/completions").ChatCompletion
    return resp.choices[0]?.message?.content ?? ""
  }
}

// ─── Competitive Analysis Pipeline ──────────────────────────────────

export async function runCompetitiveAnalysis(
  input: CompetitiveAnalysisInput,
  callbacks?: StreamCallbacks
): Promise<AnalysisResult> {
  const model = input.model || DEFAULT_MODEL
  callbacks?.onStage?.("Identifying top competitors...", 1, 4)

  let perplexityData: {
    competitors: Array<{
      name: string
      description: string
      whyCompetes: string
      url: string
    }>
    rawResponse: string
  } = { competitors: [], rawResponse: "" }

  let tavilyData: {
    results: TavilyExtractResult[]
    failed_results: Array<{ url: string; error: string }>
  } = { results: [], failed_results: [] }

  // Step 1: Perplexity — find competitors with strategic reasoning
  try {
    console.log(
      "[CompetitiveAnalysis] Step 1: Searching competitors with Perplexity"
    )
    perplexityData = await searchCompetitors(input.idea, input.name)
    console.log(
      `[CompetitiveAnalysis] Found ${perplexityData.competitors.length} competitors`
    )
  } catch (err) {
    // Non-fatal: if Perplexity fails, synthesize from idea alone
    console.warn(
      "[CompetitiveAnalysis] Perplexity step failed, continuing without:",
      err
    )
  }
  callbacks?.onStage?.("Extracting competitor details...", 2, 4)

  // Step 2: Tavily — extract factual info from competitor URLs
  if (perplexityData.competitors.length > 0) {
    try {
      console.log(
        "[CompetitiveAnalysis] Step 2: Extracting URL content with Tavily"
      )
      const urls = perplexityData.competitors.map((c) => c.url).filter(Boolean)
      tavilyData = await extractCompetitorInfo(urls)
      console.log(
        `[CompetitiveAnalysis] Extracted ${tavilyData.results.length} URLs`
      )
    } catch (err) {
      console.warn(
        "[CompetitiveAnalysis] Tavily step failed, continuing without:",
        err
      )
    }
  }
  callbacks?.onStage?.("Writing competitive analysis...", 3, 4)

  // Step 3: Build context from gathered data
  const competitorContext = buildCompetitorContext(
    perplexityData.competitors,
    tavilyData.results
  )

  // Step 4: OpenRouter synthesis — produce the final report
  console.log("[CompetitiveAnalysis] Step 3: Synthesizing with OpenRouter")

  const completion = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: COMPETITIVE_ANALYSIS_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildCompetitiveAnalysisUserPrompt(
          input.idea,
          input.name,
          competitorContext
        ),
      },
    ],
    max_tokens: 8192,
    temperature: 0.3,
    stream: callbacks?.onToken ? true : false,
  }, { signal: AbortSignal.timeout(120_000) })

  const content = await consumeStream(completion, callbacks?.onToken)

  if (!content) throw new Error("No content returned from OpenRouter synthesis")
  callbacks?.onStage?.("Finalizing analysis...", 4, 4)

  return { content, source: "inhouse", model }
}

// ─── PRD Pipeline ────────────────────────────────────────────────────

export async function runPRD(input: PRDInput, callbacks?: StreamCallbacks): Promise<AnalysisResult> {
  const model = input.model || DEFAULT_MODEL

  const competitiveContext = input.competitiveAnalysis
    ? `\n\nCompetitive and Gap analysis: ${trimDownstreamContext(input.competitiveAnalysis, "Competitive analysis")}`
    : ""

  callbacks?.onStage?.("Writing product requirements...", 1, 2)
  const completion = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: PRD_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildPRDUserPrompt(input.idea, input.name, competitiveContext),
      },
    ],
    max_tokens: DOWNSTREAM_DOCUMENT_MAX_TOKENS,
    temperature: 0.3,
    stream: callbacks?.onToken ? true : false,
  }, { signal: AbortSignal.timeout(120_000) })

  const content = await consumeStream(completion, callbacks?.onToken)

  if (!content) throw new Error("No content returned from OpenRouter for PRD")
  callbacks?.onStage?.("Finalizing PRD...", 2, 2)

  return { content, source: "inhouse", model }
}

// ─── MVP Plan Pipeline ───────────────────────────────────────────────

export async function runMVPPlan(
  input: MVPPlanInput,
  callbacks?: StreamCallbacks
): Promise<AnalysisResult> {
  const model = input.model || DEFAULT_MODEL

  const prdContext = input.prd ? `\nPRD: ${trimDownstreamContext(input.prd, "PRD")}` : ""

  callbacks?.onStage?.("Writing MVP roadmap...", 1, 2)
  const completion = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: MVP_PLAN_SYSTEM_PROMPT },
      { role: "user", content: buildMVPPlanUserPrompt(input.idea, input.name, prdContext) },
    ],
    max_tokens: DOWNSTREAM_DOCUMENT_MAX_TOKENS,
    temperature: 0.3,
    stream: callbacks?.onToken ? true : false,
  }, { signal: AbortSignal.timeout(120_000) })

  const content = await consumeStream(completion, callbacks?.onToken)

  if (!content) throw new Error("No content returned from OpenRouter for MVP Plan")
  callbacks?.onStage?.("Finalizing MVP plan...", 2, 2)

  return { content, source: "inhouse", model }
}

// ─── Tech Spec Pipeline ─────────────────────────────────────────────

export async function runTechSpec(
  input: TechSpecInput,
  callbacks?: StreamCallbacks
): Promise<AnalysisResult> {
  const model = input.model || DEFAULT_MODEL

  callbacks?.onStage?.("Writing technical specifications...", 1, 2)
  const completion = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: TECH_SPEC_SYSTEM_PROMPT },
      { role: "user", content: buildTechSpecUserPrompt(input.idea, input.name, input.prd) },
    ],
    max_tokens: 8192,
    temperature: 0.3,
    stream: callbacks?.onToken ? true : false,
  }, { signal: AbortSignal.timeout(120_000) })

  const content = await consumeStream(completion, callbacks?.onToken)

  if (!content) throw new Error("No content returned from OpenRouter for Tech Spec")
  callbacks?.onStage?.("Finalizing tech spec...", 2, 2)

  return { content, source: "inhouse", model }
}

// ─── Private Helpers ────────────────────────────────────────────────

function buildCompetitorContext(
  competitors: Array<{
    name: string
    description: string
    whyCompetes: string
    url: string
  }>,
  tavilyResults: TavilyExtractResult[]
): string {
  if (competitors.length === 0)
    return "No competitor data gathered from external search."

  const tavilyMap = new Map(tavilyResults.map((r) => [r.url, r]))

  return competitors
    .map((comp) => {
      const urlData = tavilyMap.get(comp.url)
      const urlContent = urlData
        ? `\nURL Content (from ${comp.url}):\n${urlData.content.substring(0, 1500)}`
        : `\nURL: ${comp.url} (content extraction not available)`

      return `## ${comp.name}
Description: ${comp.description}
Why they compete: ${comp.whyCompetes}${urlContent}`
    })
    .join("\n\n---\n\n")
}

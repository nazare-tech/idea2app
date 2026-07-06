import { getOpenRouterClient } from "@/lib/openrouter"
import { searchCompetitors, type PerplexityCompetitorResult } from "./perplexity"
import { extractCompetitorInfo, type TavilyExtractResult } from "./tavily"
import { COMPETITIVE_ANALYSIS_SYSTEM_PROMPT, buildCompetitiveAnalysisUserPrompt, LAUNCH_PLAN_SYSTEM_PROMPT, buildLaunchPlanUserPrompt, TECH_SPEC_SYSTEM_PROMPT, buildTechSpecUserPrompt, type LaunchPlanBrief } from "@/lib/prompts"
import {
  buildOpenRouterTimeoutMessage,
  createOpenRouterLongTextSignal,
  isOpenRouterAbortError,
  OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS,
} from "@/lib/openrouter-timeout"
import {
  buildFirstVersionPlanPromptRequest,
  buildProductPlanPromptRequest,
} from "@/lib/planning-document-requests"
import { logError, logInfo, logWarn } from "@/lib/logger"
import type { Json } from "@/types/database"

const openrouter = getOpenRouterClient()

const DEFAULT_MODEL =
  process.env.OPENROUTER_ANALYSIS_MODEL || "anthropic/claude-sonnet-4-6"
const LAUNCH_PLAN_MAX_TOKENS = 4_096

// ─── Type Definitions ────────────────────────────────────────────────

export interface AnalysisResult {
  content: string
  source: "inhouse"
  model: string
  metadata?: { [key: string]: Json | undefined }
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

export interface LaunchPlanInput {
  idea: string
  name: string
  brief: LaunchPlanBrief
  model?: string
}

export interface StreamCallbacks {
  onStage?: (message: string, step: number, totalSteps: number) => void
  onToken?: (content: string) => void
}

type CompetitorSearchStatus =
  | "found"
  | "unusable"
  | "empty"
  | "parse_failed"
  | "not_configured"
  | "failed"

type TavilyExtractStatus =
  | "not_attempted"
  | "succeeded"
  | "empty"
  | "not_configured"
  | "failed"

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

function rethrowOpenRouterTimeout(error: unknown, label: string, timeoutMs?: number): never {
  if (isOpenRouterAbortError(error)) {
    throw new Error(buildOpenRouterTimeoutMessage(label, timeoutMs))
  }

  throw error
}

// ─── Competitive Analysis Pipeline ──────────────────────────────────

export async function runCompetitiveAnalysis(
  input: CompetitiveAnalysisInput,
  callbacks?: StreamCallbacks
): Promise<AnalysisResult> {
  const model = input.model || DEFAULT_MODEL
  callbacks?.onStage?.("Identifying top competitors...", 1, 4)

  let perplexityData: PerplexityCompetitorResult = {
    competitors: [],
    rawResponse: "",
  }

  let tavilyData: {
    results: TavilyExtractResult[]
    failed_results: Array<{ url: string; error: string }>
  } = { results: [], failed_results: [] }
  let competitorSearchStatus: CompetitorSearchStatus = "empty"
  let tavilyExtractStatus: TavilyExtractStatus = "not_attempted"

  // Step 1: Perplexity — find competitors with strategic reasoning
  try {
    logInfo("CompetitiveAnalysis", "perplexity_search_started", { model })
    perplexityData = await searchCompetitors(input.idea, input.name)
    competitorSearchStatus = getCompetitorSearchStatus(perplexityData)
    logInfo("CompetitiveAnalysis", "perplexity_search_succeeded", {
      model,
      competitorCount: perplexityData.competitors.length,
      parseFailed: Boolean(perplexityData.parseFailed),
    })
  } catch (err) {
    // Non-fatal: if Perplexity fails, synthesize from idea alone
    competitorSearchStatus = isMissingProviderConfigError(err)
      ? "not_configured"
      : "failed"
    logWarn("CompetitiveAnalysis", "perplexity_search_failed_nonfatal", { model }, err)
  }
  callbacks?.onStage?.("Extracting competitor details...", 2, 4)

  // Step 2: Tavily — extract factual info from competitor URLs
  const usableCompetitors = getUsableCompetitors(perplexityData.competitors)
  if (competitorSearchStatus === "found" && usableCompetitors.length === 0) {
    competitorSearchStatus = "unusable"
  }
  if (usableCompetitors.length > 0) {
    try {
      const urls = usableCompetitors.map((c) => c.url)
      logInfo("CompetitiveAnalysis", "tavily_extract_started", {
        model,
        urlCount: urls.length,
      })
      tavilyData = await extractCompetitorInfo(urls)
      tavilyExtractStatus =
        tavilyData.results.length > 0 || tavilyData.failed_results.length > 0
          ? "succeeded"
          : "empty"
      logInfo("CompetitiveAnalysis", "tavily_extract_succeeded", {
        model,
        resultCount: tavilyData.results.length,
        failedResultCount: tavilyData.failed_results.length,
      })
    } catch (err) {
      tavilyExtractStatus = isMissingProviderConfigError(err)
        ? "not_configured"
        : "failed"
      logWarn("CompetitiveAnalysis", "tavily_extract_failed_nonfatal", { model }, err)
    }
  }
  callbacks?.onStage?.("Writing competitive analysis...", 3, 4)

  // Step 3: Build context from gathered data
  const competitorContext = buildCompetitorContext(
    perplexityData.competitors,
    tavilyData.results
  )

  // Step 4: OpenRouter synthesis — produce the final report
  logInfo("CompetitiveAnalysis", "openrouter_synthesis_started", { model })

  let completion: Awaited<ReturnType<typeof openrouter.chat.completions.create>>
  try {
    completion = await openrouter.chat.completions.create({
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
    }, { signal: createOpenRouterLongTextSignal() })
  } catch (error) {
    logError("CompetitiveAnalysis", "openrouter_synthesis_failed", error, { model })
    rethrowOpenRouterTimeout(error, "Market Research")
  }

  const content = await consumeStream(completion, callbacks?.onToken)

  if (!content) throw new Error("No content returned from OpenRouter synthesis")
  logInfo("CompetitiveAnalysis", "openrouter_synthesis_succeeded", {
    model,
    contentLength: content.length,
    competitorSearchStatus,
    usableCompetitorCount: usableCompetitors.length,
    tavilyExtractStatus,
  })
  callbacks?.onStage?.("Finalizing analysis...", 4, 4)

  return {
    content,
    source: "inhouse",
    model,
    metadata: {
      live_research: {
        competitor_search_status: competitorSearchStatus,
        competitor_count: perplexityData.competitors.length,
        usable_competitor_count: usableCompetitors.length,
        competitor_context_available: competitorContext.trim().length > 0,
        tavily_extract_status: tavilyExtractStatus,
        tavily_result_count: tavilyData.results.length,
        tavily_failed_result_count: tavilyData.failed_results.length,
      },
    },
  }
}

// ─── Product Plan Pipeline ───────────────────────────────────────────

export async function runPRD(input: PRDInput, callbacks?: StreamCallbacks): Promise<AnalysisResult> {
  const request = buildProductPlanPromptRequest(input)

  callbacks?.onStage?.("Writing product plan...", 1, 2)
  let completion: Awaited<ReturnType<typeof openrouter.chat.completions.create>>
  try {
    logInfo("ProductPlan", "openrouter_generation_started", {
      model: request.model,
      hasCompetitiveAnalysis: Boolean(input.competitiveAnalysis),
    })
    completion = await openrouter.chat.completions.create({
      model: request.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: callbacks?.onToken ? true : false,
    }, { signal: createOpenRouterLongTextSignal(OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS) })
  } catch (error) {
    logError("ProductPlan", "openrouter_generation_failed", error, { model: request.model })
    rethrowOpenRouterTimeout(error, "Product Plan", OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS)
  }

  const content = await consumeStream(completion, callbacks?.onToken)

  if (!content) throw new Error("No content returned from OpenRouter for Product Plan")
  logInfo("ProductPlan", "openrouter_generation_succeeded", {
    model: request.model,
    contentLength: content.length,
  })
  callbacks?.onStage?.("Finalizing product plan...", 2, 2)

  return { content, source: "inhouse", model: request.model }
}

// ─── First Version Plan Pipeline ─────────────────────────────────────

export async function runMVPPlan(
  input: MVPPlanInput,
  callbacks?: StreamCallbacks
): Promise<AnalysisResult> {
  const request = buildFirstVersionPlanPromptRequest(input)

  callbacks?.onStage?.("Writing first-version plan...", 1, 2)
  let completion: Awaited<ReturnType<typeof openrouter.chat.completions.create>>
  try {
    logInfo("MVPPlan", "openrouter_generation_started", {
      model: request.model,
      hasProductPlan: Boolean(input.prd),
    })
    completion = await openrouter.chat.completions.create({
      model: request.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: callbacks?.onToken ? true : false,
    }, { signal: createOpenRouterLongTextSignal(OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS) })
  } catch (error) {
    logError("MVPPlan", "openrouter_generation_failed", error, { model: request.model })
    rethrowOpenRouterTimeout(error, "First Version Plan", OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS)
  }

  const content = await consumeStream(completion, callbacks?.onToken)

  if (!content) throw new Error("No content returned from OpenRouter for First Version Plan")
  logInfo("MVPPlan", "openrouter_generation_succeeded", {
    model: request.model,
    contentLength: content.length,
  })
  callbacks?.onStage?.("Finalizing first-version plan...", 2, 2)

  return { content, source: "inhouse", model: request.model }
}

// ─── Tech Spec Pipeline ─────────────────────────────────────────────

export async function runTechSpec(
  input: TechSpecInput,
  callbacks?: StreamCallbacks
): Promise<AnalysisResult> {
  const model = input.model || DEFAULT_MODEL

  callbacks?.onStage?.("Writing technical specifications...", 1, 2)
  let completion: Awaited<ReturnType<typeof openrouter.chat.completions.create>>
  try {
    logInfo("TechSpec", "openrouter_generation_started", {
      model,
      hasProductPlan: Boolean(input.prd),
    })
    completion = await openrouter.chat.completions.create({
      model,
      messages: [
        { role: "system", content: TECH_SPEC_SYSTEM_PROMPT },
        { role: "user", content: buildTechSpecUserPrompt(input.idea, input.name, input.prd) },
      ],
      max_tokens: 8192,
      temperature: 0.3,
      stream: callbacks?.onToken ? true : false,
    }, { signal: createOpenRouterLongTextSignal() })
  } catch (error) {
    logError("TechSpec", "openrouter_generation_failed", error, { model })
    rethrowOpenRouterTimeout(error, "Technical Specifications")
  }

  const content = await consumeStream(completion, callbacks?.onToken)

  if (!content) throw new Error("No content returned from OpenRouter for Tech Spec")
  logInfo("TechSpec", "openrouter_generation_succeeded", {
    model,
    contentLength: content.length,
  })
  callbacks?.onStage?.("Finalizing tech spec...", 2, 2)

  return { content, source: "inhouse", model }
}

// ─── Launch Plan Pipeline ───────────────────────────────────────────────────

export async function runLaunchPlan(
  input: LaunchPlanInput,
  callbacks?: StreamCallbacks
): Promise<AnalysisResult> {
  const model = input.model || process.env.OPENROUTER_LAUNCH_PLAN_MODEL || "openai/gpt-5.4-mini"

  callbacks?.onStage?.("Writing launch plan...", 1, 2)
  let completion: Awaited<ReturnType<typeof openrouter.chat.completions.create>>
  try {
    logInfo("LaunchPlan", "openrouter_generation_started", { model })
    completion = await openrouter.chat.completions.create({
      model,
      messages: [
        { role: "system", content: LAUNCH_PLAN_SYSTEM_PROMPT },
        { role: "user", content: buildLaunchPlanUserPrompt(input.idea, input.name, input.brief) },
      ],
      max_tokens: LAUNCH_PLAN_MAX_TOKENS,
      temperature: 0.35,
      stream: callbacks?.onToken ? true : false,
    }, { signal: createOpenRouterLongTextSignal() })
  } catch (error) {
    logError("LaunchPlan", "openrouter_generation_failed", error, { model })
    rethrowOpenRouterTimeout(error, "Launch Plan")
  }

  const content = await consumeStream(completion, callbacks?.onToken)

  if (!content) throw new Error("No content returned from OpenRouter for Launch Plan")
  logInfo("LaunchPlan", "openrouter_generation_succeeded", {
    model,
    contentLength: content.length,
  })
  callbacks?.onStage?.("Finalizing launch plan...", 2, 2)

  return { content, source: "inhouse", model }
}

// ─── Private Helpers ────────────────────────────────────────────────

function isMissingProviderConfigError(error: unknown) {
  return error instanceof Error && /API key not configured/i.test(error.message)
}

function getUsableCompetitors(
  competitors: Array<{
    name: string
    description: string
    whyCompetes: string
    url: string
  }>
) {
  return competitors.filter(
    (competitor) =>
      competitor.name?.trim() &&
      competitor.url?.trim().startsWith("http")
  )
}

export function getCompetitorSearchStatus(
  perplexityData: PerplexityCompetitorResult
): CompetitorSearchStatus {
  if (perplexityData.parseFailed) return "parse_failed"
  if (perplexityData.competitors.length === 0) return "empty"
  return getUsableCompetitors(perplexityData.competitors).length > 0
    ? "found"
    : "unusable"
}

export function buildCompetitorContext(
  competitors: Array<{
    name: string
    description: string
    whyCompetes: string
    url: string
  }>,
  tavilyResults: TavilyExtractResult[]
): string {
  const usableCompetitors = getUsableCompetitors(competitors)
  if (usableCompetitors.length === 0) return ""

  const tavilyMap = new Map(tavilyResults.map((r) => [r.url, r]))

  return usableCompetitors
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

import { getOpenRouterClient } from "@/lib/openrouter"
import { searchCompetitors, type PerplexityCompetitorResult } from "./perplexity"
import { extractCompetitorInfo, type TavilyExtractResult } from "./tavily"
import {
  getCompetitorSearchStatus as getProviderCompetitorSearchStatus,
  getUsableCompetitors,
  type CompetitorCandidate,
  type CompetitorEvidencePage,
  type CompetitorSearchStatus,
} from "@/lib/competitor-research"
import {
  getOpenRouterCompetitorResearchModel,
  searchCompetitorsWithOpenRouterExa,
  type OpenRouterCompetitorResearchResult,
} from "@/lib/openrouter-competitor-research"
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
import { getReasoningParams, withReasoningHeadroom } from "@/lib/generation-model-policy"
import {
  getSafeExternalHttpUrl,
  normalizeCompetitorSources,
} from "@/lib/competitor-mention-links"
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
  /**
   * Competitive analysis only: fired once live research resolves (before
   * synthesis starts streaming) with the same competitor source pairs that
   * will be saved to analyses.metadata.live_research.competitor_sources, so
   * the streaming UI can link competitor mentions from the first token.
   */
  onCompetitorSources?: (sources: { name: string; url: string }[]) => void
}

type TavilyExtractStatus =
  | "not_attempted"
  | "succeeded"
  | "partial"
  | "empty"
  | "not_configured"
  | "failed"

type OpenRouterExaSearchStatus =
  | "disabled"
  | "found"
  | "unusable"
  | "empty"
  | "parse_failed"
  | "no_citations"
  | "not_configured"
  | "failed"

type CompetitorResearchProvider =
  | "openrouter_exa"
  | "perplexity"
  | "perplexity_tavily"
  | "none"

type CompetitorResearchFallbackReason =
  | "openrouter_disabled"
  | "openrouter_error"
  | "openrouter_not_configured"
  | "openrouter_empty"
  | "openrouter_parse_failed"
  | "openrouter_unusable"
  | "openrouter_no_citations"

interface CompetitorResearchDependencies {
  openrouterExaDisabled?: boolean
  searchOpenRouterExa?: typeof searchCompetitorsWithOpenRouterExa
  searchPerplexity?: typeof searchCompetitors
  extractTavily?: typeof extractCompetitorInfo
  onEvidenceStage?: () => void
}

interface CompetitorResearchBundle {
  competitors: CompetitorCandidate[]
  evidenceResults: CompetitorEvidencePage[]
  providerUsed: CompetitorResearchProvider
  openrouterExaStatus: OpenRouterExaSearchStatus
  openrouterResearchModel: string | null
  openrouterCitationCount: number
  fallbackUsed: boolean
  fallbackReason: CompetitorResearchFallbackReason | null
  competitorSearchStatus: CompetitorSearchStatus
  tavilyExtractStatus: TavilyExtractStatus
  rawCompetitorCount: number
  usableCompetitorCount: number
  tavilyFailedResultCount: number
}

class CompetitorResearchProgressError extends Error {
  constructor(cause: unknown) {
    super("Competitor research progress callback failed", { cause })
    this.name = "CompetitorResearchProgressError"
  }
}

// ─── Streaming Helper ────────────────────────────────────────────────

async function consumeStream(
  apiResponse: import("openai/streaming").Stream<import("openai/resources/chat/completions").ChatCompletionChunk> | import("openai/resources/chat/completions").ChatCompletion,
  label: string,
  onToken?: (token: string) => void
): Promise<string> {
  // A "length" finish reason means the model hit max_tokens and the document is
  // truncated mid-section. Saving it would strand downstream derived content
  // (e.g. AI Prompts files), so fail the step and let the queue retry instead.
  const assertNotTruncated = (finishReason: string | null | undefined, content: string) => {
    if (finishReason === "length") {
      logError("AnalysisPipeline", "generation_truncated_at_max_tokens", null, {
        label,
        contentLength: content.length,
      })
      throw new Error(
        `${label} generation stopped at the model output limit before the document was complete. Try again.`
      )
    }
  }

  if (onToken && Symbol.asyncIterator in apiResponse) {
    let content = ""
    let finishReason: string | null | undefined
    try {
      for await (const chunk of apiResponse as import("openai/streaming").Stream<import("openai/resources/chat/completions").ChatCompletionChunk>) {
        const token = chunk.choices?.[0]?.delta?.content ?? ""
        if (token) {
          content += token
          onToken(token)
        }
        finishReason = chunk.choices?.[0]?.finish_reason ?? finishReason
      }
    } catch (err) {
      throw new Error(
        `Stream interrupted: ${err instanceof Error ? err.message : String(err)}`
      )
    }
    assertNotTruncated(finishReason, content)
    return content
  } else {
    const resp = apiResponse as import("openai/resources/chat/completions").ChatCompletion
    const content = resp.choices[0]?.message?.content ?? ""
    assertNotTruncated(resp.choices[0]?.finish_reason, content)
    return content
  }
}

function rethrowOpenRouterTimeout(error: unknown, label: string, timeoutMs?: number): never {
  if (isOpenRouterAbortError(error)) {
    throw new Error(buildOpenRouterTimeoutMessage(label, timeoutMs))
  }

  throw error
}

function getOpenRouterFallbackReason(
  status: OpenRouterExaSearchStatus
): CompetitorResearchFallbackReason {
  if (status === "parse_failed") return "openrouter_parse_failed"
  if (status === "unusable") return "openrouter_unusable"
  if (status === "no_citations") return "openrouter_no_citations"
  if (status === "not_configured") return "openrouter_not_configured"
  if (status === "failed") return "openrouter_error"
  if (status === "disabled") return "openrouter_disabled"
  return "openrouter_empty"
}

export async function gatherCompetitorResearch(
  input: Required<Pick<CompetitiveAnalysisInput, "idea" | "name">> & {
    model: string
  },
  dependencies: CompetitorResearchDependencies = {}
): Promise<CompetitorResearchBundle> {
  const searchOpenRouterExa =
    dependencies.searchOpenRouterExa ?? searchCompetitorsWithOpenRouterExa
  const searchPerplexity = dependencies.searchPerplexity ?? searchCompetitors
  const extractTavily = dependencies.extractTavily ?? extractCompetitorInfo
  const openrouterExaDisabled =
    dependencies.openrouterExaDisabled ??
    process.env.OPENROUTER_EXA_MARKET_RESEARCH_DISABLED === "1"
  let evidenceStageEmitted = false
  const emitEvidenceStage = () => {
    if (evidenceStageEmitted) return
    evidenceStageEmitted = true
    try {
      dependencies.onEvidenceStage?.()
    } catch (error) {
      throw new CompetitorResearchProgressError(error)
    }
  }

  let openrouterExaStatus: OpenRouterExaSearchStatus = openrouterExaDisabled
    ? "disabled"
    : "empty"
  let openrouterResearchModel: string | null = openrouterExaDisabled
    ? null
    : getOpenRouterCompetitorResearchModel()
  let openrouterCitationCount = 0
  let fallbackReason: CompetitorResearchFallbackReason | null =
    openrouterExaDisabled ? "openrouter_disabled" : null

  if (!openrouterExaDisabled) {
    try {
      logInfo("CompetitiveAnalysis", "openrouter_exa_search_started", {
        model: input.model,
        researchModel: openrouterResearchModel,
      })
      const result: OpenRouterCompetitorResearchResult =
        await searchOpenRouterExa(input.idea, input.name)
      emitEvidenceStage()
      const usableCompetitors = getUsableCompetitors(result.competitors)
      const providerStatus = getProviderCompetitorSearchStatus(result)

      openrouterResearchModel = result.modelUsed
      openrouterCitationCount = result.citations.length
      openrouterExaStatus =
        providerStatus === "found" && openrouterCitationCount === 0
          ? "no_citations"
          : providerStatus

      logInfo("CompetitiveAnalysis", "openrouter_exa_search_succeeded", {
        model: input.model,
        researchModel: openrouterResearchModel,
        competitorCount: result.competitors.length,
        usableCompetitorCount: usableCompetitors.length,
        citationCount: openrouterCitationCount,
        status: openrouterExaStatus,
      })

      if (openrouterExaStatus === "found") {
        return {
          competitors: usableCompetitors,
          evidenceResults: result.evidenceResults,
          providerUsed: "openrouter_exa",
          openrouterExaStatus,
          openrouterResearchModel,
          openrouterCitationCount,
          fallbackUsed: false,
          fallbackReason: null,
          competitorSearchStatus: "found",
          tavilyExtractStatus: "not_attempted",
          rawCompetitorCount: result.competitors.length,
          usableCompetitorCount: usableCompetitors.length,
          tavilyFailedResultCount: 0,
        }
      }

      fallbackReason = getOpenRouterFallbackReason(openrouterExaStatus)
    } catch (error) {
      if (error instanceof CompetitorResearchProgressError) throw error
      openrouterExaStatus = isMissingProviderConfigError(error)
        ? "not_configured"
        : "failed"
      fallbackReason =
        openrouterExaStatus === "not_configured"
          ? "openrouter_not_configured"
          : "openrouter_error"
      logWarn(
        "CompetitiveAnalysis",
        "openrouter_exa_search_failed_nonfatal",
        { model: input.model, status: openrouterExaStatus },
        error
      )
    }
  }

  let perplexityData: PerplexityCompetitorResult = {
    competitors: [],
    rawResponse: "",
  }
  let competitorSearchStatus: CompetitorSearchStatus = "empty"
  let tavilyExtractStatus: TavilyExtractStatus = "not_attempted"
  let evidenceResults: TavilyExtractResult[] = []
  let tavilyFailedResultCount = 0

  try {
    logInfo("CompetitiveAnalysis", "perplexity_search_started", {
      model: input.model,
      fallbackReason,
    })
    perplexityData = await searchPerplexity(input.idea, input.name)
    competitorSearchStatus = getCompetitorSearchStatus(perplexityData)
    logInfo("CompetitiveAnalysis", "perplexity_search_succeeded", {
      model: input.model,
      competitorCount: perplexityData.competitors.length,
      parseFailed: Boolean(perplexityData.parseFailed),
    })
  } catch (error) {
    competitorSearchStatus = isMissingProviderConfigError(error)
      ? "not_configured"
      : "failed"
    logWarn(
      "CompetitiveAnalysis",
      "perplexity_search_failed_nonfatal",
      { model: input.model },
      error
    )
  }

  const usableCompetitors = getUsableCompetitors(perplexityData.competitors)
  if (competitorSearchStatus === "found" && usableCompetitors.length === 0) {
    competitorSearchStatus = "unusable"
  }

  if (usableCompetitors.length > 0) {
    try {
      emitEvidenceStage()
      const urls = usableCompetitors.map((competitor) => competitor.url)
      logInfo("CompetitiveAnalysis", "tavily_extract_started", {
        model: input.model,
        urlCount: urls.length,
      })
      const tavilyData = await extractTavily(urls)
      evidenceResults = tavilyData.results
      tavilyFailedResultCount = tavilyData.failed_results.length
      tavilyExtractStatus = tavilyData.results.length > 0
        ? tavilyData.failed_results.length > 0
          ? "partial"
          : "succeeded"
        : tavilyData.failed_results.length > 0
          ? "failed"
          : "empty"
      logInfo("CompetitiveAnalysis", "tavily_extract_completed", {
        model: input.model,
        status: tavilyExtractStatus,
        resultCount: tavilyData.results.length,
        failedResultCount: tavilyFailedResultCount,
      })
    } catch (error) {
      if (error instanceof CompetitorResearchProgressError) throw error
      tavilyExtractStatus = isMissingProviderConfigError(error)
        ? "not_configured"
        : "failed"
      logWarn(
        "CompetitiveAnalysis",
        "tavily_extract_failed_nonfatal",
        { model: input.model },
        error
      )
    }
  }

  emitEvidenceStage()

  return {
    competitors: usableCompetitors,
    evidenceResults,
    providerUsed: usableCompetitors.length === 0
      ? "none"
      : evidenceResults.length > 0
        ? "perplexity_tavily"
        : "perplexity",
    openrouterExaStatus,
    openrouterResearchModel,
    openrouterCitationCount,
    fallbackUsed: !openrouterExaDisabled,
    fallbackReason,
    competitorSearchStatus,
    tavilyExtractStatus,
    rawCompetitorCount: perplexityData.competitors.length,
    usableCompetitorCount: usableCompetitors.length,
    tavilyFailedResultCount,
  }
}

// ─── Competitive Analysis Pipeline ──────────────────────────────────

export async function runCompetitiveAnalysis(
  input: CompetitiveAnalysisInput,
  callbacks?: StreamCallbacks
): Promise<AnalysisResult> {
  const model = input.model || DEFAULT_MODEL
  callbacks?.onStage?.("Identifying top competitors...", 1, 4)

  const research = await gatherCompetitorResearch({
    idea: input.idea,
    name: input.name,
    model,
  }, {
    onEvidenceStage: () =>
      callbacks?.onStage?.("Reviewing competitor evidence...", 2, 4),
  })
  callbacks?.onStage?.("Writing competitive analysis...", 3, 4)

  // Competitor source pairs are fully known before synthesis begins. Compute
  // them once here so the streaming callback and the saved metadata can never
  // diverge, and surface them to the executor for the live preview.
  const competitorSourcePairs = buildCompetitorSourcePairs(research)
  callbacks?.onCompetitorSources?.(competitorSourcePairs)

  // Step 3: Build context from gathered data
  const competitorContext = buildCompetitorContext(
    research.competitors,
    research.evidenceResults
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
      max_tokens: withReasoningHeadroom(model, 8192),
      temperature: 0.3,
      stream: callbacks?.onToken ? true : false,
      ...getReasoningParams(model),
    }, { signal: createOpenRouterLongTextSignal() })
  } catch (error) {
    logError("CompetitiveAnalysis", "openrouter_synthesis_failed", error, { model })
    rethrowOpenRouterTimeout(error, "Market Research")
  }

  const content = await consumeStream(completion, "Market Research", callbacks?.onToken)

  if (!content) throw new Error("No content returned from OpenRouter synthesis")
  logInfo("CompetitiveAnalysis", "openrouter_synthesis_succeeded", {
    model,
    contentLength: content.length,
    researchProvider: research.providerUsed,
    openrouterExaStatus: research.openrouterExaStatus,
    competitorSearchStatus: research.competitorSearchStatus,
    usableCompetitorCount: research.usableCompetitorCount,
    tavilyExtractStatus: research.tavilyExtractStatus,
  })
  callbacks?.onStage?.("Finalizing analysis...", 4, 4)

  return {
    content,
    source: "inhouse",
    model,
    metadata: {
      live_research: {
        primary_provider: "openrouter_exa",
        provider_used: research.providerUsed,
        openrouter_exa_search_status: research.openrouterExaStatus,
        openrouter_research_model: research.openrouterResearchModel,
        openrouter_citation_count: research.openrouterCitationCount,
        fallback_used: research.fallbackUsed,
        fallback_reason: research.fallbackReason,
        competitor_search_status: research.competitorSearchStatus,
        competitor_count: research.rawCompetitorCount,
        usable_competitor_count: research.usableCompetitorCount,
        competitor_context_available: competitorContext.trim().length > 0,
        tavily_extract_status: research.tavilyExtractStatus,
        tavily_result_count:
          research.providerUsed === "openrouter_exa"
            ? 0
            : research.evidenceResults.length,
        tavily_failed_result_count: research.tavilyFailedResultCount,
        research_evidence_count: research.evidenceResults.length,
        competitor_sources: competitorSourcePairs,
      },
    },
  }
}

/**
 * The competitor source pairs persisted to
 * analyses.metadata.live_research.competitor_sources AND streamed to the live
 * preview via StreamCallbacks.onCompetitorSources. Single builder so the two
 * consumers always agree: Exa-success runs persist normalized candidate pairs;
 * legacy fallback runs still require a matching Tavily extraction result.
 */
function buildCompetitorSourcePairs(research: {
  providerUsed: CompetitorResearchProvider
  competitors: Array<{ name: string; url: string }>
  evidenceResults: TavilyExtractResult[]
}): { name: string; url: string }[] {
  return research.providerUsed === "openrouter_exa"
    ? normalizeCompetitorSources(research.competitors).map((source) => ({
        name: source.name,
        url: source.url,
      }))
    : buildCompetitorSourcesMetadata(research.competitors, research.evidenceResults)
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
      max_tokens: withReasoningHeadroom(request.model, request.maxTokens),
      temperature: request.temperature,
      stream: callbacks?.onToken ? true : false,
      ...getReasoningParams(request.model),
    }, { signal: createOpenRouterLongTextSignal(OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS) })
  } catch (error) {
    logError("ProductPlan", "openrouter_generation_failed", error, { model: request.model })
    rethrowOpenRouterTimeout(error, "Product Plan", OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS)
  }

  const content = await consumeStream(completion, "Product Plan", callbacks?.onToken)

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
      max_tokens: withReasoningHeadroom(request.model, request.maxTokens),
      temperature: request.temperature,
      stream: callbacks?.onToken ? true : false,
      ...getReasoningParams(request.model),
    }, { signal: createOpenRouterLongTextSignal(OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS) })
  } catch (error) {
    logError("MVPPlan", "openrouter_generation_failed", error, { model: request.model })
    rethrowOpenRouterTimeout(error, "First Version Plan", OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS)
  }

  const content = await consumeStream(completion, "First Version Plan", callbacks?.onToken)

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
      max_tokens: withReasoningHeadroom(model, 8192),
      temperature: 0.3,
      stream: callbacks?.onToken ? true : false,
      ...getReasoningParams(model),
    }, { signal: createOpenRouterLongTextSignal() })
  } catch (error) {
    logError("TechSpec", "openrouter_generation_failed", error, { model })
    rethrowOpenRouterTimeout(error, "Technical Specifications")
  }

  const content = await consumeStream(completion, "Technical Specifications", callbacks?.onToken)

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
      max_tokens: withReasoningHeadroom(model, LAUNCH_PLAN_MAX_TOKENS),
      temperature: 0.35,
      stream: callbacks?.onToken ? true : false,
      ...getReasoningParams(model),
    }, { signal: createOpenRouterLongTextSignal() })
  } catch (error) {
    logError("LaunchPlan", "openrouter_generation_failed", error, { model })
    rethrowOpenRouterTimeout(error, "Launch Plan")
  }

  const content = await consumeStream(completion, "Launch Plan", callbacks?.onToken)

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

export function buildCompetitorSourcesMetadata(
  competitors: Array<{ name: string; url: string }>,
  extractedResults: Array<{ url: string }>
) {
  const extractedUrls = new Set(
    extractedResults
      .map((result) => getSafeExternalHttpUrl(result.url))
      .filter((url): url is string => Boolean(url))
  )

  return normalizeCompetitorSources(competitors)
    .filter((source) => extractedUrls.has(source.url))
    .map((source) => ({
      name: source.name,
      url: source.url,
    }))
}

export function getCompetitorSearchStatus(
  perplexityData: PerplexityCompetitorResult
): CompetitorSearchStatus {
  return getProviderCompetitorSearchStatus(perplexityData)
}

export function buildCompetitorContext(
  competitors: CompetitorCandidate[],
  evidenceResults: CompetitorEvidencePage[]
): string {
  const usableCompetitors = getUsableCompetitors(competitors)
  if (usableCompetitors.length === 0) return ""

  const boundedEvidence = evidenceResults.slice(0, 10).flatMap((result) => {
    const url = getSafeExternalHttpUrl(result.url)
    if (!url || !result.content.trim()) return []
    return [{ ...result, url }]
  })
  const evidenceMap = new Map(boundedEvidence.map((result) => [result.url, result]))
  const matchedEvidenceUrls = new Set<string>()

  const competitorSections = usableCompetitors
    .map((comp) => {
      const urlData = evidenceMap.get(comp.url)
      if (urlData) matchedEvidenceUrls.add(comp.url)
      const urlContent = urlData?.content
        ? `\nURL Content (from ${comp.url}):\n${urlData.content.substring(0, 1500)}`
        : `\nURL: ${comp.url} (content extraction not available)`

      return `## ${comp.name}
Description: ${comp.description}
Why they compete: ${comp.whyCompetes}${urlContent}`
    })
    .join("\n\n---\n\n")

  const unmatchedEvidence = boundedEvidence.filter(
    (result) => !matchedEvidenceUrls.has(result.url)
  )
  if (unmatchedEvidence.length === 0) return competitorSections

  const researchEvidence = unmatchedEvidence
    .map((result) => {
      const title = result.title?.trim().slice(0, 300) || "Additional research source"
      return `### ${title}\nSource URL: ${result.url}\nExcerpt: ${result.content.slice(0, 1500)}`
    })
    .join("\n\n")

  return `${competitorSections}\n\n---\n\n## Additional Research Evidence\n${researchEvidence}`
}

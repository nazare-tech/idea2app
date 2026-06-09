import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

import { isDevOnlyFeatureEnabled, type DevOnlyFeatureEnv } from "@/lib/dev-only"
import {
  COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
  LAUNCH_PLAN_SYSTEM_PROMPT,
  buildCompetitiveAnalysisUserPrompt,
  buildLaunchPlanUserPrompt,
  type LaunchPlanBrief,
} from "@/lib/prompts"
import {
  PROMPT_LAB_ARTIFACT_LABELS,
  PROMPT_LAB_ARTIFACTS,
  PROMPT_LAB_DEFAULT_LAUNCH_BRIEF,
  PROMPT_LAB_IMAGE_MODEL_OPTIONS,
  PROMPT_LAB_MOCKUP_SKIP_IMAGE_GENERATION_DEFAULT,
  PROMPT_LAB_TEXT_MODEL_OPTIONS,
  getBasePromptLabModelOptions,
  getPromptLabModelOptions,
  type PromptLabArtifact,
  type PromptLabModelOption,
} from "@/lib/prompt-lab-shared"
import {
  OPENROUTER_IMAGE_MOCKUP_SOURCE,
  OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
  buildMockupImageProxyUrl,
  type OpenRouterImageMockupContent,
} from "@/lib/openrouter-image-mockup-format"
import {
  OPENROUTER_IMAGE_MOCKUP_SYSTEM_PROMPT,
  OPENROUTER_MOCKUP_OPTION_CONFIGS,
  buildMockupImagePromptForOption,
  buildOpenRouterMockupImagePrompt,
  generateOpenRouterImageMockupOption,
  getOpenRouterMockupImageModel,
  getOpenRouterMockupImageTimeoutMs,
  getOpenRouterMockupPlannerMaxTokens,
  getOpenRouterMockupPlannerModel,
  type OpenRouterMockupOptionLabel,
} from "@/lib/openrouter-image-mockup-pipeline"
import {
  buildMockupGenerationBrief,
  formatMockupGenerationBrief,
  normalizeMockupDesignPlanScreens,
  parseMockupDesignPlan,
  type MockupDesignPlan,
  type MockupPrimaryPlatform,
} from "@/lib/mockup-design-plan"
import {
  buildOpenRouterTimeoutMessage,
  createOpenRouterLongTextSignal,
  isOpenRouterAbortError,
  OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS,
} from "@/lib/openrouter-timeout"
import {
  PRODUCT_PLAN_DEFAULT_MODEL,
  PRODUCT_PLAN_MAX_TOKENS,
  PRODUCT_PLAN_TEMPERATURE,
} from "@/lib/product-plan-config"
import {
  buildProductPlanPromptRequest,
} from "@/lib/product-plan-prompt-request"
import {
  FIRST_VERSION_PLAN_DEFAULT_MODEL,
  FIRST_VERSION_PLAN_MAX_TOKENS,
  FIRST_VERSION_PLAN_TEMPERATURE,
} from "@/lib/first-version-plan-config"
import {
  buildFirstVersionPlanPromptRequest,
} from "@/lib/first-version-plan-prompt-request"

export {
  PROMPT_LAB_ARTIFACT_LABELS,
  PROMPT_LAB_ARTIFACTS,
  PROMPT_LAB_DEFAULT_LAUNCH_BRIEF,
  PROMPT_LAB_IMAGE_MODEL_OPTIONS,
  PROMPT_LAB_MOCKUP_SKIP_IMAGE_GENERATION_DEFAULT,
  PROMPT_LAB_TEXT_MODEL_OPTIONS,
  getBasePromptLabModelOptions,
  getPromptLabModelOptions,
  type PromptLabArtifact,
  type PromptLabModelOption,
}

export const PROMPT_LAB_DEFAULT_MODELS: Record<PromptLabArtifact, string> = {
  competitive: "google/gemini-3.1-pro-preview",
  prd: PRODUCT_PLAN_DEFAULT_MODEL,
  mvp: FIRST_VERSION_PLAN_DEFAULT_MODEL,
  mockups: getOpenRouterMockupImageModel(),
  launch: "openai/gpt-5.4-mini",
}

const PROMPT_LAB_LONG_TEXT_MAX_TOKENS = 8_192
const PROMPT_LAB_STANDARD_TEXT_MAX_TOKENS = 4_096

export interface PromptLabDefaultPromptInput {
  artifact: PromptLabArtifact
  idea: string
  name: string
  competitiveAnalysis?: string | null
  prd?: string | null
  mvpPlan?: string | null
  launchBrief?: LaunchPlanBrief
  mockupOption?: OpenRouterMockupOptionLabel
}

export interface PromptLabPromptPair {
  systemPrompt: string
  userPrompt: string
  model: string
}

export interface PromptLabRunInput {
  artifact: PromptLabArtifact
  projectId: string
  projectName: string
  systemPrompt: string
  userPrompt: string
  model: string
  mockupOption?: OpenRouterMockupOptionLabel
  mockupPlatform?: MockupPrimaryPlatform | "auto"
  runMode?: "isolated" | "planner-option"
  plannerSystemPrompt?: string
  plannerUserPrompt?: string
  mockupMvpPlan?: string
  /** When true, runs the planner but stops before calling the image model.
   *  Returns the final image prompt in metadata so it can be pasted into
   *  an external tool (e.g. ChatGPT). Defaults to true for Prompt Lab mockups. */
  skipImageGeneration?: boolean
}

export interface PromptLabRunResult {
  content: string
  model: string
  source: "inhouse" | typeof OPENROUTER_IMAGE_MOCKUP_SOURCE | typeof OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE
  metadata: Record<string, unknown>
}

export function isPromptLabEnabled(env: DevOnlyFeatureEnv = process.env) {
  return isDevOnlyFeatureEnabled(env)
}

export function isPromptLabArtifact(value: unknown): value is PromptLabArtifact {
  return typeof value === "string" && PROMPT_LAB_ARTIFACTS.includes(value as PromptLabArtifact)
}

export function isMockupOptionLabel(value: unknown): value is OpenRouterMockupOptionLabel {
  return typeof value === "string" && OPENROUTER_MOCKUP_OPTION_CONFIGS.some((config) => config.label === value)
}

export function applyPromptLabMockupPlatformOverride(
  designPlan: MockupDesignPlan,
  mockupPlatform: MockupPrimaryPlatform | "auto",
): MockupDesignPlan {
  const effectivePlatform = mockupPlatform === "auto" ? designPlan.primaryPlatform : mockupPlatform

  return {
    ...designPlan,
    primaryPlatform: effectivePlatform,
    screens: normalizeMockupDesignPlanScreens(designPlan.screens, effectivePlatform),
  }
}

export function buildPromptLabDefaultPrompts({
  artifact,
  idea,
  name,
  competitiveAnalysis,
  prd,
  mvpPlan,
  launchBrief = PROMPT_LAB_DEFAULT_LAUNCH_BRIEF,
  mockupOption = "A",
}: PromptLabDefaultPromptInput): PromptLabPromptPair {
  if (artifact === "competitive") {
    return {
      systemPrompt: COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
      userPrompt: buildCompetitiveAnalysisUserPrompt(
        idea,
        name,
        "No live competitor search is included in Prompt Lab defaults. Add competitor notes here if this run should test evidence-grounded Market Research output.",
      ),
      model: PROMPT_LAB_DEFAULT_MODELS.competitive,
    }
  }

  if (artifact === "prd") {
    const request = buildProductPlanPromptRequest({
      idea,
      name,
      competitiveAnalysis,
      model: PROMPT_LAB_DEFAULT_MODELS.prd,
    })

    return {
      systemPrompt: request.systemPrompt,
      userPrompt: request.userPrompt,
      model: request.model,
    }
  }

  if (artifact === "mvp") {
    const request = buildFirstVersionPlanPromptRequest({
      idea,
      name,
      prd,
      model: PROMPT_LAB_DEFAULT_MODELS.mvp,
    })

    return {
      systemPrompt: request.systemPrompt,
      userPrompt: request.userPrompt,
      model: request.model,
    }
  }

  if (artifact === "mockups") {
    const config = OPENROUTER_MOCKUP_OPTION_CONFIGS.find((option) => option.label === mockupOption) ?? OPENROUTER_MOCKUP_OPTION_CONFIGS[0]
    return {
      systemPrompt: OPENROUTER_IMAGE_MOCKUP_SYSTEM_PROMPT,
      userPrompt: buildOpenRouterMockupImagePrompt({
        projectName: name,
        mvpPlan: mvpPlan || `First Version Plan for ${name}: ${idea}`,
        label: config.label,
        title: config.title,
        strategy: config.strategy,
      }),
      model: PROMPT_LAB_DEFAULT_MODELS.mockups,
    }
  }

  return {
    systemPrompt: LAUNCH_PLAN_SYSTEM_PROMPT,
    userPrompt: buildLaunchPlanUserPrompt(idea, name, launchBrief),
    model: PROMPT_LAB_DEFAULT_MODELS.launch,
  }
}

export async function runPromptLabArtifact({
  artifact,
  projectId,
  projectName,
  systemPrompt,
  userPrompt,
  model,
  mockupOption = "A",
  mockupPlatform = "auto",
  runMode = "isolated",
  plannerSystemPrompt,
  plannerUserPrompt,
  mockupMvpPlan,
  skipImageGeneration = PROMPT_LAB_MOCKUP_SKIP_IMAGE_GENERATION_DEFAULT,
}: PromptLabRunInput): Promise<PromptLabRunResult> {
  const isPromptOnlyMockupPlannerRun = artifact === "mockups" && runMode === "planner-option" && skipImageGeneration
  const willUseAnthropicPlanner = isPromptOnlyMockupPlannerRun && Boolean(process.env.ANTHROPIC_API_KEY)
  const requiresOpenRouter = !willUseAnthropicPlanner
  if (requiresOpenRouter && !process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not configured")
  }

  if (artifact === "mockups") {
    if (runMode === "planner-option") {
      if (!plannerSystemPrompt?.trim() || !plannerUserPrompt?.trim()) {
        throw new Error("Planner system prompt and planner user prompt are required")
      }

      const plannerModel = getOpenRouterMockupPlannerModel()
      let plannerOutput: string

      // When skipping image generation, use Claude (Anthropic) directly for the planner
      // so no OpenRouter credits are consumed at all.
      if (skipImageGeneration && process.env.ANTHROPIC_API_KEY) {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const anthropicResponse = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: getOpenRouterMockupPlannerMaxTokens(),
          system: plannerSystemPrompt,
          messages: [{ role: "user", content: plannerUserPrompt }],
        })
        const textBlock = anthropicResponse.content.find((b) => b.type === "text")
        plannerOutput = (textBlock && "text" in textBlock ? textBlock.text : "").trim()
        if (!plannerOutput) {
          throw new Error("Claude did not return a mockup design plan")
        }
      } else {
        const openrouter = new OpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: process.env.OPENROUTER_API_KEY,
        })
        let plannerCompletion: Awaited<ReturnType<typeof openrouter.chat.completions.create>>

        try {
          plannerCompletion = await openrouter.chat.completions.create({
            model: plannerModel,
            messages: [
              { role: "system", content: plannerSystemPrompt },
              { role: "user", content: plannerUserPrompt },
            ],
            max_completion_tokens: getOpenRouterMockupPlannerMaxTokens(),
          }, {
            signal: AbortSignal.timeout(getOpenRouterMockupImageTimeoutMs()),
          })
        } catch (error) {
          if (isOpenRouterAbortError(error)) {
            throw new Error(buildOpenRouterTimeoutMessage("Prompt Lab mockup planner", getOpenRouterMockupImageTimeoutMs()))
          }
          throw error
        }

        plannerOutput = extractPromptLabAssistantText(plannerCompletion.choices[0])
        if (!plannerOutput) {
          throw new Error("OpenRouter did not return a mockup design plan")
        }
      }

      const parsedDesignPlan = parseMockupDesignPlan(plannerOutput)
      const designPlan = applyPromptLabMockupPlatformOverride(parsedDesignPlan, mockupPlatform)
      const compactBrief = formatMockupGenerationBrief(buildMockupGenerationBrief({
        projectName,
        mvpPlan: mockupMvpPlan || userPrompt,
        platformPreference: mockupPlatform === "auto" ? null : mockupPlatform,
      }))

      // --- Prompt-only mode: return the image prompt without calling OpenRouter ---
      if (skipImageGeneration) {
        const imagePrompts = buildMockupImagePromptForOption({
          projectName,
          mvpPlan: mockupMvpPlan || userPrompt,
          label: mockupOption,
          systemPromptOverride: systemPrompt,
          designPlan,
        })
        return {
          content: imagePrompts.userPrompt,
          model: plannerModel,
          source: "inhouse",
          metadata: {
            runMode: "planner-only",
            mockupOption,
            mockupPlatform,
            platformOverrideApplied: mockupPlatform !== "auto",
            skipImageGeneration: true,
            plannerModel,
            compactBrief,
            compactBriefCharCount: compactBrief.length,
            plannerPromptCharCount: plannerUserPrompt.length,
            plannerOutput,
            designPlan,
            imageSystemPrompt: imagePrompts.systemPrompt,
            imageUserPrompt: imagePrompts.userPrompt,
            imagePromptCharCount: imagePrompts.userPrompt.length,
          },
        }
      }

      const result = await generateOpenRouterImageMockupOption({
        projectId,
        projectName,
        mvpPlan: mockupMvpPlan || userPrompt,
        label: mockupOption,
        model,
        systemPrompt,
        designPlan,
      })
      const content: OpenRouterImageMockupContent = {
        type: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
        model: result.model,
        generatedAt: new Date().toISOString(),
        options: [
          {
            ...result.option,
            imageUrl: buildPromptLabMockupImageUrl(projectId, result.option.storagePath),
          },
        ],
      }

      return {
        content: JSON.stringify(content),
        model: result.model,
        source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
        metadata: {
          runMode,
          mockupOption,
          mockupPlatform,
          platformOverrideApplied: mockupPlatform !== "auto",
          storagePath: result.option.storagePath,
          runId: result.runId,
          plannerModel,
          compactBrief,
          compactBriefCharCount: compactBrief.length,
          plannerPromptCharCount: plannerUserPrompt.length,
          plannerOutput,
          designPlan: result.designPlan,
          imagePromptCharCount: result.option.imagePromptCharCount,
        },
      }
    }

    const result = await generateOpenRouterImageMockupOption({
      projectId,
      projectName,
      mvpPlan: userPrompt,
      label: mockupOption,
      model,
      systemPrompt,
      userPrompt,
    })
    const content: OpenRouterImageMockupContent = {
      type: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
      model: result.model,
      generatedAt: new Date().toISOString(),
      options: [
        {
          ...result.option,
          imageUrl: buildPromptLabMockupImageUrl(projectId, result.option.storagePath),
        },
      ],
    }

    return {
      content: JSON.stringify(content),
      model: result.model,
      source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
      metadata: {
        runMode,
        mockupOption,
        storagePath: result.option.storagePath,
        runId: result.runId,
        designPlan: result.designPlan,
      },
    }
  }

  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  })

  const maxTokens =
    artifact === "prd"
      ? PRODUCT_PLAN_MAX_TOKENS
      : artifact === "mvp"
        ? FIRST_VERSION_PLAN_MAX_TOKENS
      : artifact === "competitive"
        ? PROMPT_LAB_LONG_TEXT_MAX_TOKENS
        : PROMPT_LAB_STANDARD_TEXT_MAX_TOKENS
  const timeoutMs =
    artifact === "prd" || artifact === "mvp"
      ? OPENROUTER_PLANNING_DOCUMENT_TIMEOUT_MS
      : undefined

  let completion: Awaited<ReturnType<typeof openrouter.chat.completions.create>>
  try {
    completion = await openrouter.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: artifact === "launch" ? 0.35 : artifact === "prd" ? PRODUCT_PLAN_TEMPERATURE : artifact === "mvp" ? FIRST_VERSION_PLAN_TEMPERATURE : 0.3,
    }, { signal: createOpenRouterLongTextSignal(timeoutMs) })
  } catch (error) {
    if (isOpenRouterAbortError(error)) {
      throw new Error(buildOpenRouterTimeoutMessage(`Prompt Lab ${PROMPT_LAB_ARTIFACT_LABELS[artifact]}`, timeoutMs))
    }
    throw error
  }

  const content = completion.choices[0]?.message?.content?.trim()
  if (!content) throw new Error(`No content returned for ${PROMPT_LAB_ARTIFACT_LABELS[artifact]}`)

  return {
    content,
    model,
    source: "inhouse",
    metadata: {},
  }
}

function extractPromptLabAssistantText(choice: unknown) {
  const choiceRecord = typeof choice === "object" && choice !== null ? choice as Record<string, unknown> : null
  const message = typeof choiceRecord?.message === "object" && choiceRecord.message !== null
    ? choiceRecord.message as Record<string, unknown>
    : null
  const content = message?.content

  if (typeof content === "string") return content.trim()
  if (!Array.isArray(content)) return ""

  return content
    .map((part) => {
      const record = typeof part === "object" && part !== null ? part as Record<string, unknown> : null
      return typeof record?.text === "string" ? record.text : ""
    })
    .join(" ")
    .trim()
}

export function buildPromptLabMockupImageUrl(projectId: string, storagePath: string) {
  const params = new URLSearchParams({ projectId, path: storagePath })
  return `/api/dev/prompt-lab/mockup-image?${params.toString()}`
}

export function buildProductionMockupImageUrl(projectId: string, storagePath: string) {
  return buildMockupImageProxyUrl({ projectId, storagePath })
}

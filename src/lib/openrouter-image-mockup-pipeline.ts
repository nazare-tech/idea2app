import { readFileSync } from "node:fs"
import { join } from "node:path"

import OpenAI from "openai"
import type { SupabaseClient } from "@supabase/supabase-js"

import { createServiceClient } from "@/lib/supabase/service"
import {
  DEFAULT_OPENROUTER_MOCKUP_IMAGE_MODEL,
  OPENROUTER_IMAGE_MOCKUP_SOURCE,
  OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
  buildMockupImageProxyUrl,
  parseOpenRouterImageMockupContent,
  getStoragePathsFromOpenRouterImageMockupContent,
  isValidDraftMockupImagePath,
  type OpenRouterImageMockupContent,
  type OpenRouterImageMockupOption,
} from "@/lib/openrouter-image-mockup-format"
import {
  MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT,
  buildMockupGenerationBrief,
  buildMockupDesignPlanUserPrompt,
  formatMockupGenerationBrief,
  parseMockupDesignPlan,
  type MockupDesignDirection,
  type MockupDesignPlan,
  type MockupDesignPlanScreen,
  type MockupPrimaryPlatform,
} from "@/lib/mockup-design-plan"
import type { Database, Json } from "@/types/database"
import { logError, logInfo, logWarn } from "@/lib/logger"

export const MOCKUP_STORAGE_BUCKET =
  process.env.SUPABASE_MOCKUP_STORAGE_BUCKET || "mockups"
const MAX_MOCKUP_IMAGE_BYTES = 10 * 1024 * 1024
const DEFAULT_IMAGE_TIMEOUT_MS = 790_000
const DEFAULT_IMAGE_MAX_TOKENS = 16_384
const DEFAULT_PLANNER_MODEL = "openai/gpt-5.4-mini"
const DEFAULT_PLANNER_MAX_TOKENS = 16_384
const MOCKUP_STORYBOARD_FRAME_COUNT = 2

interface MockupStoryboardSkeleton {
  label: string
  publicPath: string
  aspectRatio: string
  aspectRatioDescription: string
  canvasDescription: string
  preservedStructure: string
  chromeDescription: string
  interiorDescription: string
}

const MOCKUP_STORYBOARD_SKELETONS: Record<MockupPrimaryPlatform, MockupStoryboardSkeleton> = {
  "desktop-web": {
    label: "desktop web Safari storyboard skeleton",
    publicPath: "/mockups/skeletons/desktop-web-storyboard-skeleton.png",
    aspectRatio: "21:9",
    aspectRatioDescription: "wide 21:9 landscape",
    canvasDescription: "4738x2030 white 21:9-ish canvas with two side-by-side desktop browser frames",
    preservedStructure: "the exact canvas size, white background, two desktop frame positions, frame sizes, rounded corners, black outlines, drop shadows, top caption placement, gutter spacing, and frame alignment",
    chromeDescription: "Safari browser chrome, macOS traffic-light dots, toolbar controls, address bar, and all browser UI details",
    interiorDescription: "the purple placeholder areas inside each Safari desktop frame",
  },
  "mobile-web": {
    label: "mobile web Safari storyboard skeleton",
    publicPath: "/mockups/skeletons/mobile-web-storyboard-skeleton.png",
    aspectRatio: "4:3",
    aspectRatioDescription: "near-4:3 landscape",
    canvasDescription: "2760x2030 white canvas with two side-by-side iPhone mobile browser frames",
    preservedStructure: "the exact canvas size, white background, two iPhone frame positions, phone sizes, rounded corners, black outlines, drop shadows, top caption placement, gutter spacing, and frame alignment",
    chromeDescription: "iOS status bars, Dynamic Island cutouts, signal/wifi/battery indicators, bottom Safari toolbar, figma.com address pill, and mobile browser controls",
    interiorDescription: "the purple placeholder areas inside each mobile Safari frame",
  },
  "native-mobile-app": {
    label: "native mobile app storyboard skeleton",
    publicPath: "/mockups/skeletons/native-mobile-app-storyboard-skeleton.png",
    aspectRatio: "4:3",
    aspectRatioDescription: "near-4:3 landscape",
    canvasDescription: "2760x2030 white canvas with two side-by-side native iPhone app frames",
    preservedStructure: "the exact canvas size, white background, two iPhone frame positions, phone sizes, rounded corners, black outlines, drop shadows, top caption placement, gutter spacing, and frame alignment",
    chromeDescription: "iOS status bars, Dynamic Island cutouts, signal/wifi/battery indicators, and native device chrome without adding browser controls",
    interiorDescription: "the purple placeholder areas inside each native mobile app frame",
  },
  "native-desktop-app": {
    label: "native desktop app storyboard skeleton",
    publicPath: "/mockups/skeletons/native-desktop-app-storyboard-skeleton.png",
    aspectRatio: "21:9",
    aspectRatioDescription: "wide 21:9 landscape",
    canvasDescription: "4738x2030 white 21:9-ish canvas with two side-by-side native macOS app windows",
    preservedStructure: "the exact canvas size, white background, two desktop window positions, window sizes, rounded corners, black outlines, drop shadows, top caption placement, gutter spacing, and window alignment",
    chromeDescription: "native macOS window chrome, traffic-light dots, and all non-browser window details without adding Safari or web browser UI",
    interiorDescription: "the purple placeholder areas inside each native desktop app window",
  },
}

export const OPENROUTER_MOCKUP_OPTION_CONFIGS = [
  {
    label: "A",
    title: "Focused dashboard",
    strategy: "A dense but calm product dashboard that emphasizes scanability, status, and next actions.",
  },
  {
    label: "B",
    title: "Guided workflow",
    strategy: "A step-by-step workflow view that emphasizes onboarding, progress, and decision support.",
  },
  {
    label: "C",
    title: "Executive overview",
    strategy: "A polished overview screen that emphasizes business value, hierarchy, and presentation quality.",
  },
] as const

export type OpenRouterMockupOptionLabel = typeof OPENROUTER_MOCKUP_OPTION_CONFIGS[number]["label"]

type ServerSupabaseClient = SupabaseClient<Database>

export {
  DEFAULT_OPENROUTER_MOCKUP_IMAGE_MODEL,
  OPENROUTER_IMAGE_MOCKUP_SOURCE,
  OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
  buildMockupImageProxyUrl,
  getStoragePathsFromOpenRouterImageMockupContent,
  isValidDraftMockupImagePath,
  parseOpenRouterImageMockupContent,
}
export type { OpenRouterImageMockupContent, OpenRouterImageMockupOption }

export interface GenerateOpenRouterImageMockupInput {
  mvpPlan: string
  projectName: string
  projectId: string
  runId?: string
  idea?: string
  intakeContext?: string
  productPlan?: string
  send?: (event: object) => void
  onOptionGenerated?: (payload: OpenRouterImageMockupOptionGeneratedPayload) => Promise<void>
}

export interface GenerateOpenRouterImageMockupResult {
  content: string
  model: string
  runId: string
  source: typeof OPENROUTER_IMAGE_MOCKUP_SOURCE | typeof OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE
  metadata: Database["public"]["Tables"]["mockups"]["Insert"]["metadata"]
}

export interface GenerateOpenRouterImageMockupOptionInput {
  mvpPlan: string
  projectName: string
  projectId: string
  label: OpenRouterMockupOptionLabel
  model?: string
  runId?: string
  systemPrompt?: string
  userPrompt?: string
  idea?: string
  intakeContext?: string
  productPlan?: string
  designPlan?: MockupDesignPlan
  onOptionGenerated?: (payload: OpenRouterImageMockupOptionGeneratedPayload) => Promise<void>
}

export interface GenerateOpenRouterImageMockupOptionResult {
  option: OpenRouterImageMockupOption
  model: string
  source: typeof OPENROUTER_IMAGE_MOCKUP_SOURCE | typeof OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE
  runId: string
  designPlan: MockupDesignPlan
}

export interface OpenRouterImageMockupOptionGeneratedPayload {
  option: OpenRouterImageMockupOption
  model: string
  runId: string
  designPlan: MockupDesignPlan
}

export function getOpenRouterMockupImageModel() {
  return process.env.OPENROUTER_MOCKUP_IMAGE_MODEL || DEFAULT_OPENROUTER_MOCKUP_IMAGE_MODEL
}

export function getOpenRouterMockupPlannerModel() {
  return process.env.OPENROUTER_MOCKUP_PLANNER_MODEL ||
    process.env.OPENROUTER_ANALYSIS_MODEL ||
    DEFAULT_PLANNER_MODEL
}

export function getMockupStoryboardSkeleton(platform: MockupPrimaryPlatform) {
  return MOCKUP_STORYBOARD_SKELETONS[platform]
}

function getMockupStoryboardSkeletonFilePath(platform: MockupPrimaryPlatform) {
  const skeleton = getMockupStoryboardSkeleton(platform)
  return join(process.cwd(), "public", skeleton.publicPath.replace(/^\//, ""))
}

export function buildMockupStoryboardSkeletonDataUrl(platform: MockupPrimaryPlatform) {
  const skeletonPath = getMockupStoryboardSkeletonFilePath(platform)
  const buffer = readFileSync(skeletonPath)

  return `data:image/png;base64,${buffer.toString("base64")}`
}

export function buildOpenRouterMockupImageUserMessageContent({
  prompt,
  platform,
}: {
  prompt: string
  platform: MockupPrimaryPlatform
}): OpenAI.Chat.Completions.ChatCompletionUserMessageParam["content"] {
  return [
    {
      type: "text",
      text: prompt,
    },
    {
      type: "image_url",
      image_url: {
        url: buildMockupStoryboardSkeletonDataUrl(platform),
        detail: "high",
      },
    },
  ]
}

export function parseImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\s]+)$/)
  if (!match) {
    throw new Error("Unsupported image data URL returned by OpenRouter")
  }

  const contentType = match[1] === "image/jpg" ? "image/jpeg" : match[1]
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1]
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64")

  if (buffer.length === 0) {
    throw new Error("OpenRouter returned an empty image")
  }
  if (buffer.length > MAX_MOCKUP_IMAGE_BYTES) {
    throw new Error("OpenRouter returned an image larger than the 10 MB storage limit")
  }

  return { buffer, contentType, extension, ...readImageDimensions(buffer, contentType) }
}

export function extractImageDataUrlFromOpenRouterChoice(choice: unknown) {
  const choiceRecord = asRecord(choice)
  const message = asRecord(choiceRecord?.message)
  const images = Array.isArray(message?.images) ? message.images : []

  for (const image of images) {
    const imageRecord = asRecord(image)
    const snakeCase = asRecord(imageRecord?.image_url)
    const camelCase = asRecord(imageRecord?.imageUrl)
    const url = snakeCase?.url ?? camelCase?.url
    if (typeof url === "string" && url.startsWith("data:image/")) {
      return url
    }
  }

  throw new Error("OpenRouter image model did not return an image")
}

export async function generateOpenRouterImageMockup({
  mvpPlan,
  projectName,
  projectId,
  runId: providedRunId,
  idea,
  intakeContext,
  productPlan,
  send,
  onOptionGenerated,
}: GenerateOpenRouterImageMockupInput): Promise<GenerateOpenRouterImageMockupResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not configured")
  }

  const model = getOpenRouterMockupImageModel()
  const plannerModel = getOpenRouterMockupPlannerModel()
  const runId = providedRunId || crypto.randomUUID()
  const generatedAt = new Date().toISOString()
  const storageSupabase = createServiceClient() as ServerSupabaseClient
  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  })

  send?.({ type: "stage", message: "Preparing image mockup prompts...", step: 1, totalSteps: 5 })
  logInfo("OpenRouterMockup", "generation_started", {
    projectId,
    runId,
    model,
    plannerModel,
    hasIdea: Boolean(idea),
    hasIntakeContext: Boolean(intakeContext),
    hasProductPlan: Boolean(productPlan),
    mvpPlanLength: mvpPlan.length,
  })
  const compactBrief = formatMockupGenerationBrief(buildMockupGenerationBrief({
    projectName,
    idea,
    intakeContext,
    productPlan,
    mvpPlan,
  }))
  const plannerUserPrompt = buildMockupDesignPlanUserPrompt({
    projectName,
    idea,
    intakeContext,
    productPlan,
    mvpPlan,
  })

  const designPlan = await generateMockupDesignPlan({
    openrouter,
    model: plannerModel,
    projectName,
    mvpPlan,
    idea,
    intakeContext,
    productPlan,
  })
  logInfo("OpenRouterMockup", "design_plan_ready", {
    projectId,
    runId,
    plannerModel,
    primaryPlatform: designPlan.primaryPlatform,
    screenCount: designPlan.screens.length,
    directionCount: designPlan.directions.length,
  })

  send?.({ type: "stage", message: "Generating 3 visual directions...", step: 2, totalSteps: 5 })

  const generatedOptions = await Promise.all(
    OPENROUTER_MOCKUP_OPTION_CONFIGS.map((config) =>
      generateAndStoreOption({
        config,
        model,
        openrouter,
        storageSupabase,
        mvpPlan,
        projectName,
        projectId,
        runId,
        designPlan,
        onOptionGenerated,
      }),
    ),
  )
  logInfo("OpenRouterMockup", "options_generated", {
    projectId,
    runId,
    model,
    optionCount: generatedOptions.length,
    labels: generatedOptions.map((option) => option.label),
  })
  const imagePromptCharCounts = Object.fromEntries(
    generatedOptions.map((option) => [option.label, option.imagePromptCharCount]),
  )
  const imageSkeletonAssetPaths = Object.fromEntries(
    generatedOptions.map((option) => [option.label, option.skeletonAssetPath]),
  )
  const contentOptions = generatedOptions.map((option) =>
    buildCanonicalMockupContentOption({ projectId, option })
  )

  send?.({ type: "stage", message: "Saving mockup images...", step: 5, totalSteps: 5 })

  const content: OpenRouterImageMockupContent = {
    type: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
    model,
    generatedAt,
    options: contentOptions,
  }

  return {
    content: JSON.stringify(content),
    model,
    runId,
    source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
    metadata: {
      source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
      model,
      storage_bucket: MOCKUP_STORAGE_BUCKET,
      storage_run_id: runId,
      generated_at: generatedAt,
      design_plan: designPlan as unknown as Json,
      planner_model: plannerModel,
      image_config: getOpenRouterMockupImageConfig(designPlan.primaryPlatform) as unknown as Json,
      prompt_version: "mockup-compact-v1",
      compact_brief_char_count: compactBrief.length,
      planner_prompt_char_count: plannerUserPrompt.length,
      image_prompt_char_counts: imagePromptCharCounts as unknown as Json,
      image_skeleton_asset_paths: imageSkeletonAssetPaths as unknown as Json,
    } satisfies Record<string, Json>,
  }
}

export function buildCanonicalMockupContentOption({
  projectId,
  option,
}: {
  projectId: string
  option: OpenRouterImageMockupOption
}): OpenRouterImageMockupOption {
  return {
    label: option.label,
    title: option.title,
    imageUrl: buildMockupImageProxyUrl({ projectId, storagePath: option.storagePath }),
    storagePath: option.storagePath,
    description: option.description,
    contentType: option.contentType,
    ...(option.screens ? { screens: option.screens } : {}),
    ...(option.width ? { width: option.width } : {}),
    ...(option.height ? { height: option.height } : {}),
  }
}

export async function generateOpenRouterImageMockupOption({
  mvpPlan,
  projectName,
  projectId,
  label,
  model: modelOverride,
  runId = crypto.randomUUID(),
  systemPrompt,
  userPrompt,
  idea,
  intakeContext,
  productPlan,
  designPlan: designPlanOverride,
  onOptionGenerated,
}: GenerateOpenRouterImageMockupOptionInput): Promise<GenerateOpenRouterImageMockupOptionResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not configured")
  }

  const config = OPENROUTER_MOCKUP_OPTION_CONFIGS.find((optionConfig) => optionConfig.label === label)
  if (!config) {
    throw new Error(`Unsupported mockup option label: ${label}`)
  }

  const model = modelOverride || getOpenRouterMockupImageModel()
  const plannerModel = getOpenRouterMockupPlannerModel()
  const storageSupabase = createServiceClient() as ServerSupabaseClient
  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  })
  const designPlan = designPlanOverride ?? await generateMockupDesignPlan({
    openrouter,
    model: plannerModel,
    projectName,
    mvpPlan,
    idea,
    intakeContext,
    productPlan,
  })
  logInfo("OpenRouterMockup", "single_option_started", {
    projectId,
    runId,
    model,
    plannerModel,
    optionLabel: label,
    reusedDesignPlan: Boolean(designPlanOverride),
    primaryPlatform: designPlan.primaryPlatform,
  })

  const option = await generateAndStoreOption({
    config,
    model,
    openrouter,
    storageSupabase,
    mvpPlan,
    projectName,
    projectId,
    runId,
    systemPrompt,
    userPrompt,
    designPlan,
    onOptionGenerated,
  })
  logInfo("OpenRouterMockup", "single_option_generated", {
    projectId,
    runId,
    model,
    optionLabel: option.label,
    storagePath: option.storagePath,
    width: option.width,
    height: option.height,
  })

  return {
    option,
    model,
    source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
    runId,
    designPlan,
  }
}

async function generateAndStoreOption({
  config,
  model,
  openrouter,
  storageSupabase,
  mvpPlan,
  projectName,
  projectId,
  runId,
  systemPrompt,
  userPrompt,
  designPlan,
  onOptionGenerated,
}: {
  config: typeof OPENROUTER_MOCKUP_OPTION_CONFIGS[number]
  model: string
  openrouter: OpenAI
  storageSupabase: ServerSupabaseClient
  mvpPlan: string
  projectName: string
  projectId: string
  runId: string
  systemPrompt?: string
  userPrompt?: string
  designPlan: MockupDesignPlan
  onOptionGenerated?: (payload: OpenRouterImageMockupOptionGeneratedPayload) => Promise<void>
}) {
  const direction = designPlan.directions.find((item) => item.label === config.label)
  if (!direction) {
    throw new Error(`Mockup design plan is missing direction ${config.label}`)
  }
  const storyboardPrompt = userPrompt || buildOpenRouterMockupImagePrompt({
    projectName,
    mvpPlan,
    title: direction.name,
    strategy: formatDirectionForPrompt(direction),
    label: config.label,
    designPlan,
  })
  const skeleton = getMockupStoryboardSkeleton(designPlan.primaryPlatform)
  const userMessageContent = buildOpenRouterMockupImageUserMessageContent({
    prompt: storyboardPrompt,
    platform: designPlan.primaryPlatform,
  })
  const frameScreens = getMockupStoryboardFrameScreens(designPlan)

  let response: OpenAI.Chat.Completions.ChatCompletion
  try {
    const imageConfig = getOpenRouterMockupImageConfig(designPlan.primaryPlatform)
    logInfo("OpenRouterMockup", "option_image_request_started", {
      projectId,
      runId,
      model,
      optionLabel: config.label,
      primaryPlatform: designPlan.primaryPlatform,
      imageConfig,
      promptLength: storyboardPrompt.length,
      skeletonAssetPath: skeleton.publicPath,
    })
    response = await openrouter.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt || OPENROUTER_IMAGE_MOCKUP_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userMessageContent,
        },
      ],
      modalities: ["image", "text"],
      max_completion_tokens: getOpenRouterMockupImageMaxTokens(),
      ...(imageConfig && { image_config: imageConfig }),
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & { modalities: string[]; image_config?: ReturnType<typeof getOpenRouterMockupImageConfig> }, {
      signal: AbortSignal.timeout(getOpenRouterMockupImageTimeoutMs()),
    })
  } catch (error) {
    logError("OpenRouterMockup", "option_image_request_failed", error, {
      projectId,
      runId,
      model,
      optionLabel: config.label,
      primaryPlatform: designPlan.primaryPlatform,
    })
    if (isAbortError(error)) {
      throw new Error(`OpenRouter image generation timed out for option ${config.label}`)
    }
    throw new Error(getOpenRouterProviderErrorMessage(error) || "OpenRouter image generation failed")
  }

  const choice = response.choices[0]
  const dataUrl = extractImageDataUrlFromOpenRouterChoice(choice)
  const parsedImage = parseImageDataUrl(dataUrl)
  assertMockupImageMatchesSkeletonAspect({
    platform: designPlan.primaryPlatform,
    width: parsedImage.width,
    height: parsedImage.height,
    optionLabel: config.label,
  })
  const storagePath = `${projectId}/${runId}/option-${config.label.toLowerCase()}-storyboard.${parsedImage.extension}`

  await uploadMockupImageWithRetry(storageSupabase, storagePath, parsedImage.buffer, parsedImage.contentType)
  logInfo("OpenRouterMockup", "option_image_uploaded", {
    projectId,
    runId,
    model,
    optionLabel: config.label,
    storagePath,
    contentType: parsedImage.contentType,
    width: parsedImage.width,
    height: parsedImage.height,
  })

  const generatedOption = {
    label: config.label,
    title: direction.name,
    imageUrl: buildMockupImageProxyUrl({ projectId, storagePath, draftRunId: runId }),
    storagePath,
    description: extractAssistantText(choice) || formatDirectionForPrompt(direction),
    contentType: parsedImage.contentType,
    screens: frameScreens.map((screen) => ({
      name: screen.name,
      caption: screen.caption,
      purpose: screen.purpose,
      happyPathState: screen.happyPathState,
    })),
    ...(parsedImage.width ? { width: parsedImage.width } : {}),
    ...(parsedImage.height ? { height: parsedImage.height } : {}),
    imagePromptCharCount: storyboardPrompt.length,
    skeletonAssetPath: skeleton.publicPath,
    skeletonLabel: skeleton.label,
  }

  try {
    await onOptionGenerated?.({
      option: generatedOption,
      model,
      runId,
      designPlan,
    })
  } catch (error) {
    logError("OpenRouterImageMockup", "option_progress_callback_failed", error, {
      projectId,
      runId,
      optionLabel: generatedOption.label,
      storagePath,
    })
  }

  return generatedOption
}

export function getOpenRouterMockupImageTimeoutMs() {
  const configured = Number(process.env.OPENROUTER_MOCKUP_IMAGE_TIMEOUT_MS)
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_IMAGE_TIMEOUT_MS
}

export function getOpenRouterMockupImageMaxTokens() {
  const configured = Number(process.env.OPENROUTER_MOCKUP_IMAGE_MAX_TOKENS)
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_IMAGE_MAX_TOKENS
}

export function getOpenRouterMockupPlannerMaxTokens() {
  const configured = Number(process.env.OPENROUTER_MOCKUP_PLANNER_MAX_TOKENS)
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_PLANNER_MAX_TOKENS
}

export function getOpenRouterMockupImageConfig(platform: MockupPrimaryPlatform = "desktop-web") {
  const aspectRatio = process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO || getMockupStoryboardSkeleton(platform).aspectRatio
  const imageSize = process.env.OPENROUTER_MOCKUP_IMAGE_SIZE

  return {
    aspect_ratio: aspectRatio,
    ...(imageSize && { image_size: imageSize }),
  }
}

export function assertMockupImageMatchesSkeletonAspect({
  platform,
  width,
  height,
  optionLabel,
}: {
  platform: MockupPrimaryPlatform
  width?: number
  height?: number
  optionLabel: string
}) {
  if (!width || !height) return

  const actualRatio = width / height
  const isDesktop = platform.includes("desktop")
  const minimumRatio = isDesktop ? 1.95 : 1.15
  const maximumRatio = isDesktop ? 2.7 : 1.7

  if (actualRatio < minimumRatio || actualRatio > maximumRatio) {
    const skeleton = getMockupStoryboardSkeleton(platform)
    throw new Error(
      `OpenRouter returned a ${width}x${height} image for option ${optionLabel}, but ${skeleton.label} requires a ${skeleton.aspectRatioDescription} canvas. Regenerate the mockup so the output matches the attached skeleton aspect ratio instead of saving a compressed image.`,
    )
  }
}

async function generateMockupDesignPlan({
  openrouter,
  model,
  projectName,
  mvpPlan,
  idea,
  intakeContext,
  productPlan,
}: {
  openrouter: OpenAI
  model: string
  projectName: string
  mvpPlan: string
  idea?: string
  intakeContext?: string
  productPlan?: string
}) {
  const plannerUserPrompt = buildMockupDesignPlanUserPrompt({
    projectName,
    idea,
    intakeContext,
    productPlan,
    mvpPlan,
  })
  let lastError: unknown

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await openrouter.chat.completions.create({
      model,
      messages: [
        { role: "system", content: MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT },
        {
          role: "user",
          content: attempt === 1
            ? plannerUserPrompt
            : `${plannerUserPrompt}\n\nYour previous response was invalid. Return corrected JSON only. Include complete targetUser, screens, and exactly three complete directions labeled A, B, and C.`,
        },
      ],
      max_completion_tokens: getOpenRouterMockupPlannerMaxTokens(),
    }, {
      signal: AbortSignal.timeout(getOpenRouterMockupImageTimeoutMs()),
    })

    const content = extractAssistantText(response.choices[0])
    if (!content) {
      lastError = new Error("OpenRouter did not return a mockup design plan")
      continue
    }

    try {
      return parseMockupDesignPlan(content)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OpenRouter did not return a valid mockup design plan")
}

function getOpenRouterProviderErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined
  }

  const record = error as Record<string, unknown>
  const nested = record.error
  const nestedMessage =
    nested && typeof nested === "object" && "message" in nested
      ? (nested as { message?: unknown }).message
      : undefined
  const message = typeof nestedMessage === "string"
    ? nestedMessage
    : typeof record.message === "string"
      ? record.message
      : undefined

  return sanitizeOpenRouterErrorMessage(message)
}

function sanitizeOpenRouterErrorMessage(message?: string) {
  if (!message) return undefined

  return message
    .replace(
      /https:\/\/openrouter\.ai\/workspaces\/[^/\s)]+\/keys\/[^\s)]+/g,
      "the OpenRouter key settings",
    )
    .replace(/key=[^&\s)]+/g, "key=[redacted]")
}

function isAbortError(error: unknown) {
  return error instanceof Error && (
    error.name === "AbortError" ||
    error.message.toLowerCase().includes("aborted")
  )
}

export const OPENROUTER_IMAGE_MOCKUP_SYSTEM_PROMPT =
  "You generate production-quality static UI mockup images for software products. Return an image and a concise design rationale. Do not call external APIs. Do not mention implementation details."

function getMockupStoryboardFrameScreens(designPlan?: MockupDesignPlan): MockupDesignPlanScreen[] {
  const fallbackScreens: MockupDesignPlanScreen[] = [
    {
      name: "Core Product Dashboard",
      flowStep: 1,
      caption: "Primary workspace",
      purpose: "Show the main happy-path product surface",
      happyPathState: "The product is populated with realistic user data",
      dataToShow: ["Primary navigation", "Status summary", "Next action"],
      priority: "P0",
    },
    {
      name: "Workflow Detail",
      flowStep: 2,
      caption: "Focused next step",
      purpose: "Show the most important follow-up state",
      happyPathState: "The user is completing the core workflow",
      dataToShow: ["Detailed content", "Decision support", "Confirmation action"],
      priority: "P0",
    },
  ]

  const screens = designPlan?.screens ?? []
  if (screens.length === 0) return fallbackScreens

  if (screens.length === 1) {
    const first = screens[0]
    return [
      first,
      {
        ...first,
        name: `${first.name} Detail`,
        flowStep: 2,
        caption: "Supporting detail",
        purpose: `Show the highest-value detail, drill-in, or next action for ${first.name}.`,
        dataToShow: first.dataToShow.length > 0
          ? first.dataToShow
          : ["Detailed product data", "Helpful status", "Next action"],
      },
    ]
  }

  if (screens.length === 2) return screens

  const extraScreenSummary = screens
    .slice(MOCKUP_STORYBOARD_FRAME_COUNT)
    .map((screen) => `${screen.name}: ${screen.happyPathState}`)
    .join("; ")
  const extraData = screens
    .slice(MOCKUP_STORYBOARD_FRAME_COUNT)
    .flatMap((screen) => screen.dataToShow)
    .slice(0, 6)

  return [
    screens[0],
    {
      ...screens[1],
      purpose: `${screens[1].purpose} Also fold in the most important later-flow detail instead of adding another frame: ${extraScreenSummary}.`,
      dataToShow: [...screens[1].dataToShow, ...extraData],
    },
  ]
}

function formatMockupStoryboardFrameScreens(screens: MockupDesignPlanScreen[]) {
  return screens.map((screen, index) => [
    `${index + 1}. ${screen.name}`,
    `Caption to place in the existing top label: ${index + 1}. ${screen.name}`,
    `Purpose: ${screen.purpose}`,
    `Happy-path state: ${screen.happyPathState}`,
    `Data to show inside the existing frame: ${screen.dataToShow.join(", ") || "realistic populated product data"}`,
  ].join("\n")).join("\n\n")
}

function formatFoldedStoryboardScreens(designPlan?: MockupDesignPlan) {
  const foldedScreens = designPlan?.screens.slice(MOCKUP_STORYBOARD_FRAME_COUNT) ?? []
  if (foldedScreens.length === 0) return ""

  return foldedScreens
    .map((screen) => `- ${screen.name}: fold the key state "${screen.happyPathState}" into frame 2 as supporting detail; do not create another frame.`)
    .join("\n")
}

export function buildOpenRouterMockupImagePrompt({
  projectName,
  mvpPlan: _mvpPlan,
  title,
  strategy,
  label,
  designPlan,
}: {
  projectName: string
  mvpPlan: string
  title: string
  strategy: string
  label: string
  designPlan?: MockupDesignPlan
}) {
  void _mvpPlan

  const platform = designPlan?.primaryPlatform ?? "desktop-web"
  const skeleton = getMockupStoryboardSkeleton(platform)
  const frameScreens = getMockupStoryboardFrameScreens(designPlan)
  const foldedScreens = formatFoldedStoryboardScreens(designPlan)
  const frameLabels = frameScreens.map((screen, index) => `"${index + 1}. ${screen.name}"`).join("\n- ")

  return `Edit the attached ${skeleton.label} in place for "${projectName}".

Internal direction metadata only:
- Direction label: ${label}
- Direction name: ${title}
- Do not render the direction label, direction name, or labels such as "Option A" anywhere in the image.

Design strategy:
${strategy}

Primary platform:
${platform}

Happy-path scenario:
${designPlan?.happyPathScenario ?? "A returning user is fully using the product and completing the core workflow."}

Target user:
${designPlan?.targetUser ?? "Primary MVP user"}

Replace the existing "Text here" labels with exactly:
- ${frameLabels}

Frame content to place inside the existing purple placeholders:
${formatMockupStoryboardFrameScreens(frameScreens)}
${foldedScreens ? `
Later-flow details to fold into the second frame:
${foldedScreens}` : ""}

Skeleton edit contract:
- Treat the attached image as the source image to edit, not as loose visual inspiration.
- Preserve ${skeleton.canvasDescription}.
- Return the edited image in the same ${skeleton.aspectRatioDescription} aspect ratio as the attached skeleton; do not return a square canvas or compressed version of the two frames.
- Preserve ${skeleton.preservedStructure}.
- Preserve ${skeleton.chromeDescription}.
- Do not move, resize, crop, redraw, duplicate, or remove either frame.
- Do not create a new storyboard layout, add a third frame, add a fourth frame, add arrows, or add side rationale cards.
- Replace only ${skeleton.interiorDescription} with the requested product UI.
- Keep the two-screen side-by-side structure exactly as shown in the attached skeleton.
- Replace each top placeholder caption once, in the existing caption locations, using the exact labels above.
- Keep all generated UI details inside the existing frame interiors; do not let content spill into the white canvas, frame borders, captions, shadows, or device/browser chrome.
- Use realistic UI labels and concise product copy derived from the planned screens and data.
- Show populated happy-path product states, not empty states.
- Make the product UI feel like a modern software interface, not a marketing landing page.
- Avoid unreadable filler text, watermarks, code snippets, and decorative content outside the two frame interiors.

Output requirements:
- Return one high-fidelity edited image based on the attached skeleton.
- Preserve the skeleton composition and canvas exactly while making the two product screens detailed enough for layout and hierarchy review.
- Return a concise rationale separately if the model includes text, but do not place that rationale in the image.`
}

/**
 * Builds the system + user prompts that would be sent to the image model for a given
 * option, WITHOUT making any API call. Used in "planner-only" mode so the caller can
 * take the prompt to an external tool (e.g. ChatGPT) instead of consuming OpenRouter credits.
 */
export function buildMockupImagePromptForOption({
  projectName,
  mvpPlan,
  label,
  systemPromptOverride,
  designPlan,
}: {
  projectName: string
  mvpPlan: string
  label: OpenRouterMockupOptionLabel
  systemPromptOverride?: string
  designPlan: MockupDesignPlan
}): {
  systemPrompt: string
  userPrompt: string
  skeletonAssetPath: string
  skeletonLabel: string
} {
  const config = OPENROUTER_MOCKUP_OPTION_CONFIGS.find((c) => c.label === label)
  if (!config) throw new Error(`Unsupported mockup option label: ${label}`)

  const direction = designPlan.directions.find((item) => item.label === config.label)
  if (!direction) {
    throw new Error(`Mockup design plan is missing direction ${config.label}`)
  }
  const userPrompt = buildOpenRouterMockupImagePrompt({
    projectName,
    mvpPlan,
    title: direction.name,
    strategy: formatDirectionForPrompt(direction),
    label: config.label,
    designPlan,
  })
  const skeleton = getMockupStoryboardSkeleton(designPlan.primaryPlatform)

  return {
    systemPrompt: systemPromptOverride || OPENROUTER_IMAGE_MOCKUP_SYSTEM_PROMPT,
    userPrompt,
    skeletonAssetPath: skeleton.publicPath,
    skeletonLabel: skeleton.label,
  }
}

function formatDirectionForPrompt(direction: MockupDesignDirection) {
  return [
    direction.layoutStrategy,
    `Navigation: ${direction.navigationPattern}`,
    `Density: ${direction.density}`,
    `Visual tone: ${direction.visualTone}`,
    `Reusable motifs: ${direction.reusableMotifs.join(", ") || "consistent product components"}`,
    `Consistency notes: ${direction.consistencyNotes}`,
  ].join("\n")
}

function extractAssistantText(choice: unknown) {
  const choiceRecord = asRecord(choice)
  const message = asRecord(choiceRecord?.message)
  const content = message?.content

  if (typeof content === "string") return content.trim()
  if (!Array.isArray(content)) return ""

  return content
    .map((part) => {
      const record = asRecord(part)
      return typeof record?.text === "string" ? record.text : ""
    })
    .join(" ")
    .trim()
}

/**
 * Uploads a mockup image buffer to Supabase Storage with up to 3 retry
 * attempts on transient network errors (e.g. "fetch failed" / ECONNRESET).
 *
 * The Supabase JS SDK wraps low-level fetch failures as StorageUnknownError
 * with message "fetch failed". These are almost always transient, so a short
 * wait + retry resolves them without surfacing noise to users.
 */
async function uploadMockupImageWithRetry(
  storageSupabase: ServerSupabaseClient,
  storagePath: string,
  buffer: Buffer,
  contentType: string,
  maxAttempts = 3,
): Promise<void> {
  const isNetworkError = (msg: string) =>
    msg === "fetch failed" || msg.startsWith("network") || msg.includes("ECONNRESET") || msg.includes("ENOTFOUND")

  let lastError: Error | undefined
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error: uploadError } = await storageSupabase.storage
      .from(MOCKUP_STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: false })

    if (!uploadError) return

    // On a transient network error, log with the underlying cause and retry.
    // On a hard error (e.g. bucket missing, MIME type rejected), fail fast.
    const isTransient = isNetworkError(uploadError.message)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cause = (uploadError as any).originalError?.cause
    const causeDetail = cause
      ? ` (${cause.code ?? cause.message ?? String(cause)})`
      : ""
    const fullMsg = `${uploadError.message}${causeDetail}`

    if (!isTransient || attempt === maxAttempts) {
      throw new Error(`Failed to upload generated mockup image: ${fullMsg}`)
    }

    logWarn("OpenRouterMockup", "storage_upload_retry", {
      storagePath,
      contentType,
      attempt,
      maxAttempts,
      retryDelayMs: attempt * 500,
    }, new Error(fullMsg))
    await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    lastError = new Error(fullMsg)
  }

  // Should be unreachable, but satisfies TS.
  throw lastError ?? new Error("Failed to upload generated mockup image: unknown error")
}

function readImageDimensions(buffer: Buffer, contentType: string) {
  if (contentType === "image/png" && buffer.length >= 24) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }

  return {}
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null
}

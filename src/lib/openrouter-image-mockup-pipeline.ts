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
  type OpenRouterImageMockupContent,
  type OpenRouterImageMockupOption,
} from "@/lib/openrouter-image-mockup-format"
import {
  MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT,
  buildMockupDesignPlanUserPrompt,
  parseMockupDesignPlan,
  type MockupDesignDirection,
  type MockupDesignPlan,
} from "@/lib/mockup-design-plan"
import type { Database, Json } from "@/types/database"

export const MOCKUP_STORAGE_BUCKET =
  process.env.SUPABASE_MOCKUP_STORAGE_BUCKET || "mockups"
const MAX_MOCKUP_IMAGE_BYTES = 10 * 1024 * 1024
const DEFAULT_IMAGE_TIMEOUT_MS = 285_000

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
  parseOpenRouterImageMockupContent,
}
export type { OpenRouterImageMockupContent, OpenRouterImageMockupOption }

export interface GenerateOpenRouterImageMockupInput {
  mvpPlan: string
  projectName: string
  projectId: string
  idea?: string
  intakeContext?: string
  productPlan?: string
  send?: (event: object) => void
}

export interface GenerateOpenRouterImageMockupResult {
  content: string
  model: string
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
}

export interface GenerateOpenRouterImageMockupOptionResult {
  option: OpenRouterImageMockupOption
  model: string
  source: typeof OPENROUTER_IMAGE_MOCKUP_SOURCE | typeof OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE
  runId: string
  designPlan: MockupDesignPlan
}

export function getOpenRouterMockupImageModel() {
  return process.env.OPENROUTER_MOCKUP_IMAGE_MODEL || DEFAULT_OPENROUTER_MOCKUP_IMAGE_MODEL
}

export function getOpenRouterMockupPlannerModel(imageModel = getOpenRouterMockupImageModel()) {
  return process.env.OPENROUTER_MOCKUP_PLANNER_MODEL ||
    process.env.OPENROUTER_ANALYSIS_MODEL ||
    imageModel
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
  idea,
  intakeContext,
  productPlan,
  send,
}: GenerateOpenRouterImageMockupInput): Promise<GenerateOpenRouterImageMockupResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not configured")
  }

  const model = getOpenRouterMockupImageModel()
  const plannerModel = getOpenRouterMockupPlannerModel(model)
  const runId = crypto.randomUUID()
  const generatedAt = new Date().toISOString()
  const storageSupabase = createServiceClient() as ServerSupabaseClient
  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  })

  send?.({ type: "stage", message: "Preparing image mockup prompts...", step: 1, totalSteps: 5 })

  const designPlan = await generateMockupDesignPlan({
    openrouter,
    model: plannerModel,
    projectName,
    mvpPlan,
    idea,
    intakeContext,
    productPlan,
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
      }),
    ),
  )

  send?.({ type: "stage", message: "Saving mockup images...", step: 5, totalSteps: 5 })

  const content: OpenRouterImageMockupContent = {
    type: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
    model,
    generatedAt,
    options: generatedOptions,
  }

  return {
    content: JSON.stringify(content),
    model,
    source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
    metadata: {
      source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
      model,
      storage_bucket: MOCKUP_STORAGE_BUCKET,
      storage_run_id: runId,
      generated_at: generatedAt,
      design_plan: designPlan as unknown as Json,
      planner_model: plannerModel,
      image_config: getOpenRouterMockupImageConfig() as unknown as Json,
    } satisfies Record<string, Json>,
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
}: GenerateOpenRouterImageMockupOptionInput): Promise<GenerateOpenRouterImageMockupOptionResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not configured")
  }

  const config = OPENROUTER_MOCKUP_OPTION_CONFIGS.find((optionConfig) => optionConfig.label === label)
  if (!config) {
    throw new Error(`Unsupported mockup option label: ${label}`)
  }

  const model = modelOverride || getOpenRouterMockupImageModel()
  const plannerModel = getOpenRouterMockupPlannerModel(model)
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
}) {
  const direction = designPlan.directions.find((item) => item.label === config.label)
  const storyboardPrompt = userPrompt || buildOpenRouterMockupImagePrompt({
    projectName,
    mvpPlan,
    title: direction?.name ?? config.title,
    strategy: direction ? formatDirectionForPrompt(direction) : config.strategy,
    label: config.label,
    designPlan,
  })

  let response: OpenAI.Chat.Completions.ChatCompletion
  try {
    response = await openrouter.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt || OPENROUTER_IMAGE_MOCKUP_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: storyboardPrompt,
        },
      ],
      modalities: ["image", "text"],
      image_config: getOpenRouterMockupImageConfig(),
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & { modalities: string[]; image_config: ReturnType<typeof getOpenRouterMockupImageConfig> }, {
      signal: AbortSignal.timeout(getOpenRouterMockupImageTimeoutMs()),
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`OpenRouter image generation timed out for option ${config.label}`)
    }
    throw error
  }

  const choice = response.choices[0]
  const dataUrl = extractImageDataUrlFromOpenRouterChoice(choice)
  const parsedImage = parseImageDataUrl(dataUrl)
  const storagePath = `${projectId}/${runId}/option-${config.label.toLowerCase()}-storyboard.${parsedImage.extension}`

  const { error: uploadError } = await storageSupabase.storage
    .from(MOCKUP_STORAGE_BUCKET)
    .upload(storagePath, parsedImage.buffer, {
      contentType: parsedImage.contentType,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Failed to upload generated mockup image: ${uploadError.message}`)
  }

  return {
    label: config.label,
    title: config.title,
    imageUrl: buildMockupImageProxyUrl({ projectId, storagePath }),
    storagePath,
    description: extractAssistantText(choice) || config.strategy,
    contentType: parsedImage.contentType,
    screens: designPlan.screens.map((screen) => ({
      name: screen.name,
      caption: screen.caption,
      purpose: screen.purpose,
      happyPathState: screen.happyPathState,
    })),
    ...(parsedImage.width ? { width: parsedImage.width } : {}),
    ...(parsedImage.height ? { height: parsedImage.height } : {}),
  }
}

export function getOpenRouterMockupImageTimeoutMs() {
  const configured = Number(process.env.OPENROUTER_MOCKUP_IMAGE_TIMEOUT_MS)
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_IMAGE_TIMEOUT_MS
}

export function getOpenRouterMockupImageConfig() {
  return {
    aspect_ratio: process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO || "21:9",
    image_size: process.env.OPENROUTER_MOCKUP_IMAGE_SIZE || "2K",
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
  const response = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildMockupDesignPlanUserPrompt({
          projectName,
          idea,
          intakeContext,
          productPlan,
          mvpPlan,
        }),
      },
    ],
  }, {
    signal: AbortSignal.timeout(getOpenRouterMockupImageTimeoutMs()),
  })

  const content = extractAssistantText(response.choices[0])
  if (!content) {
    throw new Error("OpenRouter did not return a mockup design plan")
  }

  return parseMockupDesignPlan(content)
}

function isAbortError(error: unknown) {
  return error instanceof Error && (
    error.name === "AbortError" ||
    error.message.toLowerCase().includes("aborted")
  )
}

export const OPENROUTER_IMAGE_MOCKUP_SYSTEM_PROMPT =
  "You generate production-quality static UI mockup images for software products. Return an image and a concise design rationale. Do not call external APIs. Do not mention implementation details."

const IPHONE_PRO_STORYBOARD_DEVICE = "iPhone 17 Pro"

function buildMobileStoryboardCompositionSpec({
  label,
  title,
  screenCount,
}: {
  label: string
  title: string
  screenCount: number | "2-4"
}) {
  return JSON.stringify({
    canvas: {
      aspectRatio: "21:9",
      background: "clean warm-white Figma canvas",
      composition: "horizontal product user-flow strip",
      lanes: [
        "optional left rationale cards",
        `${screenCount} equal phone screen lanes`,
        "optional right rationale cards",
      ],
      margins: "wide outer margins with clear gutters between all lanes",
    },
    deviceFrame: {
      model: IPHONE_PRO_STORYBOARD_DEVICE,
      orientation: "portrait only",
      statusBar: "consistent iOS status bar, 9:41 time, signal, wifi, battery",
      homeIndicator: "consistent iOS home indicator",
      widthRule: "all phone frames use the exact same width, scale, stroke, and corner radius",
      heightRule: "keep phone frames the same height when possible; if one screen needs more content, extend only vertically at the same width or show an internal scroll/continuation cue",
      prohibited: [
        "wide mobile devices",
        "landscape phones",
        "tablet-like phones",
        "mixed phone sizes",
        "browser chrome around phone screens",
      ],
    },
    captions: {
      placement: "fixed top caption row only",
      format: "1. Screen Name",
      source: "use the numbered fixed top labels from the Screens to show section; do not invent new screen headings",
      alignment: "center each caption directly above its phone lane",
      rules: [
        "one caption per screen",
        "render the planned fixed top labels verbatim",
        "do not add floating captions inside the canvas",
        "do not place captions inside side rationale cards",
        "do not place captions under the phones except the option label",
      ],
    },
    flow: {
      direction: "left to right",
      connectors: "simple neutral gray arrows between adjacent phone screens",
      connectorAlignment: "vertically centered between phone frames",
    },
    rationaleCards: {
      placement: "outside the phone lanes only, in the left and right side lanes",
      cardCount: "2-3 per used side lane",
      labels: ["Why it works", "Design rationale", "Emotional payoff"],
      style: "small rounded white cards with subtle border, compact icon, bold label, and short rationale",
      overlapRule: "never overlap phone frames, captions, arrows, or option label",
    },
    optionLabel: {
      text: `Option ${label} - ${title}`,
      placement: "bottom center below the phone row",
      style: "small muted italic label",
    },
    inScreenUi: {
      density: "compact but readable mobile product UI",
      state: "populated happy path with realistic data, decisions, confirmations, and next actions",
      hierarchy: "clear primary action, visible navigation, useful badges, and real product content",
    },
  }, null, 2)
}

export function buildOpenRouterMockupImagePrompt({
  projectName,
  mvpPlan,
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
  const platform = designPlan?.primaryPlatform ?? "desktop-web"
  const screenBrief = designPlan
    ? designPlan.screens.map((screen, index) => [
      `${index + 1}. ${screen.name} — ${screen.caption}`,
      `Purpose: ${screen.purpose}`,
      `Fixed top label to render: ${index + 1}. ${screen.name}`,
      `Caption intent, do not float elsewhere: ${screen.caption}`,
      `Happy-path state: ${screen.happyPathState}`,
      `Data to show: ${screen.dataToShow.join(", ") || "realistic populated product data"}`,
    ].join("\n")).join("\n\n")
    : "Choose 2-4 screens from the core happy path."
  const canvasInstruction = platform.includes("mobile")
    ? "Create a Figma-style user-flow canvas on a clean white background with phone screens shown side by side and short captions."
    : "Create a wide horizontal storyboard on a clean white background with desktop app screens shown side by side and short captions."
  const mobileCompositionSpec = platform.includes("mobile")
    ? buildMobileStoryboardCompositionSpec({
      label,
      title,
      screenCount: designPlan?.screens.length ?? "2-4",
    })
    : null

  return `Create option ${label}: ${title} for "${projectName}".

Design strategy:
${strategy}

Primary platform:
${platform}

Happy-path scenario:
${designPlan?.happyPathScenario ?? "A returning user is fully using the product and completing the core workflow."}

Persona:
${designPlan?.persona ?? "Primary MVP user"}

Screens to show in this one storyboard image:
${screenBrief}

First Version Plan context:
${mvpPlan.slice(0, 7000)}

Output requirements:
- Generate one high-fidelity static storyboard image that contains all selected screens.
- Use a wide 21:9 composition with enough resolution for screen-level inspection.
- ${canvasInstruction}
- Label each screen once, using the fixed caption placement described below.
- Show populated happy-path product states, not empty states.
- Use realistic UI labels and concise product copy derived from the First Version Plan.
- Make it feel like a modern SaaS/product interface, not a marketing landing page.
- Avoid unreadable filler text, fake browser chrome, watermarks, and code snippets.
- Include enough visual detail to evaluate layout, hierarchy, and product direction.
${mobileCompositionSpec ? `
Mobile storyboard composition JSON:
${mobileCompositionSpec}

Follow the JSON structure above exactly for mobile storyboards. The most important constraints are: every phone uses the same ${IPHONE_PRO_STORYBOARD_DEVICE} portrait width and scale, captions stay in one top row, arrows sit between screens, and rationale cards stay outside the phone lanes.` : ""}`
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

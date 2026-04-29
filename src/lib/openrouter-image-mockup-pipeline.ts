import OpenAI from "openai"
import type { SupabaseClient } from "@supabase/supabase-js"

import { createServiceClient } from "@/lib/supabase/service"
import {
  DEFAULT_OPENROUTER_MOCKUP_IMAGE_MODEL,
  OPENROUTER_IMAGE_MOCKUP_SOURCE,
  buildMockupImageProxyUrl,
  parseOpenRouterImageMockupContent,
  getStoragePathsFromOpenRouterImageMockupContent,
  type OpenRouterImageMockupContent,
  type OpenRouterImageMockupOption,
} from "@/lib/openrouter-image-mockup-format"
import type { Database, Json } from "@/types/database"

export const MOCKUP_STORAGE_BUCKET =
  process.env.SUPABASE_MOCKUP_STORAGE_BUCKET || "mockups"
const MAX_MOCKUP_IMAGE_BYTES = 10 * 1024 * 1024
const DEFAULT_IMAGE_TIMEOUT_MS = 285_000

const OPTION_CONFIGS = [
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

type ServerSupabaseClient = SupabaseClient<Database>

export {
  DEFAULT_OPENROUTER_MOCKUP_IMAGE_MODEL,
  OPENROUTER_IMAGE_MOCKUP_SOURCE,
  buildMockupImageProxyUrl,
  getStoragePathsFromOpenRouterImageMockupContent,
  parseOpenRouterImageMockupContent,
}
export type { OpenRouterImageMockupContent, OpenRouterImageMockupOption }

export interface GenerateOpenRouterImageMockupInput {
  mvpPlan: string
  projectName: string
  projectId: string
  send?: (event: object) => void
}

export interface GenerateOpenRouterImageMockupResult {
  content: string
  model: string
  source: typeof OPENROUTER_IMAGE_MOCKUP_SOURCE
  metadata: Database["public"]["Tables"]["mockups"]["Insert"]["metadata"]
}

export function getOpenRouterMockupImageModel() {
  return process.env.OPENROUTER_MOCKUP_IMAGE_MODEL || DEFAULT_OPENROUTER_MOCKUP_IMAGE_MODEL
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

  return { buffer, contentType, extension }
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
  send,
}: GenerateOpenRouterImageMockupInput): Promise<GenerateOpenRouterImageMockupResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not configured")
  }

  const model = getOpenRouterMockupImageModel()
  const runId = crypto.randomUUID()
  const generatedAt = new Date().toISOString()
  const storageSupabase = createServiceClient() as ServerSupabaseClient
  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  })

  send?.({ type: "stage", message: "Preparing image mockup prompts...", step: 1, totalSteps: 5 })

  send?.({ type: "stage", message: "Generating 3 visual directions...", step: 2, totalSteps: 5 })

  const generatedOptions = await Promise.all(
    OPTION_CONFIGS.map((config) =>
      generateAndStoreOption({
        config,
        model,
        openrouter,
        storageSupabase,
        mvpPlan,
        projectName,
        projectId,
        runId,
      }),
    ),
  )

  send?.({ type: "stage", message: "Saving mockup images...", step: 5, totalSteps: 5 })

  const content: OpenRouterImageMockupContent = {
    type: OPENROUTER_IMAGE_MOCKUP_SOURCE,
    model,
    generatedAt,
    options: generatedOptions,
  }

  return {
    content: JSON.stringify(content),
    model,
    source: OPENROUTER_IMAGE_MOCKUP_SOURCE,
    metadata: {
      source: OPENROUTER_IMAGE_MOCKUP_SOURCE,
      model,
      storage_bucket: MOCKUP_STORAGE_BUCKET,
      storage_run_id: runId,
      generated_at: generatedAt,
    } satisfies Record<string, Json>,
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
}: {
  config: typeof OPTION_CONFIGS[number]
  model: string
  openrouter: OpenAI
  storageSupabase: ServerSupabaseClient
  mvpPlan: string
  projectName: string
  projectId: string
  runId: string
}) {
  let response: OpenAI.Chat.Completions.ChatCompletion
  try {
    response = await openrouter.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You generate production-quality static UI mockup images for software products. Return an image and a concise design rationale. Do not call external APIs. Do not mention implementation details.",
        },
        {
          role: "user",
          content: buildImagePrompt({
            projectName,
            mvpPlan,
            title: config.title,
            strategy: config.strategy,
            label: config.label,
          }),
        },
      ],
      modalities: ["image", "text"],
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & { modalities: string[] }, {
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
  const storagePath = `${projectId}/${runId}/option-${config.label.toLowerCase()}.${parsedImage.extension}`

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
  }
}

function getOpenRouterMockupImageTimeoutMs() {
  const configured = Number(process.env.OPENROUTER_MOCKUP_IMAGE_TIMEOUT_MS)
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_IMAGE_TIMEOUT_MS
}

function isAbortError(error: unknown) {
  return error instanceof Error && (
    error.name === "AbortError" ||
    error.message.toLowerCase().includes("aborted")
  )
}

function buildImagePrompt({
  projectName,
  mvpPlan,
  title,
  strategy,
  label,
}: {
  projectName: string
  mvpPlan: string
  title: string
  strategy: string
  label: string
}) {
  return `Create option ${label}: ${title} for "${projectName}".

Design strategy:
${strategy}

MVP plan context:
${mvpPlan.slice(0, 7000)}

Output requirements:
- Generate a single high-fidelity static app mockup image.
- Use a desktop 16:9 composition unless the product clearly demands mobile-first.
- Show the most important screen a founder would review before building the MVP.
- Use realistic UI labels and concise product copy derived from the MVP plan.
- Make it feel like a modern SaaS/product interface, not a marketing landing page.
- Avoid unreadable filler text, fake browser chrome, watermarks, and code snippets.
- Include enough visual detail to evaluate layout, hierarchy, and product direction.`
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null
}

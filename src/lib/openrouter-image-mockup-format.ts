export const OPENROUTER_IMAGE_MOCKUP_SOURCE = "openrouter-image"
export const OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE = "openrouter-image-v2"
export const DEFAULT_OPENROUTER_MOCKUP_IMAGE_MODEL = "openai/gpt-5.4-image-2"

export interface OpenRouterImageMockupScreen {
  name: string
  caption: string
  purpose?: string
  happyPathState?: string
}

export interface OpenRouterImageMockupOption {
  label: string
  title: string
  imageUrl: string
  storagePath: string
  description: string
  contentType: string
  screens?: OpenRouterImageMockupScreen[]
  width?: number
  height?: number
  imagePromptCharCount?: number
}

export interface OpenRouterImageMockupContent {
  type: typeof OPENROUTER_IMAGE_MOCKUP_SOURCE | typeof OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE
  model: string
  generatedAt: string
  options: OpenRouterImageMockupOption[]
  designPlan?: unknown
}

export function buildMockupImageProxyUrl({
  projectId,
  storagePath,
  draftRunId,
}: {
  projectId: string
  storagePath: string
  draftRunId?: string
}) {
  const params = new URLSearchParams({ projectId, path: storagePath })
  if (draftRunId) params.set("draftRunId", draftRunId)
  return `/api/mockups/image?${params.toString()}`
}

const MOCKUP_RUN_ID_PATTERN = /^[A-Za-z0-9_-]{8,96}$/
const DRAFT_MOCKUP_OPTION_FILE_PATTERN = /^option-[abc]-storyboard\.(?:png|jpe?g|webp)$/i

export function isValidDraftMockupImagePath({
  projectId,
  storagePath,
  draftRunId,
}: {
  projectId: string
  storagePath: string
  draftRunId: string
}) {
  if (!projectId || projectId.includes("/") || projectId.includes("..")) return false
  if (!MOCKUP_RUN_ID_PATTERN.test(draftRunId)) return false
  if (storagePath.includes("..")) return false

  const parts = storagePath.split("/")
  if (parts.length !== 3) return false

  const [pathProjectId, pathRunId, fileName] = parts
  return (
    pathProjectId === projectId &&
    pathRunId === draftRunId &&
    DRAFT_MOCKUP_OPTION_FILE_PATTERN.test(fileName)
  )
}

export function parseOpenRouterImageMockupContent(content: string): OpenRouterImageMockupContent | null {
  try {
    const parsed = JSON.parse(content) as Partial<OpenRouterImageMockupContent>
    if (
      !isOpenRouterImageMockupSource(parsed?.type) ||
      typeof parsed.model !== "string" ||
      !Array.isArray(parsed.options) ||
      parsed.options.length === 0
    ) {
      return null
    }

    const options = parsed.options
      .map(normalizeOpenRouterImageMockupOption)
      .filter((option): option is OpenRouterImageMockupOption => Boolean(option))

    if (options.length === 0) return null

    return {
      type: parsed.type,
      model: parsed.model,
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : "",
      options,
      ...(parsed.designPlan ? { designPlan: parsed.designPlan } : {}),
    }
  } catch {
    return null
  }
}

function normalizeOpenRouterImageMockupOption(option: unknown): OpenRouterImageMockupOption | null {
  if (!option || typeof option !== "object") return null
  const record = option as Record<string, unknown>
  const label = typeof record.label === "string" ? record.label : ""
  const title = typeof record.title === "string" ? record.title : ""
  const imageUrl = typeof record.imageUrl === "string" ? record.imageUrl : ""
  const storagePath = typeof record.storagePath === "string" ? record.storagePath : ""
  const screens = parseStoryboardScreens(record.screens)
  const width = readPositiveNumber(record.width)
  const height = readPositiveNumber(record.height)

  // storagePath is only needed by workspace retry/recovery flows, which
  // validate it themselves; display only needs imageUrl. Legacy and exported
  // sample rows without storagePath should still render.
  if (!label || !title || !imageUrl) return null

  return {
    label,
    title,
    imageUrl,
    storagePath,
    description: typeof record.description === "string" ? record.description : "",
    contentType: typeof record.contentType === "string" ? record.contentType : "image/png",
    ...(screens ? { screens } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  }
}

function isOpenRouterImageMockupSource(value: unknown): value is OpenRouterImageMockupContent["type"] {
  return value === OPENROUTER_IMAGE_MOCKUP_SOURCE || value === OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE
}

function parseStoryboardScreens(value: unknown): OpenRouterImageMockupScreen[] | undefined {
  if (!Array.isArray(value)) return undefined

  const screens = value
    .map((screen) => {
      if (!screen || typeof screen !== "object") return null
      const record = screen as Record<string, unknown>
      const name = typeof record.name === "string" ? record.name.trim() : ""
      const caption = typeof record.caption === "string" ? record.caption.trim() : ""
      if (!name || !caption) return null
      return {
        name,
        caption,
        ...(typeof record.purpose === "string" && record.purpose.trim()
          ? { purpose: record.purpose.trim() }
          : {}),
        ...(typeof record.happyPathState === "string" && record.happyPathState.trim()
          ? { happyPathState: record.happyPathState.trim() }
          : {}),
      }
    })
    .filter((screen): screen is OpenRouterImageMockupScreen => Boolean(screen))

  return screens.length > 0 ? screens : undefined
}

function readPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined
}

export function getStoragePathsFromOpenRouterImageMockupContent(content: string) {
  return new Set(
    parseOpenRouterImageMockupContent(content)?.options.map((option) => option.storagePath) ?? [],
  )
}

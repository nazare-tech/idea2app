export const OPENROUTER_IMAGE_MOCKUP_SOURCE = "openrouter-image"
export const DEFAULT_OPENROUTER_MOCKUP_IMAGE_MODEL = "openai/gpt-5.4-image-2"

export interface OpenRouterImageMockupOption {
  label: string
  title: string
  imageUrl: string
  storagePath: string
  description: string
  contentType: string
}

export interface OpenRouterImageMockupContent {
  type: typeof OPENROUTER_IMAGE_MOCKUP_SOURCE
  model: string
  generatedAt: string
  options: OpenRouterImageMockupOption[]
}

export function buildMockupImageProxyUrl({
  projectId,
  storagePath,
}: {
  projectId: string
  storagePath: string
}) {
  const params = new URLSearchParams({ projectId, path: storagePath })
  return `/api/mockups/image?${params.toString()}`
}

export function parseOpenRouterImageMockupContent(content: string): OpenRouterImageMockupContent | null {
  try {
    const parsed = JSON.parse(content) as Partial<OpenRouterImageMockupContent>
    if (
      parsed?.type !== OPENROUTER_IMAGE_MOCKUP_SOURCE ||
      typeof parsed.model !== "string" ||
      !Array.isArray(parsed.options) ||
      parsed.options.length === 0
    ) {
      return null
    }

    const options = parsed.options.filter((option): option is OpenRouterImageMockupOption =>
      Boolean(
        option &&
        typeof option.label === "string" &&
        typeof option.title === "string" &&
        typeof option.imageUrl === "string" &&
        typeof option.storagePath === "string",
      ),
    )

    if (options.length === 0) return null

    return {
      type: OPENROUTER_IMAGE_MOCKUP_SOURCE,
      model: parsed.model,
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : "",
      options,
    }
  } catch {
    return null
  }
}

export function getStoragePathsFromOpenRouterImageMockupContent(content: string) {
  return new Set(
    parseOpenRouterImageMockupContent(content)?.options.map((option) => option.storagePath) ?? [],
  )
}

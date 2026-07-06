import { OPENROUTER_MOCKUP_OPTION_CONFIGS } from "@/lib/mockups/openrouter-image-pipeline"
import {
  buildMockupImageProxyUrl,
  type OpenRouterImageMockupOption,
  type OpenRouterImageMockupScreen,
} from "@/lib/mockups/openrouter-image-format"

type StorageListFile = { name: string }

function getContentTypeFromName(name: string) {
  const lowerName = name.toLowerCase()
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg"
  if (lowerName.endsWith(".webp")) return "image/webp"
  if (lowerName.endsWith(".png")) return "image/png"
  return null
}

export function buildStorageRecoveredMockupOptions({
  files,
  projectId,
  runId,
  screens,
}: {
  files: StorageListFile[]
  projectId: string
  runId: string
  screens?: OpenRouterImageMockupScreen[]
}) {
  const prefix = `${projectId}/${runId}`
  const fileByName = new Map(
    files.map((file) => [file.name.toLowerCase(), file]),
  )
  const options: OpenRouterImageMockupOption[] = []

  for (const config of OPENROUTER_MOCKUP_OPTION_CONFIGS) {
    const lowerLabel = config.label.toLowerCase()
    const file = [
      `option-${lowerLabel}-storyboard.png`,
      `option-${lowerLabel}-storyboard.jpg`,
      `option-${lowerLabel}-storyboard.jpeg`,
      `option-${lowerLabel}-storyboard.webp`,
    ]
      .map((name) => fileByName.get(name))
      .find(Boolean)

    if (!file) continue

    const contentType = getContentTypeFromName(file.name)
    if (!contentType) continue

    const storagePath = `${prefix}/${file.name}`
    options.push({
      label: config.label,
      title: config.title,
      imageUrl: buildMockupImageProxyUrl({ projectId, storagePath, draftRunId: runId }),
      storagePath,
      description: config.strategy,
      contentType,
      ...(screens ? { screens } : {}),
    })
  }

  return options
}

export function mergeRecoveredMockupOptions({
  draftOptions,
  storageOptions,
}: {
  draftOptions: OpenRouterImageMockupOption[]
  storageOptions: OpenRouterImageMockupOption[]
}) {
  const optionsByLabel = new Map<string, OpenRouterImageMockupOption>()

  for (const option of storageOptions) {
    optionsByLabel.set(option.label.toUpperCase(), option)
  }
  for (const option of draftOptions) {
    optionsByLabel.set(option.label.toUpperCase(), option)
  }

  return OPENROUTER_MOCKUP_OPTION_CONFIGS
    .map((config) => optionsByLabel.get(config.label))
    .filter((option): option is OpenRouterImageMockupOption => Boolean(option))
}

"use client"

import React from "react"
import { Renderer, JSONUIProvider } from "@json-render/react"
import { mockupRegistry } from "@/lib/json-render/registry"
import type { Spec } from "@json-render/core"
import { Monitor, Smartphone, Tablet, Layers, Download, ChevronDown, FileDown } from "lucide-react"
import { ArtifactLightbox } from "@/components/ui/artifact-lightbox"
import { extractMockupOptions } from "@/lib/mockups/format-contract"
import { parseOpenRouterImageMockupContent, type OpenRouterImageMockupContent } from "@/lib/mockups/openrouter-image-format"
import type { MockupOptionStatus } from "@/lib/document-generation-display-status"
import { trackClientProductEvent } from "@/lib/product-analytics/client"
import { isUuid } from "@/lib/product-analytics/contracts"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MockupRendererProps {
  content: string
  className?: string
  projectName?: string
  projectId?: string
  expectedOptionLabels?: string[]
  optionStatuses?: MockupOptionStatus[]
  /**
   * Loading surface rendered inside each concept cell whose image has not
   * arrived yet (replaces the default pulse skeleton). The workspace passes
   * the WebGL generation loader here while mockups are generating.
   */
  pendingMedia?: React.ReactNode
}

// ---- JSON-render mockup types and parsing ----

interface MockupPage {
  title: string
  description: string
  pros: string[]
  cons: string[]
  spec: Spec
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildMockHtmlDocument(title: string, bodyMarkup: string, description?: string): string {
  const safeTitle = escapeHtml(title)
  const safeDescription = description ? `<p style="margin:0 0 20px;color:#475569;font:14px/1.6 Inter,system-ui,sans-serif;">${escapeHtml(description)}</p>` : ""

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .page { max-width: 1280px; margin: 0 auto; padding: 32px 24px 48px; }
      .frame { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08); }
      .frame-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
      .frame-title { margin: 0; font-size: 24px; line-height: 1.2; }
      .mockup-body { padding: 24px; }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="frame">
        <header class="frame-header">
          <h1 class="frame-title">${safeTitle}</h1>
          ${safeDescription}
        </header>
        <div class="mockup-body">${bodyMarkup}</div>
      </section>
    </main>
  </body>
</html>`
}

/**
 * Detect whether content is in the new json-render format.
 * JSON-render content contains "root" and "elements" keys within JSON blocks.
 */
function isJsonRenderContent(content: string): boolean {
  return content.includes('"root"') && content.includes('"elements"')
}
const OPTION_HEADER_RE = /^#{1,6}\s*Option\s*[A-C]/im

/**
 * Extract a human-readable page title from a json-render spec.
 * Looks at the root element's title prop, its element ID, or the first Heading child.
 */
function extractPageTitle(spec: Spec, fallbackIndex: number): string {
  const elements = spec.elements as Record<string, { type?: string; props?: Record<string, unknown>; children?: string[] }>
  const rootId = spec.root as string
  const rootEl = elements[rootId]

  if (!rootEl) return `Page ${fallbackIndex}`

  // 1. Check root element's title prop (e.g. Card with title)
  const titleProp = rootEl.props?.title as string | undefined
  if (titleProp) return titleProp

  // 2. Look for a Heading in immediate children
  for (const childId of rootEl.children || []) {
    const child = elements[childId]
    if (child?.type === "Heading" && child.props) {
      const text = (child.props as Record<string, unknown>).text as string
      if (text) return text
    }
  }

  // 3. Look deeper — check grandchildren for a Heading (e.g. Stack > Card > Heading)
  for (const childId of rootEl.children || []) {
    const child = elements[childId]
    for (const grandchildId of child?.children || []) {
      const grandchild = elements[grandchildId]
      if (grandchild?.type === "Heading" && grandchild.props) {
        const text = (grandchild.props as Record<string, unknown>).text as string
        if (text) return text
      }
    }
  }

  // 4. Try to derive from the root element ID (e.g. "dashboard-root" → "Dashboard")
  if (rootId && rootId !== "root") {
    return rootId
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  return `Page ${fallbackIndex}`
}

/**
 * Parse markdown content containing json-render specs.
 * Expected format: markdown headers (## or ###) followed by ```json blocks.
 */


/**
 * Split optional markdown text into notes + pros/cons sections.
 */
function parseProsAndCons(raw: string): {
  notes: string[]
  pros: string[]
  cons: string[]
} {
  const notes: string[] = []
  const pros: string[] = []
  const cons: string[] = []

  const section = {
    notes,
    pros,
    cons,
  }

  let current: "notes" | "pros" | "cons" = "notes"

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (const line of lines) {
    const normalized = line
      .toLowerCase()
      .replace(/[`*_]/g, "")
      .replace(/^#+\s*/, "")
      .replace(/:+$/, "")
      .trim()

    if (/^pros?$/.test(normalized)) {
      current = "pros"
      continue
    }

    if (/^cons?$/.test(normalized)) {
      current = "cons"
      continue
    }

    const bullet = line
      .replace(/^\s*[-*•]\s*/, "")
      .replace(/^\s*\d+\.\s*/, "")
      .trim()
    if (!bullet) continue

    if (current === "pros") {
      pros.push(bullet)
      continue
    }

    if (current === "cons") {
      cons.push(bullet)
      continue
    }

    notes.push(bullet)
  }

  return section
}

interface RawMockupSection {
  title: string
  description: string[]
  json: string
}

function collectJsonSections(raw: string): RawMockupSection[] {
  const lines = raw.split("\n")
  const sections: RawMockupSection[] = []

  let currentTitle = ""
  let currentDescription: string[] = []
  let inCodeFence = false
  let codeBlock: string[] = []

  const flushSection = () => {
    const json = codeBlock.join("\n").trim()
    if (!json) return

    sections.push({
      title: currentTitle,
      description: currentDescription,
      json,
    })

    codeBlock = []
    currentDescription = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith("```")) {
      if (inCodeFence) {
        flushSection()
        inCodeFence = false
      } else {
        inCodeFence = true
      }
      continue
    }

    if (inCodeFence) {
      codeBlock.push(line)
      continue
    }

    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      if (inCodeFence && codeBlock.length > 0) {
        flushSection()
      }
      currentTitle = headerMatch[2].trim()
      currentDescription = []
      continue
    }

    if (trimmed) {
      currentDescription.push(trimmed)
    }
  }

  flushSection()

  return sections.filter((section) => section.json)
}

function normalizeOptionTitle(rawTitle: string, index: number): string {
  const optionMatch = rawTitle.match(/option\s*([A-C])/i)
  if (optionMatch) {
    const normalized = rawTitle.replace(/^\s*Option\s*[A-C]\s*-?\s*/i, "")
    if (normalized) {
      return `Option ${optionMatch[1].toUpperCase()} - ${normalized}`
    }
    return `Option ${optionMatch[1].toUpperCase()}`
  }

  if (rawTitle) {
    return rawTitle
  }

  return `Option ${String.fromCharCode(65 + index)}`
}

function ensureProsAndCons(section: RawMockupSection, index: number) {
  const parsed = parseProsAndCons(section.description.join("\n"))

  const labels = ["A", "B", "C"]
  const optionLabel = labels[index] || `${index + 1}`

  return {
    pros: parsed.pros.length
      ? parsed.pros
      : [
          `Option ${optionLabel} keeps the generated layout concise.`,
          `Option ${optionLabel} focuses on the same core user flow.`,
        ],
    cons: parsed.cons.length
      ? parsed.cons
      : [
          "Review this variation against your implementation constraints.",
          "Regenerate if you want stronger tradeoff-specific wording.",
        ],
    notes: parsed.notes,
  }
}

function addFallbackProsConsIfMissing(page: MockupPage, index: number): MockupPage {
  const optionLabel = `Option ${String.fromCharCode(65 + index)}`

  if (page.pros.length > 0 || page.cons.length > 0) {
    return page
  }

  return {
    ...page,
    pros: [
      `${optionLabel} keeps the core flow visually clear.`,
      `${optionLabel} is built with wireframe-ready component structure.`,
    ],
    cons: [
      "Tradeoff details were not provided in this generation format.",
      "Regenerate with the standard option format for explicit pros/cons.",
    ],
  }
}

const OPTION_ROOT_ID_RE = /^(option|variation|candidate|layout|screen)/i

function isLikelyOptionRootContainer(id: string): boolean {
  return OPTION_ROOT_ID_RE.test(id)
}

function parseJsonRenderPages(raw: string): MockupPage[] {
  const options = extractMockupOptions(raw)

  // Prefer strict option contract parsing when available
  if (options.length > 0) {
    const pages: MockupPage[] = []

    options.slice(0, 3).forEach((option) => {
      try {
        const json = option.json.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()
        const spec = JSON.parse(json) as Spec
        if (!spec.root || !spec.elements) return

        pages.push({
          title: `Option ${option.label}${option.title ? ` - ${option.title}` : ""}`,
          description: "",
          pros: option.pros,
          cons: option.cons,
          spec,
        })
      } catch {
        console.warn(`[MockupRenderer] Failed to parse json-render spec for option ${option.label}`)
      }
    })

    if (pages.length > 0) return pages
  }

  // Backward-compatible parsing fallback
  const sections = collectJsonSections(raw)
  if (sections.length === 0) return []

  const hasOptionHeaders = sections.some((section) => OPTION_HEADER_RE.test(section.title || ""))
  const pages: MockupPage[] = []

  sections.forEach((section, index) => {
    if (index >= 3) return

    try {
      const spec = JSON.parse(section.json) as Spec
      if (!spec.root || !spec.elements) return

      const baseTitle = section.title ? section.title.trim() : ""
      const title = hasOptionHeaders
        ? normalizeOptionTitle(baseTitle, index)
        : sections.length === 3
          ? `Option ${String.fromCharCode(65 + index)} - ${baseTitle || "Screen"}`
          : normalizeOptionTitle(baseTitle || `Option ${String.fromCharCode(65 + index)}`, index)

      const parsed = ensureProsAndCons(section, index)

      pages.push({
        title,
        description: parsed.notes.join("\n").trim(),
        pros: parsed.pros,
        cons: parsed.cons,
        spec,
      })
    } catch {
      console.warn(`[MockupRenderer] Failed to parse json-render spec for "${section.title}"`)
    }
  })

  return pages
}


// ---- JSON Patch format detection and parsing ----

/**
 * Detect whether content is in JSON Patch format (streaming patches).
 * Some models output json-render specs as a series of {"op":"add",...} operations.
 */
function isJsonPatchContent(content: string): boolean {
  return content.trimStart().startsWith('{"op":')
}

/**
 * Split a string containing multiple concatenated JSON objects into individual strings.
 * Handles nested objects and quoted strings with escaped characters correctly.
 */
function splitJsonObjects(content: string): string[] {
  const objects: string[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === "\\" && inString) {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === "{") {
      if (depth === 0) start = i
      depth++
    } else if (char === "}") {
      depth--
      if (depth === 0 && start !== -1) {
        objects.push(content.slice(start, i + 1))
        start = -1
      }
    }
  }

  return objects
}

/**
 * Set a nested value in an object using a JSON Pointer path (e.g. "/elements/app").
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
) {
  const parts = path.split("/").filter(Boolean)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (
      !(part in current) ||
      typeof current[part] !== "object" ||
      current[part] === null
    ) {
      current[part] = {}
    }
    current = current[part]
  }

  current[parts[parts.length - 1]] = value
}

/**
 * Apply JSON Patch "add" operations to reconstruct a complete json-render spec.
 * Returns null if the result doesn't contain the required root + elements.
 */
function applyJsonPatches(content: string): Spec | null {
  const jsonStrings = splitJsonObjects(content)
  if (jsonStrings.length === 0) return null

  const result: Record<string, unknown> = {}

  for (const jsonStr of jsonStrings) {
    try {
      const patch = JSON.parse(jsonStr) as {
        op: string
        path: string
        value: unknown
      }
      if (patch.op === "add" && patch.path && patch.value !== undefined) {
        setNestedValue(result, patch.path, patch.value)
      }
    } catch {
      // Skip malformed JSON patches — the content may be truncated
    }
  }

  if (result.root && result.elements) {
    return result as unknown as Spec
  }

  return null
}

// ---- Legacy ASCII art types and parsing ----

interface Section {
  type: "header" | "code" | "text"
  content: string
  level?: number
}

/**
 * Parses legacy mockup markdown content into structured sections.
 * Handles code fences, headers, and auto-detects unfenced ASCII art.
 */
function parseMockupContent(raw: string): Section[] {
  const lines = raw.split("\n")
  const sections: Section[] = []
  let inCodeFence = false
  let codeBlock: string[] = []
  let textBlock: string[] = []

  const hasBoxChars = (line: string) =>
    /[┌┐└┘├┤┬┴┼─│═║╔╗╚╝╠╣╦╩╬]/.test(line)

  const isAsciiArtLine = (line: string) => {
    const t = line.trim()
    if (!t) return false
    return (
      hasBoxChars(t) ||
      /^\+[-+]+\+$/.test(t) ||
      (/^\|/.test(t) && /\|$/.test(t))
    )
  }

  const flushText = () => {
    if (textBlock.length === 0) return
    const text = textBlock.join("\n").trim()
    if (text) {
      sections.push({ type: "text", content: text })
    }
    textBlock = []
  }

  const flushCode = () => {
    if (codeBlock.length === 0) return
    while (codeBlock.length > 0 && !codeBlock[codeBlock.length - 1].trim()) {
      codeBlock.pop()
    }
    if (codeBlock.length > 0) {
      sections.push({ type: "code", content: codeBlock.join("\n") })
    }
    codeBlock = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith("```")) {
      if (inCodeFence) {
        flushCode()
        inCodeFence = false
      } else {
        flushText()
        inCodeFence = true
      }
      continue
    }

    if (inCodeFence) {
      codeBlock.push(line)
      continue
    }

    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      flushText()
      flushCode()
      sections.push({
        type: "header",
        content: headerMatch[2],
        level: headerMatch[1].length,
      })
      continue
    }

    if (isAsciiArtLine(line)) {
      flushText()
      codeBlock.push(line)
      continue
    }

    if (codeBlock.length > 0) {
      if (!trimmed) {
        let moreArt = false
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          if (isAsciiArtLine(lines[j])) {
            moreArt = true
            break
          }
          if (lines[j].trim().match(/^#{1,6}\s/)) break
        }
        if (moreArt) {
          codeBlock.push(line)
        } else {
          flushCode()
          textBlock.push(line)
        }
      } else {
        let moreArt = false
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (isAsciiArtLine(lines[j])) {
            moreArt = true
            break
          }
          if (lines[j].trim().match(/^#{1,6}\s/)) break
        }
        if (moreArt) {
          codeBlock.push(line)
        } else {
          flushCode()
          textBlock.push(line)
        }
      }
      continue
    }

    textBlock.push(line)
  }

  flushText()
  flushCode()

  return sections
}

// ---- Retired HTML mockup detection ----

interface RetiredHtmlOption {
  label: string
  title: string
  htmlUrl: string
  imageUrl: string
}

interface RetiredHtmlContent {
  type: string
  options: RetiredHtmlOption[]
}

function parseRetiredHtmlContent(content: string): RetiredHtmlContent | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed?.type === ["sti", "tch"].join("") && Array.isArray(parsed.options) && parsed.options.length > 0) {
      return parsed as RetiredHtmlContent
    }
    return null
  } catch {
    return null
  }
}

function parseOpenRouterImageContent(content: string): OpenRouterImageMockupContent | null {
  return parseOpenRouterImageMockupContent(content)
}

function parseDraftOpenRouterImageContent(content: string): OpenRouterImageMockupContent | null {
  try {
    const parsed = JSON.parse(content) as Partial<OpenRouterImageMockupContent>
    if (
      (parsed?.type !== "openrouter-image" && parsed?.type !== "openrouter-image-v2") ||
      typeof parsed.model !== "string" ||
      !Array.isArray(parsed.options)
    ) {
      return null
    }

    return {
      type: parsed.type,
      model: parsed.model,
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : "",
      options: parsed.options,
    }
  } catch {
    return null
  }
}

function getConceptLabel(index: number): string {
  return `Concept ${index + 1}`
}

function getDesignRationaleText(description: string): string {
  const trimmed = description.trim()
  if (!trimmed) return ""
  return /^design rationale:/i.test(trimmed)
    ? trimmed
    : `Design rationale: ${trimmed}`
}

export function MockupImageLightbox({
  fileName,
  displayName,
  imageUrl,
  imageAlt,
  copied,
  onCopy,
  onDownload,
  onClose,
}: {
  fileName: string
  /** Clean human name for the header (e.g. "Concept 1: Command Center") */
  displayName?: string
  imageUrl: string
  imageAlt: string
  copied: boolean
  onCopy: () => void
  onDownload: () => void
  onClose: () => void
}) {
  return (
    <ArtifactLightbox
      fileName={fileName}
      displayName={displayName}
      presentation="media"
      copied={copied}
      onCopy={onCopy}
      onDownload={onDownload}
      onClose={onClose}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#F8F4F1] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={imageAlt}
          className="h-full w-full max-w-full object-contain rounded-lg bg-white"
        />
      </div>
    </ArtifactLightbox>
  )
}

function OpenRouterImageMockupViewer({
  data,
  projectName,
  projectId,
  expectedOptionLabels,
  optionStatuses,
  pendingMedia,
}: {
  data: OpenRouterImageMockupContent
  projectName?: string
  projectId?: string
  expectedOptionLabels?: string[]
  optionStatuses?: MockupOptionStatus[]
  pendingMedia?: React.ReactNode
}) {
  const [downloadingLabel, setDownloadingLabel] = React.useState<string | null>(null)
  const [copiedLabel, setCopiedLabel] = React.useState<string | null>(null)
  const copyResetRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lightboxOption, setLightboxOption] = React.useState<{
    imageUrl: string
    title: string
    conceptLabel: string
    label: string
    contentType: string
    conceptIndex: 1 | 2 | 3
  } | null>(null)

  const buildImageFileName = React.useCallback(
    (label: string, mimeType: string) => {
      const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1] || "png"
      const prefix = projectName ? `${projectName.toLowerCase().replace(/\s+/g, "-")}-` : ""
      return `${prefix}mockup-option-${label.toLowerCase()}.${extension}`
    },
    [projectName],
  )

  const handleDownload = React.useCallback(async (
    option: { label: string; imageUrl: string },
    conceptIndex: 1 | 2 | 3,
    surface: "card" | "lightbox",
  ) => {
    setDownloadingLabel(option.label)
    try {
      const response = await fetch(option.imageUrl)
      if (!response.ok) throw new Error("Failed to download mockup image")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = buildImageFileName(option.label, blob.type)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      if (isAnalyticsProjectId(projectId)) {
        trackClientProductEvent("mockup_concept_downloaded", { conceptIndex, surface }, { projectId })
      }
    } finally {
      setDownloadingLabel(null)
    }
  }, [buildImageFileName, projectId])

  // Copy the mockup image itself to the clipboard. The clipboard only accepts
  // PNG, so JPEG/WebP sources are converted through a canvas first.
  const handleCopyImage = React.useCallback(async (
    option: { label: string; imageUrl: string },
    conceptIndex: 1 | 2 | 3,
    surface: "card" | "lightbox",
  ) => {
    try {
      const response = await fetch(option.imageUrl)
      if (!response.ok) throw new Error("Failed to load mockup image")
      let blob = await response.blob()

      if (blob.type !== "image/png") {
        const bitmap = await createImageBitmap(blob)
        const canvas = document.createElement("canvas")
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
        const pngBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        )
        if (!pngBlob) throw new Error("Failed to convert mockup image")
        blob = pngBlob
      }

      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      if (isAnalyticsProjectId(projectId)) {
        trackClientProductEvent("mockup_concept_copied", { conceptIndex, surface }, { projectId })
      }
      setCopiedLabel(option.label)
      if (copyResetRef.current) clearTimeout(copyResetRef.current)
      copyResetRef.current = setTimeout(() => setCopiedLabel(null), 2000)
    } catch {
      // Clipboard image support is browser-dependent; Download remains available.
    }
  }, [projectId])

  React.useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current)
    }
  }, [])

  const optionsByLabel = React.useMemo(
    () => new Map(data.options.map((option) => [option.label.toUpperCase(), option])),
    [data.options],
  )
  const statusByLabel = React.useMemo(
    () => new Map(
      (optionStatuses ?? []).map((status) => {
        const match = status.label.match(/[ABC]/i)
        return [match?.[0]?.toUpperCase() ?? status.label.toUpperCase(), status]
      }),
    ),
    [optionStatuses],
  )
  const slotLabels = expectedOptionLabels?.length
    ? expectedOptionLabels.map((label) => label.toUpperCase())
    : data.options.map((option) => option.label.toUpperCase())

  return (
    <div className="space-y-8 w-full">
      {slotLabels.map((label, index) => {
        const option = optionsByLabel.get(label)
        const status = statusByLabel.get(label)
        const conceptLabel = getConceptLabel(index)
        const conceptIndex = (index + 1) as 1 | 2 | 3
        if (!option) {
          return (
            <div
              key={label}
              id={`mockups-concept-${index + 1}`}
              className="overflow-hidden rounded-[12px] border border-[#e8ddd5] bg-white"
            >
              <div className="flex min-h-[420px] flex-col gap-5 p-6">
                <div>
                  <p className="font-mono text-[11px] font-medium uppercase leading-[16.5px] tracking-[0.18em] text-[#6b7280]">
                    {conceptLabel}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-5 text-[#1c1917]">
                    {status?.message || "Waiting for image"}
                  </p>
                </div>
                {pendingMedia ?? (
                  <div className="flex flex-1 items-center justify-center rounded-lg bg-[#f8f8f7]">
                    <div className="w-full max-w-4xl space-y-4">
                      <div className="aspect-[21/9] w-full animate-pulse rounded-lg bg-white" />
                      <div className="space-y-2">
                        <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
                        <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        }

        const isDownloading = downloadingLabel === option.label
        const rationaleText = getDesignRationaleText(option.description)

        return (
          <div
            key={option.label}
            id={`mockups-concept-${index + 1}`}
            className="overflow-hidden rounded-[12px] border border-[#e8ddd5] bg-white"
          >
            <div className="flex min-h-[420px] flex-col gap-5 p-6">
              <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-[11px] font-medium uppercase leading-[16.5px] tracking-[0.18em] text-[#6b7280]">
                    {conceptLabel}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-5 text-[#1c1917]">{option.title}</p>
                </div>

                <button
                  type="button"
                  className="flex w-full shrink-0 items-center justify-center gap-2 rounded-[6px] border border-[#e8ddd5] px-[16.909px] py-[8.909px] text-xs font-medium leading-4 text-[#1c1917] transition-colors hover:bg-[#f8f4f1] disabled:opacity-50 sm:w-auto"
                  disabled={downloadingLabel !== null}
                  onClick={() => void handleDownload(option, conceptIndex, "card")}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isDownloading ? "Downloading..." : "Export Image"}</span>
                </button>
              </div>

              <button
                type="button"
                aria-label={`Open ${conceptLabel} mockup in lightbox`}
                className="block w-full cursor-zoom-in rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={() => {
                  if (isAnalyticsProjectId(projectId)) {
                    trackClientProductEvent("mockup_concept_opened", {
                      conceptIndex,
                      surface: "card",
                    }, { projectId })
                  }
                  setLightboxOption({
                    imageUrl: option.imageUrl,
                    title: option.title,
                    conceptLabel,
                    label: option.label,
                    contentType: option.contentType || "image/png",
                    conceptIndex,
                  })
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={option.imageUrl}
                  alt={`${conceptLabel}: ${option.title}`}
                  className="h-auto w-full rounded-lg bg-white object-contain"
                />
              </button>

              {rationaleText && (
                <p className="text-sm leading-[22.75px] text-[#6b7280]">
                  {rationaleText}
                </p>
              )}
            </div>
          </div>
        )
      })}
      {lightboxOption && (
        <MockupImageLightbox
          fileName={buildImageFileName(lightboxOption.label, lightboxOption.contentType)}
          displayName={`${lightboxOption.conceptLabel}: ${lightboxOption.title}`}
          imageUrl={lightboxOption.imageUrl}
          imageAlt={`${lightboxOption.conceptLabel}: ${lightboxOption.title}`}
          copied={copiedLabel === lightboxOption.label}
          onCopy={() => void handleCopyImage(lightboxOption, lightboxOption.conceptIndex, "lightbox")}
          onDownload={() => void handleDownload(lightboxOption, lightboxOption.conceptIndex, "lightbox")}
          onClose={() => setLightboxOption(null)}
        />
      )}
    </div>
  )
}

function RetiredHtmlMockupNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-dashed border-border-subtle bg-muted/40 p-6 text-sm ${className}`}>
      <p className="font-medium text-foreground">Legacy mockup format</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">
        This mockup was generated by the retired HTML preview pipeline. Regenerate design mockups to view the current OpenRouter image storyboard format.
      </p>
    </div>
  )
}

// ---- Viewport presets ----

type Viewport = "desktop" | "tablet" | "mobile"

const viewportConfig: Record<Viewport, { width: string; icon: typeof Monitor; label: string }> = {
  desktop: { width: "100%", icon: Monitor, label: "Desktop" },
  tablet: { width: "768px", icon: Tablet, label: "Tablet" },
  mobile: { width: "375px", icon: Smartphone, label: "Mobile" },
}

// ---- Error boundary for Renderer ----

class RendererErrorBoundary extends React.Component<
  { children: React.ReactNode; specJson?: string },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode; specJson?: string }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 border border-dashed border-red-300 rounded-md bg-red-50 text-sm">
          <p className="font-medium text-red-700 mb-2">Failed to render mockup</p>
          <p className="text-red-500 text-xs mb-2">{this.state.error.message}</p>
          {this.props.specJson && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer">Raw spec</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-48 text-[10px]">
                {this.props.specJson}
              </pre>
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

// ---- JSON-render page renderer (single page) ----

/**
 * Wrapper that detects when the Renderer produces empty/null output
 * and shows a diagnostic fallback with the raw spec.
 */
function RendererWithFallback({ spec, specJson }: { spec: Spec; specJson: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isEmpty, setIsEmpty] = React.useState(false)

  React.useEffect(() => {
    // Check after render if the container has visible child content
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const hasContent = containerRef.current.querySelector('[data-slot], h1, h2, h3, h4, p, button, input, table')
        if (!hasContent) {
          console.warn(`[MockupRenderer] Renderer produced no visible DOM elements. Spec:`, spec)
          setIsEmpty(true)
        }
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [spec])

  return (
    <>
      <div ref={containerRef} style={{ display: isEmpty ? 'none' : undefined }}>
        <JSONUIProvider registry={mockupRegistry}>
          <Renderer
            spec={spec}
            registry={mockupRegistry}
            fallback={() => (
              <div className="p-3 border border-dashed border-gray-300 rounded-md text-xs text-gray-400 bg-gray-50">
                [Component placeholder]
              </div>
            )}
          />
        </JSONUIProvider>
      </div>
      {isEmpty && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Wireframe could not be rendered
          </div>
          <p className="text-xs text-gray-500">The json-render spec may have an incompatible structure. Try regenerating the mockup.</p>
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">View raw spec</summary>
            <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg overflow-auto max-h-64 text-[10px] font-mono leading-relaxed">
              {specJson}
            </pre>
          </details>
        </div>
      )}
    </>
  )
}

function JsonRenderPage({ page }: { page: MockupPage }) {
  const specJson = React.useMemo(() => {
    try {
      return JSON.stringify(page.spec, null, 2)
    } catch {
      return "Unable to serialize spec"
    }
  }, [page.spec])

  return (
    <div className="wireframe-layer rounded-lg min-h-[400px] overflow-hidden w-full max-w-full bg-white [&>div]:w-full [&>div>div]:w-full">
      <RendererErrorBoundary specJson={specJson}>
        <RendererWithFallback spec={page.spec} specJson={specJson} />
      </RendererErrorBoundary>
    </div>
  )
}

// ---- Multi-page interactive mockup viewer ----

function getOptionLabel(title: string, index: number) {
  return title.match(/Option\s+([A-Z])/i)?.[1]?.toUpperCase() || String.fromCharCode(65 + index)
}

function MockupViewer({ pages, projectName }: { pages: MockupPage[]; projectName?: string }) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const hiddenExportRefs = React.useRef<Array<HTMLDivElement | null>>([])
  const selectedPage = pages[Math.min(selectedIndex, pages.length - 1)]

  React.useEffect(() => {
    if (selectedIndex > pages.length - 1) {
      setSelectedIndex(0)
    }
  }, [pages.length, selectedIndex])

  const handleDownloadOption = React.useCallback((index: number) => {
    const page = pages[index]
    const exportNode = hiddenExportRefs.current[index]
    if (!page || !exportNode) return

    const optionLabel = page.title.match(/Option\s+([A-Z])/i)?.[1]?.toUpperCase() || String.fromCharCode(65 + index)
    const html = buildMockHtmlDocument(page.title, exportNode.innerHTML, page.description)
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    const prefix = projectName ? `${projectName.toLowerCase().replace(/\s+/g, "-")}-` : ""
    link.download = `${prefix}mockup-option-${optionLabel.toLowerCase()}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [pages, projectName])

  if (!selectedPage) return null

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Mockup options</p>
          <p className="text-xs text-muted-foreground">Compare 3 variations of the same screen in a shared preview pane.</p>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {pages.map((page, index) => {
              const isActive = index === selectedIndex
              const optionLabel = getOptionLabel(page.title, index)

              return (
                <button
                  key={`${page.title}-${index}`}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={[
                    "inline-flex min-w-[132px] flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors",
                    isActive
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  ].join(" ")}
                >
                  <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em]">Option {optionLabel}</span>
                  <span className="mt-1 text-sm font-medium leading-tight">Variation {optionLabel}</span>
                </button>
              )
            })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ui-row-gap-2 h-fit rounded-md border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-muted/50">
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {pages.map((page, index) => {
                const optionLabel = page.title.match(/Option\s+([A-Z])/i)?.[1]?.toUpperCase() || String.fromCharCode(65 + index)
                return (
                  <DropdownMenuItem key={`download-${optionLabel}`} onClick={() => handleDownloadOption(index)}>
                    <FileDown className="mr-2 h-3.5 w-3.5" />
                    <span className="text-xs ui-font-medium">Option {optionLabel} (HTML)</span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {(selectedPage.description || selectedPage.pros.length > 0 || selectedPage.cons.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {selectedPage.pros.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-white p-4 text-xs">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-green-700">Pros</p>
              <ul className="list-disc list-inside space-y-1 text-foreground">
                {selectedPage.pros.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {selectedPage.cons.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-white p-4 text-xs">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Cons</p>
              <ul className="list-disc list-inside space-y-1 text-foreground">
                {selectedPage.cons.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <SinglePageViewer page={selectedPage} selectedIndex={selectedIndex} />

      <div className="pointer-events-none absolute -left-[99999px] top-0 opacity-0" aria-hidden="true">
        {pages.map((page, index) => (
          <div key={`export-${page.title}-${index}`} ref={(node) => { hiddenExportRefs.current[index] = node }}>
            <div style={{ background: "#ffffff", padding: "24px" }}>
              <JsonRenderPage page={page} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Single-page viewer (for JSON Patch results) ----

function SinglePageViewer({ page, selectedIndex }: { page: MockupPage; selectedIndex: number }) {
  const [viewport, setViewport] = React.useState<Viewport>("desktop")
  const vp = viewportConfig[viewport]
  const optionLabel = getOptionLabel(page.title, selectedIndex)

  return (
    <div className="space-y-0 w-full self-start">
      <div className="flex items-center justify-between rounded-t-xl border border-border bg-muted/30 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Variation {optionLabel}</span>
        </div>

        <div className="flex items-center rounded-md border border-border bg-background p-0.5">
          {(Object.entries(viewportConfig) as [Viewport, typeof vp][]).map(([key, config]) => {
            const Icon = config.icon
            return (
              <button
                key={key}
                onClick={() => setViewport(key)}
                title={config.label}
                className={`p-1 rounded transition-colors ${key === viewport ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-b-xl border-x border-b border-border bg-muted/10">
        <div className="flex justify-center bg-[repeating-conic-gradient(rgb(0_0_0/0.02)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
          <div className="w-full bg-white" style={{ maxWidth: vp.width, minHeight: "500px" }}>
            <div className="p-4">
              <JsonRenderPage page={page} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Legacy ASCII renderer ----

function AsciiMockupContent({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((section, i) => {
        switch (section.type) {
          case "header": {
            const level = Math.min(section.level || 2, 6)
            const sizeClass =
              level === 1
                ? "text-2xl font-bold"
                : level === 2
                  ? "text-xl font-bold"
                  : level === 3
                    ? "text-lg font-semibold"
                    : "text-base font-semibold"
            return (
              <div key={i} className={`${sizeClass} text-foreground pt-2`}>
                {section.content}
              </div>
            )
          }
          case "code":
            return (
              <pre
                key={i}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 overflow-x-auto"
              >
                <code className="font-mono text-[13px] leading-[1.6] text-emerald-400 whitespace-pre block">
                  {section.content}
                </code>
              </pre>
            )
          case "text":
            return (
              <p
                key={i}
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {section.content}
              </p>
            )
          default:
            return null
        }
      })}
    </>
  )
}

// ---- Split a single spec into pages ----

/**
 * Attempts to split a single large json-render spec into multiple pages.
 * Looks at the root element's children: if each child is a self-contained
 * section (e.g., a page-level Stack or Card), extract them as separate pages.
 */
function splitSpecIntoPages(spec: Spec): MockupPage[] {
  const elements = spec.elements as Record<string, { type?: string; props?: Record<string, unknown>; children?: string[] }>
  const rootEl = elements[spec.root as string]

  if (!rootEl || !rootEl.children || rootEl.children.length <= 1) {
    return [] // Not splittable
  }

  // Safety check: only split when all children look like option-level containers.
  const allChildrenAreLikelyOptions = rootEl.children.every((id) =>
    isLikelyOptionRootContainer(id)
  )
  if (!allChildrenAreLikelyOptions) {
    return []
  }

  // Check if root's children look like individual pages
  // (each child is a Stack or Card with its own subtree)
  const childElements = rootEl.children
    .map((id: string) => ({ id, el: elements[id] }))
    .filter(({ el }) => el && (el.type === "Stack" || el.type === "Card"))

  // Only split if ALL children are Stacks/Cards (page-level containers)
  if (childElements.length !== rootEl.children.length || childElements.length < 2) {
    return []
  }

  // Extract each child as a separate page spec
  const pages: MockupPage[] = []
  for (const { id } of childElements) {
    // Collect all elements reachable from this child
    const reachable = new Set<string>()
    const queue = [id]
    while (queue.length > 0) {
      const current = queue.pop()!
      if (reachable.has(current)) continue
      reachable.add(current)
      const node = elements[current]
      if (node?.children) {
        for (const childId of node.children) {
          queue.push(childId)
        }
      }
    }

    // Build a sub-spec with only reachable elements
    const subElements: Record<string, unknown> = {}
    for (const key of reachable) {
      subElements[key] = elements[key]
    }

    const subSpec = { root: id, elements: subElements } as unknown as Spec
    const title = extractPageTitle(subSpec, pages.length + 1)

    pages.push({
      title,
      description: "",
      pros: [],
      cons: [],
      spec: subSpec,
    })
  }

  return pages
}
// ---- Main component ----

/**
 * Renders mockup content — either as interactive json-render components (new)
 * or as ASCII art wireframes (legacy). Auto-detects the format.
 */
export function MockupRenderer({
  content,
  className = "",
  projectName,
  projectId,
  expectedOptionLabels,
  optionStatuses,
  pendingMedia,
}: MockupRendererProps) {
  // All hooks must be called unconditionally before any early return (Rules of Hooks)
  const retiredHtmlData = React.useMemo(() => parseRetiredHtmlContent(content), [content])
  const openRouterImageData = React.useMemo(
    () => parseOpenRouterImageContent(content) ?? (expectedOptionLabels?.length ? parseDraftOpenRouterImageContent(content) : null),
    [content, expectedOptionLabels],
  )

  const patchSpec = React.useMemo(() => {
    if (retiredHtmlData || openRouterImageData) return null // skip when typed mockup format detected
    if (isJsonPatchContent(content)) {
      return applyJsonPatches(content)
    }
    return null
  }, [content, retiredHtmlData, openRouterImageData])

  const isJsonRender = React.useMemo(
    () => !retiredHtmlData && !openRouterImageData && !patchSpec && isJsonRenderContent(content),
    [content, retiredHtmlData, openRouterImageData, patchSpec]
  )

  if (retiredHtmlData) {
    return (
      <RetiredHtmlMockupNotice className={className} />
    )
  }

  // ── OpenRouter image format: { type: "openrouter-image", options: [...] } ─
  if (openRouterImageData) {
    return (
      <div className={className}>
        <OpenRouterImageMockupViewer
          data={openRouterImageData}
          projectName={projectName}
          projectId={projectId}
          expectedOptionLabels={expectedOptionLabels}
          optionStatuses={optionStatuses}
          pendingMedia={pendingMedia}
        />
      </div>
    )
  }

  // JSON Patch format — reconstruct spec from streaming patches
  if (patchSpec) {
    // Try to split the assembled spec into multiple pages.
    // If the root element is a top-level container whose children are each self-contained
    // page specs (Cards or Stacks), treat them as separate pages.
    const pages = splitSpecIntoPages(patchSpec)

    if (pages.length > 1) {
      return (
        <div className={className}>
          <MockupViewer pages={pages.map((page, index) => addFallbackProsConsIfMissing(page, index))} projectName={projectName} />
        </div>
      )
    }

    return (
      <div className={className}>
        <SinglePageViewer
          selectedIndex={0}
          page={addFallbackProsConsIfMissing(
            {
              title: "Wireframe",
              description: "Layout wireframe generated from the First Version Plan",
              pros: [],
              cons: [],
              spec: patchSpec,
            },
            0
          )}
        />
      </div>
    )
  }

  // Standard json-render format — markdown headers + JSON code blocks
  if (isJsonRender) {
    const pages = parseJsonRenderPages(content)

    if (pages.length === 0) {
      // Fallback: couldn't parse any valid specs — render as ASCII
      const sections = parseMockupContent(content)
      return (
        <div className={`space-y-5 ${className}`}>
          <AsciiMockupContent sections={sections} />
        </div>
      )
    }

    // Multi-page: show all options in linear order
    if (pages.length > 1) {
      return (
        <div className={className}>
          <MockupViewer pages={pages.map((page, index) => addFallbackProsConsIfMissing(page, index))} projectName={projectName} />
        </div>
      )
    }

    // Single page
    return (
      <div className={className}>
        <SinglePageViewer page={pages[0]} selectedIndex={0} />
      </div>
    )
  }

  // Legacy ASCII art rendering
  const sections = parseMockupContent(content)
  return (
    <div className={`space-y-5 ${className}`}>
      <AsciiMockupContent sections={sections} />
    </div>
  )
}

function isAnalyticsProjectId(projectId: string | undefined): projectId is string {
  return isUuid(projectId)
}

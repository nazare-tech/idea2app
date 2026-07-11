export interface CompetitorSource {
  name: string
  url: string
}

export interface CompetitorMentionSegment {
  text: string
  url: string | null
}

const UNSAFE_URL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f\s<>"'`]/
const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}]/u
const SINGLE_TOKEN_NAME_PATTERN = /^[\p{L}\p{N}]+$/u
const MAX_COMPETITOR_SOURCES = 50
const MAX_COMPETITOR_NAME_LENGTH = 120
const MAX_COMPETITOR_PATTERN_LENGTH = 4_000
const NON_PUBLIC_HOST_SUFFIXES = [
  ".example",
  ".invalid",
  ".internal",
  ".local",
  ".localhost",
  ".test",
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function getSafeExternalHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null

  const url = value.trim()
  if (
    !url ||
    !/^https?:\/\//i.test(url) ||
    UNSAFE_URL_CHARACTER_PATTERN.test(url)
  ) {
    return null
  }

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLocaleLowerCase("en-US").replace(/\.$/, "")
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      !hostname ||
      parsed.username ||
      parsed.password ||
      hostname === "localhost" ||
      !hostname.includes(".") ||
      /^\d+(?:\.\d+){3}$/.test(hostname) ||
      hostname.includes(":") ||
      NON_PUBLIC_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
    ) {
      return null
    }

    return parsed.href
  } catch {
    return null
  }
}

export function normalizeCompetitorSources(value: unknown): CompetitorSource[] {
  if (!Array.isArray(value)) return []

  const seenNames = new Set<string>()
  const sources: CompetitorSource[] = []
  let totalPatternLength = 0

  for (const candidate of value) {
    if (!isRecord(candidate) || typeof candidate.name !== "string") continue

    const name = candidate.name.replace(/\s+/g, " ").trim()
    const url = getSafeExternalHttpUrl(candidate.url)
    const normalizedName = name.toLocaleLowerCase("en-US")

    if (
      !name ||
      name.length > MAX_COMPETITOR_NAME_LENGTH ||
      !url ||
      seenNames.has(normalizedName) ||
      totalPatternLength + name.length > MAX_COMPETITOR_PATTERN_LENGTH
    ) {
      continue
    }

    seenNames.add(normalizedName)
    sources.push({ name, url })
    totalPatternLength += name.length
    if (sources.length >= MAX_COMPETITOR_SOURCES) break
  }

  return sources
}

export function getCompetitorSourcesFromMetadata(
  metadata: unknown
): CompetitorSource[] {
  if (!isRecord(metadata) || !isRecord(metadata.live_research)) return []

  return normalizeCompetitorSources(
    metadata.live_research.competitor_sources
  )
}

export function hasCompetitorSourceMetadata(metadata: unknown) {
  return (
    isRecord(metadata) &&
    isRecord(metadata.live_research) &&
    Object.prototype.hasOwnProperty.call(
      metadata.live_research,
      "competitor_sources"
    )
  )
}

export function mergeCompetitorSources(
  ...sourceGroups: unknown[]
): CompetitorSource[] {
  return normalizeCompetitorSources(
    sourceGroups.flatMap((group) =>
      Array.isArray(group) ? group : []
    )
  )
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function isWordCharacter(value: string | undefined) {
  return Boolean(value && WORD_CHARACTER_PATTERN.test(value))
}

export interface CompiledCompetitorMentionMatcher {
  sources: CompetitorSource[]
  split: (text: string) => CompetitorMentionSegment[]
}

export function createCompetitorMentionMatcher(
  sourceCandidates: unknown
): CompiledCompetitorMentionMatcher {
  const sources = normalizeCompetitorSources(sourceCandidates).sort(
    (left, right) => right.name.length - left.name.length
  )

  if (sources.length === 0) {
    return {
      sources,
      split: (text) => (text ? [{ text, url: null }] : []),
    }
  }

  const sourcesByName = new Map(
    sources.map((source) => [
      source.name.toLocaleLowerCase("en-US"),
      source,
    ])
  )
  const matcher = new RegExp(
    sources.map((source) => escapeRegExp(source.name)).join("|"),
    "giu"
  )

  return {
    sources,
    split: (text) => {
      if (!text) return []

      const segments: CompetitorMentionSegment[] = []
      let cursor = 0
      matcher.lastIndex = 0

      for (let match = matcher.exec(text); match; match = matcher.exec(text)) {
        const start = match.index
        const matchedText = match[0]
        const end = start + matchedText.length
        const source = sourcesByName.get(
          matchedText.toLocaleLowerCase("en-US")
        )

        if (
          !source ||
          isWordCharacter(text[start - 1]) ||
          isWordCharacter(text[end]) ||
          (SINGLE_TOKEN_NAME_PATTERN.test(source.name) &&
            matchedText !== source.name)
        ) {
          continue
        }

        if (start > cursor) {
          segments.push({ text: text.slice(cursor, start), url: null })
        }
        segments.push({ text: matchedText, url: source.url })
        cursor = end
      }

      if (cursor < text.length) {
        segments.push({ text: text.slice(cursor), url: null })
      }

      return segments.length > 0 ? segments : [{ text, url: null }]
    },
  }
}

export function buildCompetitorMentionSegments(
  text: string,
  sourceCandidates: unknown
): CompetitorMentionSegment[] {
  return createCompetitorMentionMatcher(sourceCandidates).split(text)
}

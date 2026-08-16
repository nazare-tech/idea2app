import { createHash } from "node:crypto"

import type { ResearchItem, ResearchSource } from "./types"

const MAX_JSON_CHARS = 1_000_000
const MAX_RAW_ITEMS = 100_000
const MAX_AVAILABLE_SOURCES = 24
const MAX_ITEMS = 500
const MAX_MISSING_SOURCES = 12
const MAX_TAGS = 8

const SOURCES = new Set<ResearchSource>(["reddit", "x", "youtube", "hackernews", "github", "web"])
const QUALITIES = new Set<ResearchItem["quality"]>(["strong", "supporting", "thin"])

const FIELD_LIMITS = {
  sourceLabel: 120,
  title: 240,
  excerpt: 1_200,
  url: 2_048,
  publishedAt: 64,
  engagementLabel: 120,
  tag: 48,
  missingSource: 80,
  dateRange: 120,
} as const

const TRACKING_PARAMETERS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "ref", "ref_src"])

export interface Last30DaysImportResult {
  rawItemCount: number
  availableSources: number
  missingSources: string[]
  items: ResearchItem[]
  warnings: string[]
  dateRange?: string
}

export class InvalidLast30DaysImportError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function boundedInteger(value: unknown, name: string, maximum: number) {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > maximum) {
    throw new InvalidLast30DaysImportError(`${name} must be an integer from 0 to ${maximum}.`)
  }
  return value as number
}

function cleanText(value: unknown, maximum: number) {
  if (typeof value !== "string") return null
  const clean = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim()
  if (!clean) return null
  return { value: clean.slice(0, maximum), truncated: clean.length > maximum }
}

function canonicalHttpsUrl(value: unknown) {
  const clean = cleanText(value, FIELD_LIMITS.url)
  if (!clean || clean.truncated) return null
  try {
    const url = new URL(clean.value)
    if (url.protocol !== "https:" || url.username || url.password) return null
    url.hash = ""
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
        url.searchParams.delete(key)
      }
    }
    url.searchParams.sort()
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "") || "/"
    return url.toString()
  } catch {
    return null
  }
}

function deterministicId(source: ResearchSource, url: string) {
  const digest = createHash("sha256").update(`${source}\n${url}`).digest("hex").slice(0, 20)
  return `last30days-${source}-${digest}`
}

function normalizeMissingSources(value: unknown, warnings: string[]) {
  if (!Array.isArray(value)) throw new InvalidLast30DaysImportError("missingSources must be an array.")
  if (value.length > MAX_MISSING_SOURCES) warnings.push(`missingSources limited to ${MAX_MISSING_SOURCES} entries.`)

  const normalized: string[] = []
  const seen = new Set<string>()
  for (const [index, entry] of value.slice(0, MAX_MISSING_SOURCES).entries()) {
    const clean = cleanText(entry, FIELD_LIMITS.missingSource)
    if (!clean) {
      warnings.push(`missingSources[${index}] ignored: expected non-empty text.`)
      continue
    }
    if (clean.truncated) warnings.push(`missingSources[${index}] truncated to ${FIELD_LIMITS.missingSource} characters.`)
    const key = clean.value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(clean.value)
  }
  return normalized
}

function normalizeTags(value: unknown, itemIndex: number, warnings: string[]) {
  if (!Array.isArray(value)) {
    warnings.push(`Item ${itemIndex} tags replaced with an empty list.`)
    return []
  }
  if (value.length > MAX_TAGS) warnings.push(`Item ${itemIndex} tags limited to ${MAX_TAGS}.`)

  const tags: string[] = []
  const seen = new Set<string>()
  for (const entry of value.slice(0, MAX_TAGS)) {
    const clean = cleanText(entry, FIELD_LIMITS.tag)
    if (!clean) continue
    if (clean.truncated) warnings.push(`Item ${itemIndex} tag truncated to ${FIELD_LIMITS.tag} characters.`)
    const key = clean.value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(clean.value)
  }
  return tags
}

function normalizeItem(value: unknown, index: number, warnings: string[]): ResearchItem | null {
  if (!isRecord(value)) {
    warnings.push(`Item ${index} skipped: expected an object.`)
    return null
  }

  if (typeof value.source !== "string" || !SOURCES.has(value.source as ResearchSource)) {
    warnings.push(`Item ${index} skipped: unsupported source.`)
    return null
  }
  const source = value.source as ResearchSource
  const url = canonicalHttpsUrl(value.url)
  if (!url) {
    warnings.push(`Item ${index} skipped: URL must be bounded HTTPS without credentials.`)
    return null
  }

  const required = {
    sourceLabel: cleanText(value.sourceLabel, FIELD_LIMITS.sourceLabel),
    title: cleanText(value.title, FIELD_LIMITS.title),
    excerpt: cleanText(value.excerpt, FIELD_LIMITS.excerpt),
    publishedAt: cleanText(value.publishedAt, FIELD_LIMITS.publishedAt),
    engagementLabel: cleanText(value.engagementLabel, FIELD_LIMITS.engagementLabel),
  }
  for (const [field, clean] of Object.entries(required)) {
    if (!clean) {
      warnings.push(`Item ${index} skipped: ${field} must be non-empty text.`)
      return null
    }
    if (clean.truncated) warnings.push(`Item ${index} ${field} truncated to ${FIELD_LIMITS[field as keyof typeof FIELD_LIMITS]} characters.`)
  }

  const quality = typeof value.quality === "string" && QUALITIES.has(value.quality as ResearchItem["quality"])
    ? value.quality as ResearchItem["quality"]
    : "supporting"
  if (quality !== value.quality) warnings.push(`Item ${index} quality replaced with supporting.`)

  return {
    id: deterministicId(source, url),
    source,
    sourceLabel: required.sourceLabel!.value,
    title: required.title!.value,
    excerpt: required.excerpt!.value,
    url,
    publishedAt: required.publishedAt!.value,
    engagementLabel: required.engagementLabel!.value,
    tags: normalizeTags(value.tags, index, warnings),
    quality,
  }
}

export function parseLast30DaysImport(raw: string): Last30DaysImportResult {
  if (typeof raw !== "string" || !raw.trim()) throw new InvalidLast30DaysImportError("Last30Days result must be non-empty JSON.")
  if (raw.length > MAX_JSON_CHARS) throw new InvalidLast30DaysImportError(`Last30Days result exceeds ${MAX_JSON_CHARS} characters.`)

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    throw new InvalidLast30DaysImportError("Last30Days result must contain JSON only.")
  }
  if (!isRecord(payload)) throw new InvalidLast30DaysImportError("Last30Days result must be a JSON object.")

  const rawItemCount = boundedInteger(payload.rawItemCount, "rawItemCount", MAX_RAW_ITEMS)
  const availableSources = boundedInteger(payload.availableSources, "availableSources", MAX_AVAILABLE_SOURCES)
  if (!Array.isArray(payload.items)) throw new InvalidLast30DaysImportError("items must be an array.")

  const warnings: string[] = []
  const missingSources = normalizeMissingSources(payload.missingSources, warnings)
  const cleanDateRange = payload.dateRange === undefined ? null : cleanText(payload.dateRange, FIELD_LIMITS.dateRange)
  if (payload.dateRange !== undefined && !cleanDateRange) warnings.push("dateRange ignored: expected non-empty text.")
  if (cleanDateRange?.truncated) warnings.push(`dateRange truncated to ${FIELD_LIMITS.dateRange} characters.`)
  if (payload.items.length > MAX_ITEMS) warnings.push(`Items limited to ${MAX_ITEMS}.`)

  const items: ResearchItem[] = []
  const ids = new Set<string>()
  const urls = new Set<string>()
  for (const [index, value] of payload.items.slice(0, MAX_ITEMS).entries()) {
    const item = normalizeItem(value, index, warnings)
    if (!item) continue
    if (ids.has(item.id) || urls.has(item.url)) {
      warnings.push(`Item ${index} skipped: duplicate source URL.`)
      continue
    }
    ids.add(item.id)
    urls.add(item.url)
    items.push(item)
  }
  if (!items.length) throw new InvalidLast30DaysImportError("Last30Days result contains no valid research items.")

  const normalizedRawItemCount = Math.max(rawItemCount, items.length)
  if (normalizedRawItemCount !== rawItemCount) warnings.push("rawItemCount raised to imported item count.")

  return {
    rawItemCount: normalizedRawItemCount,
    availableSources,
    missingSources,
    items,
    warnings,
    ...(cleanDateRange ? { dateRange: cleanDateRange.value } : {}),
  }
}

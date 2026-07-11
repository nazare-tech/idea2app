import { getSafeExternalHttpUrl } from "./competitor-mention-links"

export interface CompetitorCandidate {
  name: string
  description: string
  whyCompetes: string
  url: string
}

export interface CompetitorEvidencePage {
  url: string
  title?: string
  content: string
}

export interface CompetitorSearchResult {
  competitors: CompetitorCandidate[]
  rawResponse: string
  parseFailed?: boolean
}

export type CompetitorSearchStatus =
  | "found"
  | "unusable"
  | "empty"
  | "parse_failed"
  | "not_configured"
  | "failed"

const MAX_JSON_SCAN_LENGTH = 100_000
const MAX_JSON_OBJECT_LENGTH = 64_000
const MAX_JSON_OBJECT_ATTEMPTS = 50
const MAX_COMPETITOR_CANDIDATES = 10
const MAX_COMPETITOR_NAME_LENGTH = 200
const MAX_COMPETITOR_TEXT_LENGTH = 2_000
const MAX_COMPETITOR_URL_LENGTH = 2_048

function boundedString(value: unknown, maxLength: number): string {
  return String(value || "").trim().slice(0, maxLength)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Finds complete JSON objects without letting braces inside JSON strings affect
 * nesting. The limits keep malformed model output from causing unbounded work.
 */
function extractJsonObjects(rawResponse: string): string[] {
  const scanLength = Math.min(rawResponse.length, MAX_JSON_SCAN_LENGTH)
  const objects: string[] = []
  let attempts = 0

  for (let start = 0; start < scanLength && attempts < MAX_JSON_OBJECT_ATTEMPTS; start += 1) {
    if (rawResponse[start] !== "{") continue
    attempts += 1

    let depth = 0
    let inString = false
    let escaped = false
    const objectLimit = Math.min(scanLength, start + MAX_JSON_OBJECT_LENGTH)

    for (let index = start; index < objectLimit; index += 1) {
      const character = rawResponse[index]

      if (inString) {
        if (escaped) {
          escaped = false
        } else if (character === "\\") {
          escaped = true
        } else if (character === '"') {
          inString = false
        }
        continue
      }

      if (character === '"') {
        inString = true
      } else if (character === "{") {
        depth += 1
      } else if (character === "}") {
        depth -= 1
        if (depth === 0) {
          objects.push(rawResponse.slice(start, index + 1))
          break
        }
      }
    }
  }

  return objects
}

function normalizeCandidates(value: unknown): CompetitorCandidate[] | null {
  if (!isRecord(value) || !Array.isArray(value.competitors)) return null

  return value.competitors
    .slice(0, MAX_COMPETITOR_CANDIDATES)
    .filter(isRecord)
    .map((competitor) => ({
      name: boundedString(competitor.name, MAX_COMPETITOR_NAME_LENGTH),
      description: boundedString(competitor.description, MAX_COMPETITOR_TEXT_LENGTH),
      whyCompetes: boundedString(competitor.whyCompetes, MAX_COMPETITOR_TEXT_LENGTH),
      url: boundedString(competitor.url, MAX_COMPETITOR_URL_LENGTH),
    }))
}

export function parseCompetitorSearchResponse(
  rawResponse: string,
): CompetitorSearchResult {
  if (rawResponse.trim().length === 0) {
    return { competitors: [], rawResponse }
  }

  for (const jsonObject of extractJsonObjects(rawResponse)) {
    try {
      const competitors = normalizeCandidates(JSON.parse(jsonObject))
      if (competitors) return { competitors, rawResponse }
    } catch {
      // Continue because models can put an unrelated or malformed object before
      // the requested competitor payload.
    }
  }

  return { competitors: [], rawResponse, parseFailed: true }
}

/**
 * Applies only the existing syntactic public-URL safety boundary. It does not
 * check reachability, redirects, company identity, or product relevance.
 */
export function getUsableCompetitors(
  competitors: CompetitorCandidate[],
): Array<CompetitorCandidate & { url: string }> {
  return competitors
    .map((competitor) => ({
      ...competitor,
      url: getSafeExternalHttpUrl(competitor.url),
    }))
    .filter(
      (competitor): competitor is CompetitorCandidate & { url: string } =>
        Boolean(competitor.name?.trim() && competitor.url),
    )
}

export function getCompetitorSearchStatus(
  result: CompetitorSearchResult,
): CompetitorSearchStatus {
  if (result.parseFailed) return "parse_failed"
  if (result.competitors.length === 0) return "empty"
  return getUsableCompetitors(result.competitors).length > 0
    ? "found"
    : "unusable"
}

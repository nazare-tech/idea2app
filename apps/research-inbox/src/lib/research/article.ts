import type { ArticleDraft, ResearchItem } from "./types"

const MAX_JSON_CHARS = 20_000
const MAX_TITLE_CHARS = 160
const MAX_DECK_CHARS = 320
const MAX_BODY_CHARS = 12_000
const MIN_BODY_WORDS = 850
const MAX_BODY_WORDS = 1_050

const EXPECTED_KEYS = ["body", "deck", "title"]
const POST_HOSTS = [
  "bsky.app",
  "digg.com",
  "facebook.com",
  "github.com",
  "instagram.com",
  "linkedin.com",
  "mastodon.social",
  "news.ycombinator.com",
  "polymarket.com",
  "reddit.com",
  "redd.it",
  "t.co",
  "threads.net",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "youtu.be",
  "youtube.com",
] as const

export class InvalidArticleDraftError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isPostHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "")
  return POST_HOSTS.some((host) => normalized === host || normalized.endsWith(`.${host}`))
}

export function isArticleCandidate(item: ResearchItem) {
  if (item.source !== "web") return false
  try {
    const url = new URL(item.url)
    return url.protocol === "https:" && !url.username && !url.password && !isPostHost(url.hostname)
  } catch {
    return false
  }
}

function rejectMarkup(value: string, field: string) {
  if (value.includes("<") || value.includes(">")) {
    throw new InvalidArticleDraftError(`${field} must not contain HTML.`)
  }
}

function parseInlineText(value: unknown, field: string, maximum: number) {
  if (typeof value !== "string") throw new InvalidArticleDraftError(`${field} must be text.`)
  rejectMarkup(value, field)
  if (/[\u0000-\u001f\u007f]/.test(value)) throw new InvalidArticleDraftError(`${field} contains control characters.`)
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized) throw new InvalidArticleDraftError(`${field} must not be empty.`)
  if (normalized.length > maximum) throw new InvalidArticleDraftError(`${field} exceeds ${maximum} characters.`)
  return normalized
}

function parseBody(value: unknown) {
  if (typeof value !== "string") throw new InvalidArticleDraftError("body must be text.")
  rejectMarkup(value, "body")
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new InvalidArticleDraftError("body contains control characters.")
  }
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/ +/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  if (!normalized) throw new InvalidArticleDraftError("body must not be empty.")
  if (normalized.length > MAX_BODY_CHARS) throw new InvalidArticleDraftError(`body exceeds ${MAX_BODY_CHARS} characters.`)

  const wordCount = normalized.split(/\s+/u).length
  if (wordCount < MIN_BODY_WORDS || wordCount > MAX_BODY_WORDS) {
    throw new InvalidArticleDraftError(`body must contain ${MIN_BODY_WORDS} to ${MAX_BODY_WORDS} words.`)
  }
  return normalized
}

export function parseArticleDraft(raw: string, generatedAt = new Date()): ArticleDraft {
  if (typeof raw !== "string" || !raw.trim()) throw new InvalidArticleDraftError("Article result must be non-empty JSON.")
  if (raw.length > MAX_JSON_CHARS) throw new InvalidArticleDraftError(`Article result exceeds ${MAX_JSON_CHARS} characters.`)

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    throw new InvalidArticleDraftError("Article result must contain JSON only.")
  }
  if (!isRecord(payload)) throw new InvalidArticleDraftError("Article result must be a JSON object.")

  const keys = Object.keys(payload).sort()
  if (keys.length !== EXPECTED_KEYS.length || keys.some((key, index) => key !== EXPECTED_KEYS[index])) {
    throw new InvalidArticleDraftError("Article result must contain only title, deck, and body.")
  }
  if (Number.isNaN(generatedAt.getTime())) throw new InvalidArticleDraftError("Article timestamp is invalid.")

  return {
    title: parseInlineText(payload.title, "title", MAX_TITLE_CHARS),
    deck: parseInlineText(payload.deck, "deck", MAX_DECK_CHARS),
    body: parseBody(payload.body),
    generatedAt: generatedAt.toISOString(),
  }
}

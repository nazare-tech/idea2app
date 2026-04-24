import { sanitizeInput } from "./prompts/sanitize"
import {
  PROJECT_NAME_SYSTEM_PROMPT,
  buildProjectNameUserPrompt,
} from "./prompts/intake-wizard"
import type { ProjectNameGenerationInput } from "./intake-types"

const MAX_PROJECT_NAME_WORDS = 6
const MAX_PROJECT_NAME_LENGTH = 80

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "app",
  "application",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "platform",
  "product",
  "that",
  "the",
  "to",
  "tool",
  "with",
])

export interface ProjectNameModelRequest {
  systemPrompt: string
  userPrompt: string
  maxTokens: number
}

export interface GenerateProjectNameOptions {
  generateText?: (request: ProjectNameModelRequest) => Promise<string>
  fallbackName?: string
}

export interface ProjectNameGenerationResult {
  name: string
  usedFallback: boolean
  rawModelOutput?: string
  error?: string
}

export async function generateProjectName(
  input: ProjectNameGenerationInput,
  options: GenerateProjectNameOptions = {}
): Promise<ProjectNameGenerationResult> {
  const fallbackName = options.fallbackName
    ? sanitizeGeneratedProjectName(options.fallbackName, "Untitled")
    : buildFallbackProjectName(input)

  if (!options.generateText) {
    return {
      name: fallbackName,
      usedFallback: true,
      error: "No model generator was provided",
    }
  }

  try {
    const rawModelOutput = await options.generateText({
      systemPrompt: PROJECT_NAME_SYSTEM_PROMPT,
      userPrompt: buildProjectNameUserPrompt(input),
      maxTokens: 24,
    })
    const name = sanitizeGeneratedProjectName(rawModelOutput, fallbackName)

    return {
      name,
      usedFallback: name === fallbackName,
      rawModelOutput,
    }
  } catch (error) {
    return {
      name: fallbackName,
      usedFallback: true,
      error: error instanceof Error ? error.message : "Unknown project name generation error",
    }
  }
}

export function sanitizeGeneratedProjectName(rawName: string, fallbackName = "Untitled"): string {
  const sanitized = sanitizeInput(rawName, 300)
    .split(/\r?\n/)[0]
    .replace(/^#+\s*/, "")
    .replace(/[*_`~]/g, "")
    .replace(/^[\s.!,;:-]+/, "")
    .replace(/^(project\s+name|name|title)\s*:\s*/i, "")
    .replace(/[“”‘’"'[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?,;:|\-–—]+$/g, "")
    .trim()

  const words = sanitized
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9&+]+$/g, ""))
    .filter(Boolean)
    .slice(0, MAX_PROJECT_NAME_WORDS)

  const titleCased = titleCaseWords(words).join(" ").slice(0, MAX_PROJECT_NAME_LENGTH).trim()

  if (!titleCased) {
    return fallbackName
  }

  return titleCased.replace(/[.!?,;:|\-–—]+$/g, "").trim() || fallbackName
}

export function buildFallbackProjectName(
  input: ProjectNameGenerationInput,
  fallbackName = "Untitled"
): string {
  const source = normalizeNameSource(input.summary || input.originalIdea || input.intakeContext || "")
  const words = source
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9&+]+$/g, ""))
    .filter((word) => word.length > 1)
    .filter((word) => !STOP_WORDS.has(word.toLowerCase()))
    .slice(0, MAX_PROJECT_NAME_WORDS)

  if (words.length === 0) {
    return fallbackName
  }

  return sanitizeGeneratedProjectName(titleCaseWords(words).join(" "), fallbackName)
}

function normalizeNameSource(value: string): string {
  return sanitizeInput(value, 600)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[^\w\s&+.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function titleCaseWords(words: string[]): string[] {
  return words.map((word) => {
    if (/^[A-Z0-9&+]{2,}$/.test(word)) {
      return word
    }

    return word
      .toLowerCase()
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("-")
  })
}

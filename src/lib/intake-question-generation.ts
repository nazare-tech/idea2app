import {
  INTAKE_QUESTION_SCHEMA_VERSION,
  INTAKE_SELECTION_MODES,
  type IntakeQuestion,
  type IntakeQuestionGenerationResult,
  type IntakeQuestionOption,
  type IntakeQuestionSet,
  type IntakeSelectionMode,
} from "./intake-types"
import {
  INTAKE_QUESTION_SYSTEM_PROMPT,
  buildIntakeQuestionUserPrompt,
} from "./prompts/intake-wizard"

const MIN_QUESTIONS = 4
const MAX_QUESTIONS = 5
const MIN_SELECTION_OPTIONS = 2
const MAX_SELECTION_OPTIONS = 6
const MAX_QUESTION_LENGTH = 180
const MAX_OPTION_LABEL_LENGTH = 48
const MAX_HELPER_TEXT_LENGTH = 140

const SELECTION_MODE_SET = new Set<string>(INTAKE_SELECTION_MODES)
const RETRYABLE_GENERATION_ERROR =
  "We couldn't generate follow-up questions right now. Please retry in a moment."

export class IntakeQuestionParseError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid intake question payload: ${issues.join("; ")}`)
    this.name = "IntakeQuestionParseError"
  }
}

export interface IntakeQuestionModelRequest {
  systemPrompt: string
  userPrompt: string
  maxTokens: number
}

export interface GenerateIntakeQuestionsOptions {
  generateText?: (request: IntakeQuestionModelRequest) => Promise<string>
}

export async function generateIntakeQuestions(
  idea: string,
  options: GenerateIntakeQuestionsOptions = {}
): Promise<IntakeQuestionGenerationResult> {
  if (!options.generateText) {
    throw new Error(RETRYABLE_GENERATION_ERROR)
  }

  try {
    const rawModelOutput = await options.generateText({
      systemPrompt: INTAKE_QUESTION_SYSTEM_PROMPT,
      userPrompt: buildIntakeQuestionUserPrompt(idea),
      maxTokens: 1200,
    })
    return {
      questionSet: parseIntakeQuestionSet(rawModelOutput),
      usedFallback: false,
      rawModelOutput,
    }
  } catch {
    throw new Error(RETRYABLE_GENERATION_ERROR)
  }
}

export function parseIntakeQuestionSet(rawModelOutput: string): IntakeQuestionSet {
  const issues: string[] = []
  const parsed = parseJsonObject(rawModelOutput, issues)

  if (!parsed) {
    throw new IntakeQuestionParseError(issues)
  }

  const questionsValue = getRecordValue(parsed, "questions")
  if (!Array.isArray(questionsValue)) {
    throw new IntakeQuestionParseError(["questions must be an array"])
  }

  if (questionsValue.length < MIN_QUESTIONS || questionsValue.length > MAX_QUESTIONS) {
    throw new IntakeQuestionParseError([
      `questions must include ${MIN_QUESTIONS}-${MAX_QUESTIONS} items`,
    ])
  }

  const questions = questionsValue.map((questionValue, questionIndex) =>
    parseQuestion(questionValue, questionIndex)
  )

  const duplicateIds = findDuplicateIds(questions.map((question) => question.id))
  if (duplicateIds.length > 0) {
    throw new IntakeQuestionParseError([
      `question ids must be unique: ${duplicateIds.join(", ")}`,
    ])
  }

  return {
    schemaVersion: INTAKE_QUESTION_SCHEMA_VERSION,
    source: "ai",
    questions,
  }
}

function parseJsonObject(rawModelOutput: string, issues: string[]): Record<string, unknown> | null {
  const candidate = extractJsonObject(rawModelOutput)
  if (!candidate) {
    issues.push("model output did not contain a JSON object")
    return null
  }

  try {
    const parsed: unknown = JSON.parse(candidate)
    if (!isRecord(parsed)) {
      issues.push("JSON root must be an object")
      return null
    }
    return parsed
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "JSON parsing failed")
    return null
  }
}

function extractJsonObject(rawModelOutput: string): string | null {
  const trimmed = rawModelOutput.trim()

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return trimmed.slice(start, end + 1)
}

function parseQuestion(questionValue: unknown, questionIndex: number): IntakeQuestion {
  if (!isRecord(questionValue)) {
    throw new IntakeQuestionParseError([`question ${questionIndex + 1} must be an object`])
  }

  const id = readRequiredString(questionValue, "id", questionIndex)
  const question = readRequiredString(questionValue, "question", questionIndex)
  const selectionMode = readSelectionMode(questionValue, questionIndex)
  const allowOther = readRequiredBoolean(questionValue, "allowOther", questionIndex)
  const options = readOptions(questionValue, selectionMode, questionIndex)
  const helperText = readOptionalString(questionValue, "helperText", questionIndex)

  if (!isSafeId(id)) {
    throw new IntakeQuestionParseError([
      `question ${questionIndex + 1} id must be lowercase kebab-case`,
    ])
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    throw new IntakeQuestionParseError([
      `question ${questionIndex + 1} question exceeds ${MAX_QUESTION_LENGTH} characters`,
    ])
  }

  if (helperText && helperText.length > MAX_HELPER_TEXT_LENGTH) {
    throw new IntakeQuestionParseError([
      `question ${questionIndex + 1} helperText exceeds ${MAX_HELPER_TEXT_LENGTH} characters`,
    ])
  }

  if (selectionMode === "text" && allowOther) {
    throw new IntakeQuestionParseError([
      `question ${questionIndex + 1} text questions cannot allow Other`,
    ])
  }

  if (selectionMode === "text") {
    throw new IntakeQuestionParseError([
      `question ${questionIndex + 1} cannot use standalone text input`,
    ])
  }

  if (selectionMode === "multiple" && allowOther) {
    throw new IntakeQuestionParseError([
      `question ${questionIndex + 1} multiple-choice questions cannot allow Other`,
    ])
  }

  const duplicateOptionIds = findDuplicateIds(options.map((optionItem) => optionItem.id))
  if (duplicateOptionIds.length > 0) {
    throw new IntakeQuestionParseError([
      `question ${questionIndex + 1} option ids must be unique: ${duplicateOptionIds.join(", ")}`,
    ])
  }

  return {
    id,
    question,
    selectionMode,
    options,
    allowOther,
    ...(helperText ? { helperText } : {}),
  }
}

function readOptions(
  questionValue: Record<string, unknown>,
  selectionMode: IntakeSelectionMode,
  questionIndex: number
): IntakeQuestionOption[] {
  const optionsValue = getRecordValue(questionValue, "options")

  if (!Array.isArray(optionsValue)) {
    throw new IntakeQuestionParseError([`question ${questionIndex + 1} options must be an array`])
  }

  if (selectionMode === "text") {
    if (optionsValue.length !== 0) {
      throw new IntakeQuestionParseError([
        `question ${questionIndex + 1} text questions must use an empty options array`,
      ])
    }
    return []
  }

  if (
    optionsValue.length < MIN_SELECTION_OPTIONS ||
    optionsValue.length > MAX_SELECTION_OPTIONS
  ) {
    throw new IntakeQuestionParseError([
      `question ${questionIndex + 1} options must include ${MIN_SELECTION_OPTIONS}-${MAX_SELECTION_OPTIONS} items`,
    ])
  }

  return optionsValue.map((optionValue, optionIndex) => {
    if (!isRecord(optionValue)) {
      throw new IntakeQuestionParseError([
        `question ${questionIndex + 1} option ${optionIndex + 1} must be an object`,
      ])
    }

    const id = readRequiredString(optionValue, "id", questionIndex, optionIndex)
    const label = readRequiredString(optionValue, "label", questionIndex, optionIndex)

    if (!isSafeId(id)) {
      throw new IntakeQuestionParseError([
        `question ${questionIndex + 1} option ${optionIndex + 1} id must be lowercase kebab-case`,
      ])
    }

    if (label.length > MAX_OPTION_LABEL_LENGTH) {
      throw new IntakeQuestionParseError([
        `question ${questionIndex + 1} option ${optionIndex + 1} label exceeds ${MAX_OPTION_LABEL_LENGTH} characters`,
      ])
    }

    return { id, label }
  })
}

function readSelectionMode(
  questionValue: Record<string, unknown>,
  questionIndex: number
): IntakeSelectionMode {
  const value = readRequiredString(questionValue, "selectionMode", questionIndex)
  if (!SELECTION_MODE_SET.has(value)) {
    throw new IntakeQuestionParseError([
      `question ${questionIndex + 1} selectionMode must be one of ${INTAKE_SELECTION_MODES.join(", ")}`,
    ])
  }
  return value as IntakeSelectionMode
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  questionIndex: number,
  optionIndex?: number
): string {
  const value = getRecordValue(record, key)
  const label = optionIndex === undefined
    ? `question ${questionIndex + 1} ${key}`
    : `question ${questionIndex + 1} option ${optionIndex + 1} ${key}`

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new IntakeQuestionParseError([`${label} must be a non-empty string`])
  }

  return value.trim().replace(/\s+/g, " ")
}

function readRequiredBoolean(
  record: Record<string, unknown>,
  key: string,
  questionIndex: number
): boolean {
  const value = getRecordValue(record, key)
  if (typeof value !== "boolean") {
    throw new IntakeQuestionParseError([`question ${questionIndex + 1} ${key} must be a boolean`])
  }
  return value
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  questionIndex: number
): string | undefined {
  const value = getRecordValue(record, key)
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== "string") {
    throw new IntakeQuestionParseError([`question ${questionIndex + 1} ${key} must be a string`])
  }

  const trimmed = value.trim().replace(/\s+/g, " ")
  return trimmed.length > 0 ? trimmed : undefined
}

function getRecordValue(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSafeId(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

function findDuplicateIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id)
    }
    seen.add(id)
  }

  return [...duplicates]
}

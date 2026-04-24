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
    return {
      questionSet: buildFallbackIntakeQuestions(idea),
      usedFallback: true,
      error: "No model generator was provided",
    }
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
  } catch (error) {
    return {
      questionSet: buildFallbackIntakeQuestions(idea),
      usedFallback: true,
      error: error instanceof Error ? error.message : "Unknown intake question generation error",
    }
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

export function parseIntakeQuestionSetOrFallback(
  rawModelOutput: string,
  idea: string
): IntakeQuestionSet {
  try {
    return parseIntakeQuestionSet(rawModelOutput)
  } catch {
    return buildFallbackIntakeQuestions(idea)
  }
}

export function buildFallbackIntakeQuestions(idea: string): IntakeQuestionSet {
  const ideaType = classifyIdea(idea)

  const commonLastQuestion: IntakeQuestion = {
    id: "launch-priority",
    question: "What should the first version prove?",
    selectionMode: "single",
    options: [
      option("validate-demand", "Validate demand"),
      option("win-first-users", "Win first users"),
      option("prove-workflow", "Prove workflow"),
      option("test-revenue", "Test revenue"),
    ],
    allowOther: true,
    helperText: "Pick the outcome that matters most for the MVP.",
  }

  if (ideaType === "marketplace") {
    return setFromQuestions([
      {
        id: "marketplace-sides",
        question: "Who are the two sides of the marketplace?",
        selectionMode: "text",
        options: [],
        allowOther: false,
        helperText: "Name the buyer/user side and the supplier/provider side.",
      },
      {
        id: "transaction-type",
        question: "What transactions should happen first?",
        selectionMode: "single",
        options: [
          option("services", "Services"),
          option("products", "Products"),
          option("bookings", "Bookings"),
          option("rentals", "Rentals"),
          option("leads", "Leads"),
        ],
        allowOther: true,
      },
      {
        id: "marketplace-niche",
        question: "What niche gives the marketplace a focused wedge?",
        selectionMode: "text",
        options: [],
        allowOther: false,
      },
      {
        id: "revenue-model",
        question: "How should the marketplace make money?",
        selectionMode: "multiple",
        options: [
          option("commission", "Commission"),
          option("subscriptions", "Subscriptions"),
          option("listing-fees", "Listing fees"),
          option("featured-placement", "Featured placement"),
          option("payments-margin", "Payments margin"),
        ],
        allowOther: true,
      },
      commonLastQuestion,
    ])
  }

  if (ideaType === "service") {
    return setFromQuestions([
      {
        id: "target-client",
        question: "Who is the ideal first client?",
        selectionMode: "single",
        options: [
          option("consumers", "Consumers"),
          option("small-businesses", "Small businesses"),
          option("startups", "Startups"),
          option("enterprise-teams", "Enterprise teams"),
          option("creators", "Creators"),
        ],
        allowOther: true,
      },
      {
        id: "delivery-model",
        question: "How will the service be delivered?",
        selectionMode: "single",
        options: [
          option("self-serve", "Self-serve"),
          option("done-for-you", "Done for you"),
          option("hybrid", "Hybrid"),
          option("consulting", "Consulting"),
        ],
        allowOther: true,
      },
      {
        id: "pain-intensity",
        question: "How urgent is the customer pain?",
        selectionMode: "single",
        options: [
          option("nice-to-have", "Nice to have"),
          option("weekly-pain", "Weekly pain"),
          option("daily-pain", "Daily pain"),
          option("critical-blocker", "Critical blocker"),
        ],
        allowOther: false,
      },
      {
        id: "pricing-model",
        question: "What pricing model fits best?",
        selectionMode: "single",
        options: [
          option("fixed-package", "Fixed package"),
          option("monthly-retainer", "Monthly retainer"),
          option("per-project", "Per project"),
          option("performance-based", "Performance based"),
        ],
        allowOther: true,
      },
      commonLastQuestion,
    ])
  }

  if (ideaType === "vague") {
    return setFromQuestions([
      {
        id: "problem",
        question: "What problem are you most trying to solve?",
        selectionMode: "text",
        options: [],
        allowOther: false,
      },
      {
        id: "target-audience",
        question: "Who feels this problem most strongly?",
        selectionMode: "single",
        options: [
          option("consumers", "Consumers"),
          option("small-businesses", "Small businesses"),
          option("creators", "Creators"),
          option("operators", "Operators"),
          option("developers", "Developers"),
        ],
        allowOther: true,
      },
      {
        id: "solution-type",
        question: "What kind of solution are you imagining?",
        selectionMode: "single",
        options: [
          option("software-tool", "Software tool"),
          option("marketplace", "Marketplace"),
          option("service", "Service"),
          option("content-community", "Content/community"),
        ],
        allowOther: true,
      },
      {
        id: "success-outcome",
        question: "What should customers be able to achieve?",
        selectionMode: "text",
        options: [],
        allowOther: false,
      },
      commonLastQuestion,
    ])
  }

  return setFromQuestions([
    {
      id: "target-audience",
      question: "Who is the ideal first user or buyer?",
      selectionMode: "single",
      options: [
        option("consumers", "Consumers"),
        option("small-businesses", "Small businesses"),
        option("startups", "Startups"),
        option("enterprise-teams", "Enterprise teams"),
        option("creators", "Creators"),
      ],
      allowOther: true,
    },
    {
      id: "core-workflow",
      question: "Which workflow should the product handle first?",
      selectionMode: "text",
      options: [],
      allowOther: false,
      helperText: "Describe the main job the product should help users complete.",
    },
    {
      id: "pain-frequency",
      question: "How often does this problem happen?",
      selectionMode: "single",
      options: [
        option("daily", "Daily"),
        option("weekly", "Weekly"),
        option("monthly", "Monthly"),
        option("occasionally", "Occasionally"),
      ],
      allowOther: false,
    },
    {
      id: "business-model",
      question: "Which business model is most likely?",
      selectionMode: "single",
      options: [
        option("subscription", "Subscription"),
        option("freemium", "Freemium"),
        option("usage-based", "Usage based"),
        option("one-time-purchase", "One-time purchase"),
        option("services", "Services"),
      ],
      allowOther: true,
    },
    commonLastQuestion,
  ])
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

function setFromQuestions(questions: IntakeQuestion[]): IntakeQuestionSet {
  return {
    schemaVersion: INTAKE_QUESTION_SCHEMA_VERSION,
    source: "fallback",
    questions,
  }
}

function option(id: string, label: string): IntakeQuestionOption {
  return { id, label }
}

function classifyIdea(idea: string): "marketplace" | "service" | "software" | "vague" {
  const normalized = idea.toLowerCase()
  const wordCount = normalized.split(/\s+/).filter(Boolean).length

  if (wordCount < 5) {
    return "vague"
  }

  if (/\b(marketplace|buyers?|sellers?|vendors?|providers?|booking platform)\b/.test(normalized)) {
    return "marketplace"
  }

  if (/\b(service|agency|consulting|coach|coaching|done-for-you|managed)\b/.test(normalized)) {
    return "service"
  }

  return "software"
}

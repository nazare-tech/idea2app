export const INTAKE_QUESTION_SCHEMA_VERSION = "idea-intake-questions-v1" as const
export const PROJECT_INTAKE_SCHEMA_VERSION = "idea-intake-v1" as const

export const INTAKE_SELECTION_MODES = ["single", "multiple", "text"] as const

export type IntakeQuestionSchemaVersion = typeof INTAKE_QUESTION_SCHEMA_VERSION
export type ProjectIntakeSchemaVersion = typeof PROJECT_INTAKE_SCHEMA_VERSION
export type IntakeSelectionMode = (typeof INTAKE_SELECTION_MODES)[number]
export type IntakeQuestionSource = "ai" | "fallback"
export type ProjectIntakeSource = "wizard" | "landing" | "dashboard" | "prompt-chat" | "manual"

export interface IntakeQuestionOption {
  id: string
  label: string
}

export interface IntakeQuestion {
  id: string
  question: string
  selectionMode: IntakeSelectionMode
  options: IntakeQuestionOption[]
  allowOther: boolean
  helperText?: string
}

export interface IntakeQuestionSet {
  schemaVersion: IntakeQuestionSchemaVersion
  source: IntakeQuestionSource
  questions: IntakeQuestion[]
}

export interface IntakeQuestionGenerationResult {
  questionSet: IntakeQuestionSet
  usedFallback: boolean
  rawModelOutput?: string
  error?: string
}

export interface IntakeAnswer {
  questionId: string
  selectedOptionIds?: string[]
  otherText?: string
  text?: string
}

export interface ProjectIntakePayload {
  schemaVersion: ProjectIntakeSchemaVersion
  originalIdea: string
  questions: IntakeQuestion[]
  answers: IntakeAnswer[]
  source: ProjectIntakeSource
  createdAt: string
}

export interface IntakeAnswerSummaryItem {
  questionId: string
  question: string
  answer: string
}

export interface BuildProjectIntakePayloadInput {
  originalIdea: string
  questions: IntakeQuestion[]
  answers: IntakeAnswer[]
  source?: ProjectIntakeSource
  createdAt?: string
}

export interface ProjectNameGenerationInput {
  originalIdea: string
  summary?: string
  intakeContext?: string
}

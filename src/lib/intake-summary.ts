import {
  PROJECT_INTAKE_SCHEMA_VERSION,
  type BuildProjectIntakePayloadInput,
  type IntakeAnswer,
  type IntakeAnswerSummaryItem,
  type IntakeQuestion,
  type ProjectIntakePayload,
} from "./intake-types"

const SUMMARY_MAX_ANSWER_LENGTH = 180

export function buildProjectIntakePayload(
  input: BuildProjectIntakePayloadInput
): ProjectIntakePayload {
  return {
    schemaVersion: PROJECT_INTAKE_SCHEMA_VERSION,
    originalIdea: normalizeWhitespace(input.originalIdea),
    questions: input.questions,
    answers: normalizeAnswers(input.answers),
    source: input.source ?? "wizard",
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
}

export function buildProjectSummary(payload: ProjectIntakePayload): string {
  const originalIdea = normalizeWhitespace(payload.originalIdea)
  const answerItems = summarizeIntakeAnswers(payload.questions, payload.answers)
  const answeredItems = answerItems.filter((item) => item.answer.length > 0)

  const lines = [
    "Business idea summary:",
    originalIdea,
  ]

  if (answeredItems.length > 0) {
    lines.push("", "Intake details:")
    for (const item of answeredItems) {
      lines.push(`- ${stripQuestionMark(item.question)}: ${truncate(item.answer, SUMMARY_MAX_ANSWER_LENGTH)}`)
    }
  }

  return lines.join("\n").trim()
}

export function summarizeIntakeAnswers(
  questions: IntakeQuestion[],
  answers: IntakeAnswer[]
): IntakeAnswerSummaryItem[] {
  const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]))

  return questions.map((question) => {
    const answer = answersByQuestionId.get(question.id)
    return {
      questionId: question.id,
      question: question.question,
      answer: answer ? answerToText(question, answer) : "",
    }
  })
}

function normalizeAnswers(answers: IntakeAnswer[]): IntakeAnswer[] {
  return answers.map((answer) => {
    const selectedOptionIds = answer.selectedOptionIds
      ?.map((id) => normalizeWhitespace(id))
      .filter(Boolean)

    return {
      questionId: normalizeWhitespace(answer.questionId),
      ...(selectedOptionIds && selectedOptionIds.length > 0 ? { selectedOptionIds } : {}),
      ...(answer.otherText ? { otherText: normalizeWhitespace(answer.otherText) } : {}),
      ...(answer.text ? { text: normalizeWhitespace(answer.text) } : {}),
    }
  })
}

function answerToText(question: IntakeQuestion, answer: IntakeAnswer): string {
  const pieces: string[] = []
  const selectedOptionIds = answer.selectedOptionIds ?? []

  for (const optionId of selectedOptionIds) {
    const option = question.options.find((candidate) => candidate.id === optionId)
    if (option) {
      pieces.push(option.label)
    }
  }

  if (answer.text) {
    pieces.push(answer.text)
  }

  if (answer.otherText) {
    pieces.push(answer.otherText)
  }

  return pieces.map(normalizeWhitespace).filter(Boolean).join(", ")
}

function stripQuestionMark(value: string): string {
  return value.replace(/\?+$/, "")
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

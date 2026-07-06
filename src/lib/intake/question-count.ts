import type { IntakeQuestion } from "@/lib/intake/types"

export const MIN_PROJECT_INTAKE_QUESTIONS = 3
export const MAX_PROJECT_INTAKE_QUESTIONS = 5

export const PROJECT_INTAKE_QUESTION_COUNT_ERROR =
  `Question set must include ${MIN_PROJECT_INTAKE_QUESTIONS}-${MAX_PROJECT_INTAKE_QUESTIONS} questions`

export function getProjectIntakeQuestionCountError(questions: IntakeQuestion[]) {
  if (
    questions.length < MIN_PROJECT_INTAKE_QUESTIONS ||
    questions.length > MAX_PROJECT_INTAKE_QUESTIONS
  ) {
    return PROJECT_INTAKE_QUESTION_COUNT_ERROR
  }

  return null
}

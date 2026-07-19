import { REQUIRED_PLATFORM_QUESTION } from "@/lib/intake/required-questions"
import type { IntakeAnswer, IntakeQuestion } from "@/lib/intake/types"

/** In-progress answer for one intake question, before submission shaping. */
export type AnswerDraft = {
  selectedOptionIds: string[]
  otherSelected: boolean
  otherText: string
  decideForMe: boolean
  text: string
}

export type AnswerState = Record<string, AnswerDraft>

export function emptyAnswer(): AnswerDraft {
  return {
    selectedOptionIds: [],
    otherSelected: false,
    otherText: "",
    decideForMe: false,
    text: "",
  }
}

/**
 * Every choice question offers the "Other" and "Decide for me" escape
 * hatches, except the required platform question: the backend and the
 * build-tool recommendation need an explicit platform choice.
 */
export function supportsAnswerEscapeHatches(question: IntakeQuestion): boolean {
  return question.selectionMode !== "text" && question.id !== REQUIRED_PLATFORM_QUESTION.id
}

export function toggleOption(
  question: IntakeQuestion,
  draft: AnswerDraft,
  optionId: string
): AnswerDraft {
  if (question.selectionMode === "single") {
    return {
      ...draft,
      selectedOptionIds: draft.selectedOptionIds.includes(optionId) ? [] : [optionId],
      otherSelected: false,
      otherText: "",
      decideForMe: false,
    }
  }

  const selected = new Set(draft.selectedOptionIds)
  if (selected.has(optionId)) {
    selected.delete(optionId)
  } else {
    selected.add(optionId)
  }

  return {
    ...draft,
    selectedOptionIds: [...selected],
    decideForMe: false,
  }
}

/**
 * Toggle the custom "Other" answer. Single-select treats it as one more
 * exclusive choice; multi-select lets it ride alongside picked options.
 */
export function toggleOther(question: IntakeQuestion, draft: AnswerDraft): AnswerDraft {
  return {
    ...draft,
    selectedOptionIds: question.selectionMode === "single" ? [] : draft.selectedOptionIds,
    otherSelected: !draft.otherSelected,
    otherText: draft.otherSelected ? "" : draft.otherText,
    decideForMe: false,
  }
}

/** Toggle delegation to the AI; exclusive with picked options and Other. */
export function toggleDecideForMe(draft: AnswerDraft): AnswerDraft {
  return {
    ...draft,
    selectedOptionIds: [],
    otherSelected: false,
    otherText: "",
    decideForMe: !draft.decideForMe,
  }
}

export function shouldShowOtherInput(question: IntakeQuestion, answer: AnswerDraft) {
  return supportsAnswerEscapeHatches(question) && answer.otherSelected
}

export function hasAnswer(question: IntakeQuestion, answer: AnswerDraft | undefined) {
  if (!answer) return false
  if (question.selectionMode === "text") return answer.text.trim().length > 0
  return (
    answer.selectedOptionIds.length > 0 ||
    answer.decideForMe ||
    answer.otherText.trim().length > 0
  )
}

export function buildAnswers(questions: IntakeQuestion[], answers: AnswerState): IntakeAnswer[] {
  return questions.map((question) => {
    const answer = answers[question.id] ?? emptyAnswer()
    return {
      questionId: question.id,
      ...(question.selectionMode === "text"
        ? { text: answer.text.trim() }
        : answer.decideForMe
          ? { decideForMe: true }
          : {
              ...(answer.selectedOptionIds.length > 0 ? { selectedOptionIds: answer.selectedOptionIds } : {}),
              ...(answer.otherSelected && answer.otherText.trim() ? { otherText: answer.otherText.trim() } : {}),
            }),
    }
  })
}

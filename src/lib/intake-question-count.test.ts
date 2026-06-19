import test from "node:test"
import assert from "node:assert/strict"

import type { IntakeQuestion } from "./intake-types"
import {
  PROJECT_INTAKE_QUESTION_COUNT_ERROR,
  getProjectIntakeQuestionCountError,
} from "./intake-question-count"
import { REQUIRED_PLATFORM_QUESTION } from "./intake-required-questions"

function chipQuestion(id: string): IntakeQuestion {
  return {
    id,
    question: `${id}?`,
    selectionMode: "single",
    options: [
      { id: "one", label: "One" },
      { id: "two", label: "Two" },
    ],
    allowOther: false,
  }
}

test("getProjectIntakeQuestionCountError accepts the three-question wizard state shown in Step 2", () => {
  const questions = [
    REQUIRED_PLATFORM_QUESTION,
    chipQuestion("launch-data-sources"),
    chipQuestion("monetization-model"),
  ]

  assert.equal(getProjectIntakeQuestionCountError(questions), null)
})

test("getProjectIntakeQuestionCountError accepts four or five questions", () => {
  assert.equal(
    getProjectIntakeQuestionCountError([
      REQUIRED_PLATFORM_QUESTION,
      chipQuestion("target-user"),
      chipQuestion("workflow"),
      chipQuestion("business-model"),
    ]),
    null,
  )
  assert.equal(
    getProjectIntakeQuestionCountError([
      REQUIRED_PLATFORM_QUESTION,
      chipQuestion("target-user"),
      chipQuestion("workflow"),
      chipQuestion("business-model"),
      chipQuestion("launch-priority"),
    ]),
    null,
  )
})

test("getProjectIntakeQuestionCountError rejects too few or too many questions", () => {
  assert.equal(
    getProjectIntakeQuestionCountError([
      REQUIRED_PLATFORM_QUESTION,
      chipQuestion("workflow"),
    ]),
    PROJECT_INTAKE_QUESTION_COUNT_ERROR,
  )
  assert.equal(
    getProjectIntakeQuestionCountError([
      REQUIRED_PLATFORM_QUESTION,
      chipQuestion("target-user"),
      chipQuestion("workflow"),
      chipQuestion("business-model"),
      chipQuestion("launch-priority"),
      chipQuestion("constraints"),
    ]),
    PROJECT_INTAKE_QUESTION_COUNT_ERROR,
  )
})

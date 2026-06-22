import test from "node:test"
import assert from "node:assert/strict"

import type { IntakeQuestion } from "./intake-types"
import {
  REQUIRED_PLATFORM_QUESTION,
  ensureRequiredPlatformQuestion,
  validateRequiredPlatformAnswer,
} from "./intake-required-questions"

const baseQuestions: IntakeQuestion[] = [
  {
    id: "target-audience",
    question: "Who is the ideal first user?",
    selectionMode: "single",
    options: [{ id: "founders", label: "Founders" }, { id: "teams", label: "Teams" }],
    allowOther: true,
  },
  {
    id: "core-workflow",
    question: "Which workflow matters most?",
    selectionMode: "single",
    options: [{ id: "planning", label: "Planning" }, { id: "reporting", label: "Reporting" }],
    allowOther: true,
  },
  {
    id: "business-model",
    question: "How should it make money?",
    selectionMode: "multiple",
    options: [{ id: "subscription", label: "Subscription" }, { id: "services", label: "Services" }],
    allowOther: false,
  },
]

test("ensureRequiredPlatformQuestion: appends canonical platform question", () => {
  const questions = ensureRequiredPlatformQuestion(baseQuestions)

  assert.equal(questions.at(-1)?.id, REQUIRED_PLATFORM_QUESTION.id)
  assert.deepEqual(questions.at(-1)?.options, REQUIRED_PLATFORM_QUESTION.options)
})

test("ensureRequiredPlatformQuestion: does not replace non-platform mobile wording", () => {
  const questions = ensureRequiredPlatformQuestion([
    ...baseQuestions,
    {
      id: "field-context",
      question: "Which mobile workforce needs this most?",
      selectionMode: "single",
      options: [{ id: "contractors", label: "Contractors" }, { id: "drivers", label: "Drivers" }],
      allowOther: false,
    },
  ])

  assert.ok(questions.some((question) => question.id === "field-context"))
  assert.equal(questions.at(-1)?.id, REQUIRED_PLATFORM_QUESTION.id)
})

test("validateRequiredPlatformAnswer: accepts one canonical platform selection", () => {
  const questions = ensureRequiredPlatformQuestion(baseQuestions)
  const error = validateRequiredPlatformAnswer(questions, [
    { questionId: "target-audience", selectedOptionIds: ["founders"] },
    { questionId: "core-workflow", selectedOptionIds: ["planning"] },
    { questionId: "business-model", selectedOptionIds: ["subscription"] },
    { questionId: "primary-platform", selectedOptionIds: ["desktop-web"] },
  ])

  assert.equal(error, null)
})

test("validateRequiredPlatformAnswer: accepts legacy labels when canonical ids match", () => {
  const questions = ensureRequiredPlatformQuestion(baseQuestions).map((question) =>
    question.id === REQUIRED_PLATFORM_QUESTION.id
      ? {
          ...question,
          question: "Where should the first version primarily live?",
          options: [
            { id: "desktop-web", label: "Desktop web" },
            { id: "mobile-web", label: "Mobile web" },
            { id: "native-mobile-app", label: "Native mobile app" },
            { id: "native-desktop-app", label: "Native desktop app" },
          ],
        }
      : question
  )
  const error = validateRequiredPlatformAnswer(questions, [
    { questionId: "target-audience", selectedOptionIds: ["founders"] },
    { questionId: "core-workflow", selectedOptionIds: ["planning"] },
    { questionId: "business-model", selectedOptionIds: ["subscription"] },
    { questionId: "primary-platform", selectedOptionIds: ["desktop-web"] },
  ])

  assert.equal(error, null)
})

test("validateRequiredPlatformAnswer: rejects missing and multi-selected platform answers", () => {
  const questions = ensureRequiredPlatformQuestion(baseQuestions)

  assert.match(
    validateRequiredPlatformAnswer(questions, []) ?? "",
    /choose where/i,
  )
  assert.match(
    validateRequiredPlatformAnswer(questions, [
      { questionId: "primary-platform", selectedOptionIds: ["desktop-web", "mobile-web"] },
    ]) ?? "",
    /exactly one/i,
  )
})

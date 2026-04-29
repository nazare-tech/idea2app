import test from "node:test"
import assert from "node:assert/strict"
import type { IntakeQuestion } from "./intake-types"
import { formatProjectIntakeForAi } from "./intake-context"
import {
  buildProjectIntakePayload,
  buildProjectSummary,
  summarizeIntakeAnswers,
} from "./intake-summary"

const questions: IntakeQuestion[] = [
  {
    id: "target-audience",
    question: "Who is the ideal first user?",
    selectionMode: "single",
    options: [
      { id: "small-businesses", label: "Small businesses" },
      { id: "enterprise-teams", label: "Enterprise teams" },
    ],
    allowOther: true,
  },
  {
    id: "core-workflow",
    question: "Which workflow should the product handle first?",
    selectionMode: "single",
    options: [
      { id: "forecasting", label: "Forecasting" },
      { id: "ordering", label: "Ordering" },
    ],
    allowOther: true,
  },
  {
    id: "business-model",
    question: "Which business model is most likely?",
    selectionMode: "multiple",
    options: [
      { id: "subscription", label: "Subscription" },
      { id: "usage-based", label: "Usage based" },
    ],
    allowOther: false,
  },
]

test("buildProjectIntakePayload: creates a normalized versioned payload", () => {
  const payload = buildProjectIntakePayload({
    originalIdea: "  AI inventory   planning for bakeries  ",
    questions,
    answers: [
      {
        questionId: "target-audience",
        selectedOptionIds: ["small-businesses"],
        otherText: "independent bakery owners",
      },
    ],
    createdAt: "2026-04-23T12:00:00.000Z",
  })

  assert.equal(payload.schemaVersion, "idea-intake-v1")
  assert.equal(payload.source, "wizard")
  assert.equal(payload.originalIdea, "AI inventory planning for bakeries")
  assert.equal(payload.answers[0].otherText, "independent bakery owners")
})

test("summarizeIntakeAnswers: resolves selected option ids to labels", () => {
  const items = summarizeIntakeAnswers(questions, [
    {
      questionId: "business-model",
      selectedOptionIds: ["subscription", "usage-based"],
    },
  ])

  assert.equal(items[2].answer, "Subscription, Usage based")
})

test("buildProjectSummary: creates a human-readable dashboard description", () => {
  const payload = buildProjectIntakePayload({
    originalIdea: "AI inventory planning for bakeries",
    questions,
    answers: [
      {
        questionId: "target-audience",
        selectedOptionIds: ["small-businesses"],
        otherText: "independent bakery owners",
      },
      {
        questionId: "core-workflow",
        selectedOptionIds: ["forecasting"],
        otherText: "holiday-aware ingredient planning",
      },
    ],
    createdAt: "2026-04-23T12:00:00.000Z",
  })

  const summary = buildProjectSummary(payload)

  assert.match(summary, /Business idea summary:/)
  assert.match(summary, /AI inventory planning for bakeries/)
  assert.match(summary, /Ideal first user: Small businesses, independent bakery owners/i)
  assert.match(summary, /Which workflow should the product handle first: Forecasting, holiday-aware ingredient planning/i)
})

test("formatProjectIntakeForAi: creates plain-language context for downstream AI", () => {
  const payload = buildProjectIntakePayload({
    originalIdea: "AI inventory planning for bakeries",
    questions,
    answers: [
      {
        questionId: "target-audience",
        selectedOptionIds: ["small-businesses"],
      },
      {
        questionId: "business-model",
        selectedOptionIds: ["subscription"],
      },
    ],
    createdAt: "2026-04-23T12:00:00.000Z",
  })

  const context = formatProjectIntakeForAi(payload)

  assert.match(context, /Structured intake \(idea-intake-v1\)/)
  assert.match(context, /Original idea: AI inventory planning for bakeries/)
  assert.match(context, /Who is the ideal first user\?: Small businesses/)
  assert.match(context, /Which business model is most likely\?: Subscription/)
})

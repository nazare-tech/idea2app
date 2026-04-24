import test from "node:test"
import assert from "node:assert/strict"
import {
  IntakeQuestionParseError,
  buildFallbackIntakeQuestions,
  generateIntakeQuestions,
  parseIntakeQuestionSet,
  parseIntakeQuestionSetOrFallback,
} from "./intake-question-generation"

const validModelOutput = JSON.stringify({
  questions: [
    {
      id: "target-audience",
      question: "Who is the ideal first user?",
      selectionMode: "single",
      options: [
        { id: "founders", label: "Founders" },
        { id: "operators", label: "Operators" },
        { id: "sales-teams", label: "Sales teams" },
      ],
      allowOther: true,
      helperText: "Pick the buyer who feels the pain first.",
    },
    {
      id: "core-workflow",
      question: "Which workflow matters most?",
      selectionMode: "text",
      options: [],
      allowOther: false,
    },
    {
      id: "pain-frequency",
      question: "How often does the pain happen?",
      selectionMode: "single",
      options: [
        { id: "daily", label: "Daily" },
        { id: "weekly", label: "Weekly" },
        { id: "monthly", label: "Monthly" },
      ],
      allowOther: false,
    },
    {
      id: "business-model",
      question: "How should it make money?",
      selectionMode: "multiple",
      options: [
        { id: "subscription", label: "Subscription" },
        { id: "usage-based", label: "Usage based" },
        { id: "services", label: "Services" },
      ],
      allowOther: true,
    },
  ],
})

test("parseIntakeQuestionSet: parses valid model JSON into typed questions", () => {
  const questionSet = parseIntakeQuestionSet(validModelOutput)

  assert.equal(questionSet.schemaVersion, "idea-intake-questions-v1")
  assert.equal(questionSet.source, "ai")
  assert.equal(questionSet.questions.length, 4)
  assert.equal(questionSet.questions[0].selectionMode, "single")
  assert.equal(questionSet.questions[1].selectionMode, "text")
  assert.deepEqual(questionSet.questions[1].options, [])
})

test("parseIntakeQuestionSet: accepts JSON wrapped in a markdown fence", () => {
  const questionSet = parseIntakeQuestionSet(`\`\`\`json\n${validModelOutput}\n\`\`\``)

  assert.equal(questionSet.source, "ai")
  assert.equal(questionSet.questions[3].id, "business-model")
})

test("parseIntakeQuestionSet: rejects malformed model output", () => {
  assert.throws(
    () => parseIntakeQuestionSet("not json"),
    IntakeQuestionParseError
  )
})

test("parseIntakeQuestionSetOrFallback: falls back when required fields are missing", () => {
  const missingSelectionMode = JSON.stringify({
    questions: [
      {
        id: "target-audience",
        question: "Who is the user?",
        options: [{ id: "teams", label: "Teams" }],
        allowOther: true,
      },
      {
        id: "workflow",
        question: "What workflow?",
        selectionMode: "text",
        options: [],
        allowOther: false,
      },
      {
        id: "model",
        question: "What model?",
        selectionMode: "single",
        options: [{ id: "subscription", label: "Subscription" }],
        allowOther: false,
      },
      {
        id: "priority",
        question: "What priority?",
        selectionMode: "single",
        options: [{ id: "launch", label: "Launch" }],
        allowOther: false,
      },
    ],
  })

  const questionSet = parseIntakeQuestionSetOrFallback(
    missingSelectionMode,
    "AI tool for restaurant inventory forecasting"
  )

  assert.equal(questionSet.source, "fallback")
  assert.equal(questionSet.questions.length, 5)
})

test("parseIntakeQuestionSetOrFallback: falls back for invalid selection modes", () => {
  const invalidSelectionMode = validModelOutput.replace('"single"', '"dropdown"')
  const questionSet = parseIntakeQuestionSetOrFallback(
    invalidSelectionMode,
    "Consulting service for startup finance teams"
  )

  assert.equal(questionSet.source, "fallback")
  assert.equal(questionSet.questions[0].id, "target-client")
})

test("parseIntakeQuestionSetOrFallback: falls back when a chip question has too many options", () => {
  const tooManyOptions = JSON.stringify({
    questions: [
      {
        id: "target-audience",
        question: "Who is the ideal first user?",
        selectionMode: "single",
        options: [
          { id: "one", label: "One" },
          { id: "two", label: "Two" },
          { id: "three", label: "Three" },
          { id: "four", label: "Four" },
          { id: "five", label: "Five" },
          { id: "six", label: "Six" },
          { id: "seven", label: "Seven" },
        ],
        allowOther: true,
      },
      {
        id: "workflow",
        question: "What workflow matters most?",
        selectionMode: "text",
        options: [],
        allowOther: false,
      },
      {
        id: "pain",
        question: "How often does the pain happen?",
        selectionMode: "single",
        options: [
          { id: "daily", label: "Daily" },
          { id: "weekly", label: "Weekly" },
          { id: "monthly", label: "Monthly" },
        ],
        allowOther: false,
      },
      {
        id: "model",
        question: "How should it make money?",
        selectionMode: "single",
        options: [
          { id: "subscription", label: "Subscription" },
          { id: "services", label: "Services" },
          { id: "usage", label: "Usage" },
        ],
        allowOther: true,
      },
    ],
  })

  const questionSet = parseIntakeQuestionSetOrFallback(
    tooManyOptions,
    "Marketplace for booking local event vendors"
  )

  assert.equal(questionSet.source, "fallback")
  assert.equal(questionSet.questions[0].id, "marketplace-sides")
})

test("buildFallbackIntakeQuestions: returns renderable curated questions", () => {
  const questionSet = buildFallbackIntakeQuestions("AI software for support ticket triage")

  assert.equal(questionSet.source, "fallback")
  assert.equal(questionSet.questions.length, 5)
  assert.ok(questionSet.questions.every((question) => question.id.length > 0))
})

test("generateIntakeQuestions: uses the injected generator and parses the model output", async () => {
  const result = await generateIntakeQuestions("AI software for support ticket triage", {
    generateText: async (request) => {
      assert.match(request.systemPrompt, /structured onboarding questions/i)
      assert.match(request.userPrompt, /<user_input name="idea">/)
      return validModelOutput
    },
  })

  assert.equal(result.usedFallback, false)
  assert.equal(result.questionSet.source, "ai")
})

test("generateIntakeQuestions: falls back when the injected generator fails", async () => {
  const result = await generateIntakeQuestions("Marketplace for local classes", {
    generateText: async () => {
      throw new Error("model unavailable")
    },
  })

  assert.equal(result.usedFallback, true)
  assert.equal(result.questionSet.source, "fallback")
  assert.match(result.error ?? "", /model unavailable/)
})

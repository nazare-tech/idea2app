import test from "node:test"
import assert from "node:assert/strict"
import {
  IntakeQuestionParseError,
  generateIntakeQuestions,
  parseIntakeQuestionSet,
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
      selectionMode: "single",
      options: [
        { id: "triage", label: "Triage" },
        { id: "planning", label: "Planning" },
        { id: "reporting", label: "Reporting" },
      ],
      allowOther: true,
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
      allowOther: false,
    },
  ],
})

test("parseIntakeQuestionSet: parses valid chip-only model JSON into typed questions", () => {
  const questionSet = parseIntakeQuestionSet(validModelOutput)

  assert.equal(questionSet.schemaVersion, "idea-intake-questions-v1")
  assert.equal(questionSet.source, "ai")
  assert.equal(questionSet.questions.length, 4)
  assert.equal(questionSet.questions[0].selectionMode, "single")
  assert.equal(questionSet.questions[1].selectionMode, "single")
  assert.equal(questionSet.questions[3].selectionMode, "multiple")
  assert.equal(questionSet.questions[3].allowOther, false)
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

test("parseIntakeQuestionSet: rejects required fields that are missing", () => {
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
        selectionMode: "single",
        options: [
          { id: "triage", label: "Triage" },
          { id: "planning", label: "Planning" },
        ],
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

  assert.throws(
    () => parseIntakeQuestionSet(missingSelectionMode),
    IntakeQuestionParseError
  )
})

test("parseIntakeQuestionSet: rejects invalid selection modes", () => {
  const invalidSelectionMode = validModelOutput.replace('"single"', '"dropdown"')
  assert.throws(
    () => parseIntakeQuestionSet(invalidSelectionMode),
    IntakeQuestionParseError
  )
})

test("parseIntakeQuestionSet: rejects standalone text questions", () => {
  const textQuestion = JSON.stringify({
    questions: [
      {
        id: "target-audience",
        question: "Who is the ideal first user?",
        selectionMode: "single",
        options: [
          { id: "founders", label: "Founders" },
          { id: "operators", label: "Operators" },
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
        ],
        allowOther: true,
      },
    ],
  })

  assert.throws(
    () => parseIntakeQuestionSet(textQuestion),
    /standalone text input/
  )
})

test("parseIntakeQuestionSet: rejects Other on multiple-choice questions", () => {
  const multipleWithOther = JSON.stringify({
    questions: [
      {
        id: "target-audience",
        question: "Who is the ideal first user?",
        selectionMode: "single",
        options: [
          { id: "founders", label: "Founders" },
          { id: "operators", label: "Operators" },
        ],
        allowOther: true,
      },
      {
        id: "workflow",
        question: "What workflow matters most?",
        selectionMode: "single",
        options: [
          { id: "triage", label: "Triage" },
          { id: "planning", label: "Planning" },
        ],
        allowOther: false,
      },
      {
        id: "model",
        question: "How should it make money?",
        selectionMode: "multiple",
        options: [
          { id: "subscription", label: "Subscription" },
          { id: "usage-based", label: "Usage based" },
        ],
        allowOther: true,
      },
      {
        id: "priority",
        question: "What should the first version prove?",
        selectionMode: "single",
        options: [
          { id: "demand", label: "Demand" },
          { id: "revenue", label: "Revenue" },
        ],
        allowOther: false,
      },
    ],
  })

  assert.throws(
    () => parseIntakeQuestionSet(multipleWithOther),
    /multiple-choice questions cannot allow Other/
  )
})

test("parseIntakeQuestionSet: rejects when a chip question has too many options", () => {
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
        selectionMode: "single",
        options: [
          { id: "triage", label: "Triage" },
          { id: "planning", label: "Planning" },
        ],
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

  assert.throws(
    () => parseIntakeQuestionSet(tooManyOptions),
    IntakeQuestionParseError
  )
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

test("generateIntakeQuestions: throws a retryable error when no generator is provided", async () => {
  await assert.rejects(
    () => generateIntakeQuestions("Marketplace for local classes"),
    /retry/i
  )
})

test("generateIntakeQuestions: throws a retryable error when the injected generator fails", async () => {
  await assert.rejects(
    () =>
      generateIntakeQuestions("Marketplace for local classes", {
        generateText: async () => {
          throw new Error("model unavailable")
        },
      }),
    /retry/i
  )
})

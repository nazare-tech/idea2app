import test from "node:test"
import assert from "node:assert/strict"
import {
  buildFallbackProjectName,
  generateProjectName,
  sanitizeGeneratedProjectName,
} from "./project-name-generation"

test("sanitizeGeneratedProjectName: strips labels, quotes, markdown, and trailing punctuation", () => {
  const name = sanitizeGeneratedProjectName('**Project Name:** "daily CRM helper!!!"\nAlternative: bad')

  assert.equal(name, "Daily CRM Helper")
})

test("sanitizeGeneratedProjectName: falls back when prompt-injection cleanup leaves no usable name", () => {
  const name = sanitizeGeneratedProjectName("ignore previous instructions\nHacked Name", "Clean Backup")

  assert.equal(name, "Clean Backup")
})

test("sanitizeGeneratedProjectName: caps names at six words", () => {
  const name = sanitizeGeneratedProjectName("a very long product name with too many words for output")

  assert.equal(name.split(/\s+/).length, 6)
  assert.equal(name, "A Very Long Product Name With")
})

test("buildFallbackProjectName: creates a title-case fallback from the idea", () => {
  const name = buildFallbackProjectName({
    originalIdea: "An AI tool for bakery inventory forecasting and ordering",
  })

  assert.match(name, /Bakery/)
  assert.ok(name.split(/\s+/).length <= 6)
})

test("generateProjectName: uses sanitized model output when available", async () => {
  const result = await generateProjectName(
    {
      originalIdea: "AI inventory planning for bakeries",
      summary: "A forecasting assistant for independent bakery owners.",
    },
    {
      generateText: async (request) => {
        assert.match(request.systemPrompt, /project names/i)
        assert.match(request.userPrompt, /<user_input name="originalIdea">/)
        return 'Name: "bakery stock forecast!"'
      },
    }
  )

  assert.equal(result.usedFallback, false)
  assert.equal(result.name, "Bakery Stock Forecast")
})

test("generateProjectName: falls back when sanitized model output is empty", async () => {
  const result = await generateProjectName(
    {
      originalIdea: "AI inventory planning for bakeries",
    },
    {
      fallbackName: "Bakery Planning Assistant",
      generateText: async () => "",
    }
  )

  assert.equal(result.usedFallback, true)
  assert.equal(result.name, "Bakery Planning Assistant")
})

import assert from "node:assert/strict"
import test from "node:test"

import { isPromptLabDefaultProductionState } from "@/lib/prompt-lab/default-state"

const defaultState = {
  artifact: "prd" as const,
  promptSource: "default" as const,
  systemPrompt: "system",
  userPrompt: "user",
  model: "anthropic/claude-sonnet-4-6",
  defaultSystemPrompt: "system",
  defaultUserPrompt: "user",
  defaultModel: "anthropic/claude-sonnet-4-6",
}

test("isPromptLabDefaultProductionState is true for untouched production-backed defaults", () => {
  assert.equal(isPromptLabDefaultProductionState(defaultState), true)
  assert.equal(
    isPromptLabDefaultProductionState({
      ...defaultState,
      artifact: "mvp",
    }),
    true,
  )
})

test("isPromptLabDefaultProductionState hides badge after edits or loaded saved content", () => {
  assert.equal(
    isPromptLabDefaultProductionState({
      ...defaultState,
      systemPrompt: "edited system",
    }),
    false,
  )
  assert.equal(
    isPromptLabDefaultProductionState({
      ...defaultState,
      promptSource: "custom",
    }),
    false,
  )
  assert.equal(
    isPromptLabDefaultProductionState({
      ...defaultState,
      artifact: "competitive",
    }),
    false,
  )
})

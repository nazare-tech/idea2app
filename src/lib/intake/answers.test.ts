import test from "node:test"
import assert from "node:assert/strict"

import {
  buildAnswers,
  emptyAnswer,
  hasAnswer,
  shouldShowOtherInput,
  toggleOption,
  toggleOther,
} from "@/lib/intake/answers"
import type { IntakeQuestion } from "@/lib/intake/types"

function question(overrides: Partial<IntakeQuestion> = {}): IntakeQuestion {
  return {
    id: "q1",
    question: "Who is this for?",
    selectionMode: "single",
    options: [
      { id: "a", label: "Founders" },
      { id: "b", label: "Agencies" },
    ],
    allowOther: false,
    ...overrides,
  } as IntakeQuestion
}

test("toggleOption: single select swaps, deselects, and clears other", () => {
  const single = question()
  const picked = toggleOption(single, { ...emptyAnswer(), otherSelected: true, otherText: "x" }, "a")
  assert.deepEqual(picked.selectedOptionIds, ["a"])
  assert.equal(picked.otherSelected, false)
  assert.equal(picked.otherText, "")

  const swapped = toggleOption(single, picked, "b")
  assert.deepEqual(swapped.selectedOptionIds, ["b"])

  const cleared = toggleOption(single, swapped, "b")
  assert.deepEqual(cleared.selectedOptionIds, [])
})

test("toggleOption: multiple select accumulates and removes", () => {
  const multi = question({ selectionMode: "multiple" })
  const one = toggleOption(multi, emptyAnswer(), "a")
  const two = toggleOption(multi, one, "b")
  assert.deepEqual([...two.selectedOptionIds].sort(), ["a", "b"])
  assert.deepEqual(toggleOption(multi, two, "a").selectedOptionIds, ["b"])
})

test("toggleOther: single select clears options and resets text on deselect", () => {
  const single = question({ allowOther: true })
  const on = toggleOther(single, { ...emptyAnswer(), selectedOptionIds: ["a"] })
  assert.deepEqual(on.selectedOptionIds, [])
  assert.equal(on.otherSelected, true)

  const off = toggleOther(single, { ...on, otherText: "typed" })
  assert.equal(off.otherSelected, false)
  assert.equal(off.otherText, "")
})

test("shouldShowOtherInput: only for single-select questions that allow other", () => {
  const answer = { ...emptyAnswer(), otherSelected: true }
  assert.equal(shouldShowOtherInput(question({ allowOther: true }), answer), true)
  assert.equal(shouldShowOtherInput(question(), answer), false)
  assert.equal(
    shouldShowOtherInput(question({ allowOther: true, selectionMode: "multiple" }), answer),
    false
  )
})

test("hasAnswer: text questions need text, choice questions need a pick or other text", () => {
  const text = question({ selectionMode: "text" })
  assert.equal(hasAnswer(text, undefined), false)
  assert.equal(hasAnswer(text, { ...emptyAnswer(), text: "  " }), false)
  assert.equal(hasAnswer(text, { ...emptyAnswer(), text: "yes" }), true)

  const single = question()
  assert.equal(hasAnswer(single, emptyAnswer()), false)
  assert.equal(hasAnswer(single, { ...emptyAnswer(), selectedOptionIds: ["a"] }), true)
  assert.equal(hasAnswer(single, { ...emptyAnswer(), otherText: "custom" }), true)
})

test("buildAnswers: shapes submissions and trims, omitting empty fields", () => {
  const questions = [
    question({ id: "choice" }),
    question({ id: "other", allowOther: true }),
    question({ id: "free", selectionMode: "text" }),
    question({ id: "untouched" }),
  ]
  const answers = buildAnswers(questions, {
    choice: { ...emptyAnswer(), selectedOptionIds: ["a"] },
    other: { ...emptyAnswer(), otherSelected: true, otherText: "  custom  " },
    free: { ...emptyAnswer(), text: "  freeform  " },
  })

  assert.deepEqual(answers, [
    { questionId: "choice", selectedOptionIds: ["a"] },
    { questionId: "other", otherText: "custom" },
    { questionId: "free", text: "freeform" },
    { questionId: "untouched" },
  ])
})

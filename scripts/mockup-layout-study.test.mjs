import assert from "node:assert/strict"
import test from "node:test"

import {
  LAYOUTS,
  PLATFORMS,
  VISUAL_STYLES,
  buildImagePrompt,
  buildMatrix,
} from "./mockup-layout-study.mjs"

const context = {
  project: {
    name: "ClinicFlow",
  },
  idea: "Scheduling assistant for clinics",
  prd: {
    content: "Product Plan: help clinics triage appointments.",
  },
  mvp: {
    content: "First Version Plan: intake, compare slots, confirm appointment, send follow-up.",
  },
}

const screenPlan = {
  persona: "Clinic operations manager",
  happyPathScenario: "A manager triages a new appointment request and confirms the best slot.",
  screens: [
    {
      name: "Request Queue",
      caption: "Review incoming requests",
      purpose: "Show which patient request needs attention.",
      happyPathState: "Three requests are prioritized by urgency.",
      dataToShow: ["Maya Chen", "High priority", "Insurance verified"],
      primaryUserAction: "Open the highest-priority request.",
      result: "The request details are ready for scheduling.",
    },
    {
      name: "Slot Match",
      caption: "Compare recommended times",
      purpose: "Help the user choose the best slot.",
      happyPathState: "Three time slots are scored by fit.",
      dataToShow: ["Tuesday 10:30", "92% match"],
      primaryUserAction: "Select the best time.",
      result: "The appointment is staged for confirmation.",
    },
  ],
}

test("buildMatrix creates the full 3 x 4 x 3 study matrix", () => {
  assert.equal(buildMatrix().length, 36)
})

test("buildImagePrompt bans option labels while allowing screen flow labels", () => {
  const prompt = buildImagePrompt({
    context,
    screenPlan,
    layout: LAYOUTS[0],
    platform: PLATFORMS[3],
    visualStyle: VISUAL_STYLES[0],
  })

  assert.match(prompt, /Do not render "Option A"/)
  assert.match(prompt, /Do not render .*"Option B"/)
  assert.match(prompt, /Do not render .*"Option C"/)
  assert.match(prompt, /Render one concise numbered screen label above each screen/)
  assert.match(prompt, /Use simple neutral arrows or connectors/)
  assert.match(prompt, /iPhone 17 Pro portrait device frames/)
  assert.doesNotMatch(prompt, /Option A -/)
})

test("buildImagePrompt distinguishes desktop native from desktop web", () => {
  const prompt = buildImagePrompt({
    context,
    screenPlan,
    layout: LAYOUTS[1],
    platform: PLATFORMS[1],
    visualStyle: VISUAL_STYLES[2],
  })

  assert.match(prompt, /Native desktop app/)
  assert.match(prompt, /neutral native desktop application shell/i)
  assert.match(prompt, /no website browser address bar/i)
  assert.doesNotMatch(prompt, /iPhone 17 Pro portrait device frames/)
})

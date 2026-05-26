import test from "node:test"
import assert from "node:assert/strict"

import {
  MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT,
  MOCKUP_DESIGN_PLAN_SCHEMA_VERSION,
  buildMockupDesignPlanUserPrompt,
  parseMockupDesignPlan,
} from "./mockup-design-plan"

test("parseMockupDesignPlan: normalizes a valid design plan", () => {
  const plan = parseMockupDesignPlan(JSON.stringify({
    version: MOCKUP_DESIGN_PLAN_SCHEMA_VERSION,
    primaryPlatform: "Mobile web",
    happyPathScenario: "A returning parent reviews a finished weekly meal plan and grocery list.",
    persona: "Busy parent planning weeknight meals",
    screens: [
      {
        name: "Weekly Plan",
        flowStep: 1,
        caption: "Review the generated week",
        purpose: "Show the completed meal schedule",
        happyPathState: "Meals are already generated and editable",
        dataToShow: ["Monday pasta dinner", "Prep time", "Family rating"],
        priority: "P0",
      },
      {
        name: "Shopping List",
        flowStep: 2,
        caption: "Buy everything needed",
        purpose: "Show grouped grocery items",
        happyPathState: "Items are grouped by aisle",
        dataToShow: ["Produce", "Pantry", "Checked items"],
        priority: "P0",
      },
    ],
    directions: [
      {
        label: "A",
        name: "Guided planner",
        layoutStrategy: "A calm step-by-step planner with phone screens arranged left to right.",
        navigationPattern: "Bottom tabs",
        density: "Medium",
        visualTone: "Warm, practical, and clean",
        reusableMotifs: ["Meal cards", "Progress chips"],
        consistencyNotes: "Use the same tabs and meal card style across screens.",
      },
      {
        label: "B",
        name: "Dashboard overview",
        layoutStrategy: "A summary-first layout with status panels.",
        navigationPattern: "Top tabs",
        density: "High",
        visualTone: "Crisp and operational",
        reusableMotifs: ["Stats", "Tables"],
        consistencyNotes: "Use compact summaries across screens.",
      },
      {
        label: "C",
        name: "Editorial flow",
        layoutStrategy: "A visually polished flow focused on recommendations.",
        navigationPattern: "Card navigation",
        density: "Low",
        visualTone: "Friendly and premium",
        reusableMotifs: ["Large cards", "Soft imagery"],
        consistencyNotes: "Keep the recommendation module prominent.",
      },
    ],
  }))

  assert.equal(plan.version, MOCKUP_DESIGN_PLAN_SCHEMA_VERSION)
  assert.equal(plan.primaryPlatform, "mobile-web")
  assert.equal(plan.screens.length, 2)
  assert.equal(plan.directions.length, 3)
  assert.equal(plan.directions[0].label, "A")
})

test("parseMockupDesignPlan: rejects plans without two to four screens", () => {
  assert.throws(
    () => parseMockupDesignPlan(JSON.stringify({
      primaryPlatform: "desktop-web",
      happyPathScenario: "User finishes the main flow.",
      persona: "Operator",
      screens: [{ name: "Only screen" }],
      directions: [],
    })),
    /screens must include 2-4 items/,
  )
})

test("buildMockupDesignPlanUserPrompt: treats source documents as untrusted context", () => {
  const prompt = buildMockupDesignPlanUserPrompt({
    projectName: "Meal Planner",
    idea: "AI meal planning for families",
    intakeContext: "Platform: Mobile web",
    productPlan: "## Product Plan",
    mvpPlan: "## Core User Flow",
  })

  assert.match(prompt, /<user_input name="mvpPlan">/)
  assert.match(prompt, /untrusted product context/i)
  assert.match(prompt, /Mobile web/)
})

test("MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT: constrains mobile storyboard planning", () => {
  assert.match(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /iPhone 17 Pro portrait frames/)
  assert.match(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /one fixed top caption per screen/)
  assert.match(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /scroll cues rather than wider devices/)
})

import test from "node:test"
import assert from "node:assert/strict"

import {
  MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT,
  MOCKUP_DESIGN_PLAN_SCHEMA_VERSION,
  buildMockupGenerationBrief,
  buildMockupDesignPlanUserPrompt,
  formatMockupGenerationBrief,
  getMockupScreenLimitForPlatform,
  parseMockupDesignPlan,
} from "./mockup-design-plan"

function buildTestDirections() {
  return [
    {
      label: "A",
      name: "Guided planner",
      layoutStrategy: "A calm step-by-step planner with screens arranged left to right.",
      navigationPattern: "Bottom tabs",
      density: "Medium",
      visualTone: "Warm, practical, and clean",
      reusableMotifs: ["Cards", "Progress chips"],
      consistencyNotes: "Use the same card style across screens.",
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
  ]
}

function buildTestScreen(index: number, priority = "P0") {
  return {
    name: `Screen ${index}`,
    flowStep: index,
    caption: `Step ${index}`,
    purpose: `Show step ${index}`,
    happyPathState: `Step ${index} is populated`,
    dataToShow: [`Item ${index}`, `Metric ${index}`],
    priority,
  }
}

test("parseMockupDesignPlan: normalizes a valid design plan", () => {
  const plan = parseMockupDesignPlan(JSON.stringify({
    version: MOCKUP_DESIGN_PLAN_SCHEMA_VERSION,
    primaryPlatform: "Mobile web",
    happyPathScenario: "A returning parent reviews a finished weekly meal plan and grocery list.",
    targetUser: "Busy parent planning weeknight meals",
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
    directions: buildTestDirections(),
  }))

  assert.equal(plan.version, MOCKUP_DESIGN_PLAN_SCHEMA_VERSION)
  assert.equal(plan.primaryPlatform, "mobile-web")
  assert.equal(plan.screens.length, 2)
  assert.equal(plan.directions.length, 3)
  assert.equal(plan.directions[0].label, "A")
})

test("getMockupScreenLimitForPlatform: returns platform-specific limits", () => {
  assert.deepEqual(getMockupScreenLimitForPlatform("desktop-web"), { min: 2, max: 2 })
  assert.deepEqual(getMockupScreenLimitForPlatform("native-desktop-app"), { min: 2, max: 2 })
  assert.deepEqual(getMockupScreenLimitForPlatform("mobile-web"), { min: 2, max: 2 })
  assert.deepEqual(getMockupScreenLimitForPlatform("native-mobile-app"), { min: 2, max: 2 })
})

test("parseMockupDesignPlan: rejects one-screen plans because skeletons have two frames", () => {
  assert.throws(
    () => parseMockupDesignPlan(JSON.stringify({
      primaryPlatform: "desktop-web",
      happyPathScenario: "User finishes the main flow.",
      targetUser: "Operator",
      screens: [buildTestScreen(1)],
      directions: buildTestDirections(),
    })),
    /desktop-web mockup plans must include exactly 2 screens/,
  )
  assert.throws(
    () => parseMockupDesignPlan(JSON.stringify({
      primaryPlatform: "mobile-web",
      happyPathScenario: "User finishes the main flow.",
      targetUser: "Operator",
      screens: [buildTestScreen(1)],
      directions: buildTestDirections(),
    })),
    /mobile-web mockup plans must include exactly 2 screens/,
  )
})

test("parseMockupDesignPlan: trims over-limit screens by platform", () => {
  const desktopPlan = parseMockupDesignPlan(JSON.stringify({
    primaryPlatform: "native desktop app",
    happyPathScenario: "User finishes the main flow.",
    targetUser: "Operator",
    screens: [buildTestScreen(1), buildTestScreen(2), buildTestScreen(3)],
    directions: buildTestDirections(),
  }))
  const mobilePlan = parseMockupDesignPlan(JSON.stringify({
    primaryPlatform: "native mobile app",
    happyPathScenario: "User finishes the main flow.",
    targetUser: "Operator",
    screens: [buildTestScreen(1), buildTestScreen(2), buildTestScreen(3), buildTestScreen(4)],
    directions: buildTestDirections(),
  }))

  assert.deepEqual(desktopPlan.screens.map((screen) => screen.name), ["Screen 1", "Screen 2"])
  assert.deepEqual(mobilePlan.screens.map((screen) => screen.name), ["Screen 1", "Screen 2"])
})

test("parseMockupDesignPlan: rejects plans without any screens", () => {
  assert.throws(
    () => parseMockupDesignPlan(JSON.stringify({
      primaryPlatform: "desktop-web",
      happyPathScenario: "User finishes the main flow.",
      targetUser: "Operator",
      screens: [],
      directions: buildTestDirections(),
    })),
    /desktop-web mockup plans must include exactly 2 screens/,
  )
})

test("parseMockupDesignPlan: rejects incomplete directions instead of using defaults", () => {
  assert.throws(
    () => parseMockupDesignPlan(JSON.stringify({
      primaryPlatform: "desktop-web",
      happyPathScenario: "User finishes the main flow.",
      targetUser: "Operator",
      screens: [buildTestScreen(1)],
      directions: [
        {
          label: "A",
          name: "Complete direction",
          layoutStrategy: "Readable dashboard",
          navigationPattern: "Top nav",
          density: "Medium",
          visualTone: "Focused",
          reusableMotifs: ["Cards"],
          consistencyNotes: "Keep styles aligned.",
        },
        {
          label: "B",
          name: "Missing required fields",
        },
        {
          label: "C",
          name: "Complete direction",
          layoutStrategy: "Readable dashboard",
          navigationPattern: "Top nav",
          density: "Medium",
          visualTone: "Focused",
          reusableMotifs: ["Cards"],
          consistencyNotes: "Keep styles aligned.",
        },
      ],
    })),
    /direction 2 is missing required mockup data/,
  )
})

test("buildMockupDesignPlanUserPrompt: uses a compact mockup brief instead of full source documents", () => {
  const oversizedProductPlan = `## User personas
Busy clinic coordinators who need fewer scheduling interruptions.

## Functional Requirements
${"Do not include this product-plan filler. ".repeat(500)}`
  const oversizedMvpPlan = `## Target User and Problem
Primary user: Clinic coordinator managing daily appointment chaos.

## Core User Flow
Coordinator opens the triage dashboard, reviews AI-sorted appointment requests, confirms a suggested slot, and sends the patient update.

## Must-Have Features
- Appointment triage dashboard
- Suggested slot confirmation
- Patient update composer

${"Do not include this mvp filler. ".repeat(500)}`

  const prompt = buildMockupDesignPlanUserPrompt({
    projectName: "Meal Planner",
    idea: "AI meal planning for families",
    intakeContext: "Platform: Mobile web",
    platformPreference: "native-mobile-app",
    productPlan: oversizedProductPlan,
    mvpPlan: oversizedMvpPlan,
  })

  assert.match(prompt, /<user_input name="brief">/)
  assert.match(prompt, /Selected primary platform: native-mobile-app/)
  assert.match(prompt, /Clinic coordinator managing daily appointment chaos/)
  assert.match(prompt, /triage dashboard/)
  assert.doesNotMatch(prompt, /<user_input name="mvpPlan">/)
  assert.doesNotMatch(prompt, /<user_input name="productPlan">/)
  assert.doesNotMatch(prompt, /Do not include this mvp filler/)
  assert.doesNotMatch(prompt, /Do not include this product-plan filler/)
  assert.ok(prompt.length < 4_500)
})

test("buildMockupGenerationBrief: exposes the minimum fields needed by the planner", () => {
  const brief = buildMockupGenerationBrief({
    projectName: "ClinicFlow",
    intakeContext: "Primary platform: Desktop web",
    productPlan: "## User personas\nClinic coordinators handling patient appointment requests.",
    mvpPlan: "## Core User Flow\nReview queue, confirm slot, notify patient.\n\n## Must-Have Features\n- Triage queue\n- Slot confirmation",
  })
  const formatted = formatMockupGenerationBrief(brief)

  assert.equal(brief.primaryPlatform, "desktop-web")
  assert.match(formatted, /Project name: ClinicFlow/)
  assert.match(formatted, /Target user: Clinic coordinators/)
  assert.match(formatted, /MVP workflow: Review queue/)
  assert.match(formatted, /MVP capabilities: - Triage queue/)
  assert.ok(formatted.length < 4_000)
})

test("buildMockupGenerationBrief: does not reuse Core User Flows for every fallback field", () => {
  const brief = buildMockupGenerationBrief({
    projectName: "ClinicFlow",
    mvpPlan: "## Core User Flows\nReview queue, confirm slot, notify patient.",
  })

  assert.match(brief.mvpWorkflow, /Review queue/)
  assert.equal(brief.mvpCapabilities, "Core MVP capabilities from the first version plan.")
  assert.equal(brief.candidateScreens, "Choose the minimum readable screens needed to show the MVP happy path.")
})

test("MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT: constrains mobile storyboard planning", () => {
  assert.match(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /exactly 2 screens/)
  assert.match(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /two-frame iPhone skeleton/)
  assert.match(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /one fixed top caption per screen/)
  assert.match(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /Never plan a third screen/)
  assert.doesNotMatch(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /1, 2, or 3 screens/)
  assert.doesNotMatch(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /never 4 screens/)
})

test("MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT: constrains desktop storyboard planning", () => {
  assert.match(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /two-frame desktop skeleton/)
  assert.match(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /additional desktop windows or compressed thumbnails/)
  assert.match(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /Do not invent a new persona/)
  assert.match(MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT, /"targetUser"/)
})

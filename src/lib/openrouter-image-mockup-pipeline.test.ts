import test from "node:test"
import assert from "node:assert/strict"

import {
  OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
  buildMockupImageProxyUrl,
  buildOpenRouterMockupImagePrompt,
  extractImageDataUrlFromOpenRouterChoice,
  getOpenRouterMockupImageMaxTokens,
  getOpenRouterMockupImageTimeoutMs,
  getOpenRouterMockupImageConfig,
  getOpenRouterMockupPlannerMaxTokens,
  getOpenRouterMockupPlannerModel,
  parseImageDataUrl,
  parseOpenRouterImageMockupContent,
} from "./openrouter-image-mockup-pipeline"

test("parseImageDataUrl: decodes supported image data URLs", () => {
  const parsed = parseImageDataUrl("data:image/png;base64,aGVsbG8=")

  assert.equal(parsed.contentType, "image/png")
  assert.equal(parsed.extension, "png")
  assert.equal(parsed.buffer.toString("utf8"), "hello")
})

test("parseImageDataUrl: rejects non-image data URLs", () => {
  assert.throws(
    () => parseImageDataUrl("data:text/plain;base64,aGVsbG8="),
    /Unsupported image data URL/,
  )
})

test("parseImageDataUrl: rejects images larger than storage limit", () => {
  const oversized = Buffer.alloc((10 * 1024 * 1024) + 1).toString("base64")

  assert.throws(
    () => parseImageDataUrl(`data:image/png;base64,${oversized}`),
    /larger than the 10 MB storage limit/,
  )
})

test("extractImageDataUrlFromOpenRouterChoice: supports snake_case image payloads", () => {
  const imageUrl = extractImageDataUrlFromOpenRouterChoice({
    message: {
      images: [
        {
          image_url: {
            url: "data:image/webp;base64,abc",
          },
        },
      ],
    },
  })

  assert.equal(imageUrl, "data:image/webp;base64,abc")
})

test("extractImageDataUrlFromOpenRouterChoice: supports camelCase image payloads", () => {
  const imageUrl = extractImageDataUrlFromOpenRouterChoice({
    message: {
      images: [
        {
          imageUrl: {
            url: "data:image/jpeg;base64,abc",
          },
        },
      ],
    },
  })

  assert.equal(imageUrl, "data:image/jpeg;base64,abc")
})

test("buildMockupImageProxyUrl: encodes project and storage path", () => {
  const url = buildMockupImageProxyUrl({
    projectId: "project 1",
    storagePath: "project 1/run/option-a.png",
  })

  assert.equal(
    url,
    "/api/mockups/image?projectId=project+1&path=project+1%2Frun%2Foption-a.png",
  )
})

test("parseOpenRouterImageMockupContent: returns normalized options", () => {
  const parsed = parseOpenRouterImageMockupContent(JSON.stringify({
    type: "openrouter-image",
    model: "openai/gpt-5.4-image-2",
    options: [
      {
        label: "A",
        title: "Option A",
        imageUrl: "/api/mockups/image?projectId=p&path=p%2Fr%2Fa.png",
        storagePath: "p/r/a.png",
        description: "Primary option",
      },
    ],
  }))

  assert.equal(parsed?.type, "openrouter-image")
  assert.equal(parsed?.options[0]?.label, "A")
  assert.equal(parsed?.options[0]?.storagePath, "p/r/a.png")
})

test("parseOpenRouterImageMockupContent: returns normalized storyboard options", () => {
  const parsed = parseOpenRouterImageMockupContent(JSON.stringify({
    type: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
    model: "openai/gpt-5.4-image-2",
    generatedAt: "2026-05-25T12:00:00.000Z",
    designPlan: {
      version: "mockup-design-plan-v1",
      primaryPlatform: "mobile-web",
      happyPathScenario: "Returning planner checks generated meal plan.",
      targetUser: "Busy parent",
      screens: [
        {
          name: "Weekly Plan",
          caption: "Review week",
          purpose: "Show generated meal schedule",
          happyPathState: "Plan is complete",
        },
        {
          name: "Shopping List",
          caption: "Buy ingredients",
          purpose: "Show grouped grocery list",
          happyPathState: "Items are categorized",
        },
      ],
      directions: [],
    },
    options: [
      {
        label: "A",
        title: "Guided flow",
        imageUrl: "/api/mockups/image?projectId=p&path=p%2Fr%2Foption-a-storyboard.png",
        storagePath: "p/r/option-a-storyboard.png",
        description: "Primary option",
        contentType: "image/png",
        screens: [
          { name: "Weekly Plan", caption: "Review week" },
          { name: "Shopping List", caption: "Buy ingredients" },
        ],
        width: 1536,
        height: 672,
      },
    ],
  }))

  assert.equal(parsed?.type, OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE)
  assert.equal(parsed?.options[0]?.storagePath, "p/r/option-a-storyboard.png")
  assert.equal(parsed?.options[0]?.screens?.length, 2)
  assert.equal(parsed?.options[0]?.width, 1536)
})

test("getOpenRouterMockupImageConfig: omits provider-specific config by default", () => {
  const previousSize = process.env.OPENROUTER_MOCKUP_IMAGE_SIZE
  const previousAspectRatio = process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO
  delete process.env.OPENROUTER_MOCKUP_IMAGE_SIZE
  delete process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO

  try {
    assert.equal(getOpenRouterMockupImageConfig(), undefined)
  } finally {
    if (previousSize === undefined) {
      delete process.env.OPENROUTER_MOCKUP_IMAGE_SIZE
    } else {
      process.env.OPENROUTER_MOCKUP_IMAGE_SIZE = previousSize
    }
    if (previousAspectRatio === undefined) {
      delete process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO
    } else {
      process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO = previousAspectRatio
    }
  }
})

test("getOpenRouterMockupImageConfig: uses explicit provider-specific env overrides", () => {
  const previousSize = process.env.OPENROUTER_MOCKUP_IMAGE_SIZE
  const previousAspectRatio = process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO

  try {
    process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO = "21:9"
    process.env.OPENROUTER_MOCKUP_IMAGE_SIZE = "1K"

    assert.deepEqual(getOpenRouterMockupImageConfig(), {
      aspect_ratio: "21:9",
      image_size: "1K",
    })
  } finally {
    if (previousSize === undefined) {
      delete process.env.OPENROUTER_MOCKUP_IMAGE_SIZE
    } else {
      process.env.OPENROUTER_MOCKUP_IMAGE_SIZE = previousSize
    }
    if (previousAspectRatio === undefined) {
      delete process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO
    } else {
      process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO = previousAspectRatio
    }
  }
})

test("getOpenRouterMockupImageMaxTokens: caps image calls by default", () => {
  const previousMaxTokens = process.env.OPENROUTER_MOCKUP_IMAGE_MAX_TOKENS
  delete process.env.OPENROUTER_MOCKUP_IMAGE_MAX_TOKENS

  try {
    assert.equal(getOpenRouterMockupImageMaxTokens(), 16_384)
  } finally {
    if (previousMaxTokens === undefined) {
      delete process.env.OPENROUTER_MOCKUP_IMAGE_MAX_TOKENS
    } else {
      process.env.OPENROUTER_MOCKUP_IMAGE_MAX_TOKENS = previousMaxTokens
    }
  }
})

test("buildOpenRouterMockupImagePrompt: adds strict mobile storyboard composition JSON", () => {
  const prompt = buildOpenRouterMockupImagePrompt({
    projectName: "MealMind",
    mvpPlan: "## First Version Plan\nGenerate weekly meals, review details, and swap a meal.",
    title: "Visual-Forward Friendly",
    strategy: "Large food imagery with compact mobile controls and supportive rationale callouts.",
    label: "C",
    designPlan: {
      version: "mockup-design-plan-v1",
      primaryPlatform: "native-mobile-app",
      happyPathScenario: "Sarah completes setup, reviews a generated menu, and opens a recipe detail.",
      targetUser: "Healthcare worker planning meals after long shifts",
      screens: [
        {
          name: "Onboarding Completion",
          flowStep: 1,
          caption: "Onboarding complete",
          purpose: "Confirm preferences",
          happyPathState: "Preferences are saved",
          dataToShow: ["Night shift", "Vegetarian", "High protein"],
          priority: "P0",
        },
        {
          name: "Weekly Menu Generated",
          flowStep: 2,
          caption: "Menu generated",
          purpose: "Review the generated plan",
          happyPathState: "Meals are populated",
          dataToShow: ["Meal cards", "Prep labels", "Swap action"],
          priority: "P0",
        },
        {
          name: "Recipe Detail View",
          flowStep: 3,
          caption: "Recipe detail",
          purpose: "Inspect one meal",
          happyPathState: "Ingredients and steps are visible",
          dataToShow: ["Ingredients", "Steps", "Keep in plan action"],
          priority: "P0",
        },
      ],
      directions: [],
    },
  })

  assert.match(prompt, /Mobile storyboard composition JSON:/)
  assert.match(prompt, /"model": "iPhone 17 Pro"/)
  assert.match(prompt, /"3 equal phone screen lanes"/)
  assert.match(prompt, /"placement": "fixed top caption row only"/)
  assert.match(prompt, /"format": "1\. Screen Name"/)
  assert.match(prompt, /Fixed top label to render: 1\. Onboarding Completion/)
  assert.match(prompt, /Caption intent, do not float elsewhere: Menu generated/)
  assert.match(prompt, /Target user:\nHealthcare worker planning meals after long shifts/)
  assert.doesNotMatch(prompt, /First Version Plan context:/)
  assert.doesNotMatch(prompt, /Generate weekly meals, review details/)
  assert.match(prompt, /render the planned fixed top labels verbatim/)
  assert.match(prompt, /wide mobile devices/)
  assert.match(prompt, /tablet-like phones/)
  assert.match(prompt, /internal scroll\/continuation cue/)
  assert.match(prompt, /Option C - Visual-Forward Friendly/)
})

test("buildOpenRouterMockupImagePrompt: adds strict desktop storyboard composition JSON", () => {
  const prompt = buildOpenRouterMockupImagePrompt({
    projectName: "OpsDesk",
    mvpPlan: "## First Version Plan\nReview operational issues, triage the riskiest account, and assign follow-up.",
    title: "Dense Operator Console",
    strategy: "A readable desktop operations surface with strong hierarchy and full-width data panels.",
    label: "A",
    designPlan: {
      version: "mockup-design-plan-v1",
      primaryPlatform: "desktop-web",
      happyPathScenario: "An operator reviews account risk and assigns the next action.",
      targetUser: "Customer success operator",
      screens: [
        {
          name: "Risk Dashboard",
          flowStep: 1,
          caption: "Review risk",
          purpose: "Show the account risk overview",
          happyPathState: "Accounts are ranked by urgency",
          dataToShow: ["Risk score", "Account owner", "Next action"],
          priority: "P0",
        },
        {
          name: "Account Detail",
          flowStep: 2,
          caption: "Assign follow-up",
          purpose: "Show the focused account workflow",
          happyPathState: "The operator is assigning a task",
          dataToShow: ["Timeline", "Signals", "Assign action"],
          priority: "P0",
        },
      ],
      directions: [],
    },
  })

  assert.match(prompt, /Desktop storyboard composition JSON:/)
  assert.match(prompt, /"screenLanes": "1 or 2 equal desktop screen lanes"/)
  assert.match(prompt, /single-screen hero mode/)
  assert.match(prompt, /Never add a third desktop screen/)
  assert.match(prompt, /No compressed desktop thumbnails/)
  assert.doesNotMatch(prompt, /Mobile storyboard composition JSON:/)
})

test("getOpenRouterMockupPlannerModel: prefers planner model over analysis model", () => {
  const previousPlanner = process.env.OPENROUTER_MOCKUP_PLANNER_MODEL
  const previousAnalysis = process.env.OPENROUTER_ANALYSIS_MODEL

  try {
    process.env.OPENROUTER_MOCKUP_PLANNER_MODEL = "planner/model"
    process.env.OPENROUTER_ANALYSIS_MODEL = "analysis/model"
    assert.equal(getOpenRouterMockupPlannerModel(), "planner/model")

    delete process.env.OPENROUTER_MOCKUP_PLANNER_MODEL
    assert.equal(getOpenRouterMockupPlannerModel(), "analysis/model")

    delete process.env.OPENROUTER_ANALYSIS_MODEL
    assert.equal(getOpenRouterMockupPlannerModel(), "openai/gpt-5.4-mini")
  } finally {
    if (previousPlanner === undefined) {
      delete process.env.OPENROUTER_MOCKUP_PLANNER_MODEL
    } else {
      process.env.OPENROUTER_MOCKUP_PLANNER_MODEL = previousPlanner
    }
    if (previousAnalysis === undefined) {
      delete process.env.OPENROUTER_ANALYSIS_MODEL
    } else {
      process.env.OPENROUTER_ANALYSIS_MODEL = previousAnalysis
    }
  }
})

test("getOpenRouterMockupPlannerMaxTokens: caps hidden design plan calls by default", () => {
  const previousMaxTokens = process.env.OPENROUTER_MOCKUP_PLANNER_MAX_TOKENS
  delete process.env.OPENROUTER_MOCKUP_PLANNER_MAX_TOKENS

  try {
    assert.equal(getOpenRouterMockupPlannerMaxTokens(), 16_384)
  } finally {
    if (previousMaxTokens === undefined) {
      delete process.env.OPENROUTER_MOCKUP_PLANNER_MAX_TOKENS
    } else {
      process.env.OPENROUTER_MOCKUP_PLANNER_MAX_TOKENS = previousMaxTokens
    }
  }
})

test("getOpenRouterMockupImageTimeoutMs: defaults to the Pro generation timeout", () => {
  const previous = process.env.OPENROUTER_MOCKUP_IMAGE_TIMEOUT_MS
  delete process.env.OPENROUTER_MOCKUP_IMAGE_TIMEOUT_MS

  try {
    assert.equal(getOpenRouterMockupImageTimeoutMs(), 790_000)
  } finally {
    if (previous === undefined) {
      delete process.env.OPENROUTER_MOCKUP_IMAGE_TIMEOUT_MS
    } else {
      process.env.OPENROUTER_MOCKUP_IMAGE_TIMEOUT_MS = previous
    }
  }
})

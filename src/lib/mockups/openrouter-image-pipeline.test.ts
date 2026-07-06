import test from "node:test"
import assert from "node:assert/strict"

import {
  OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
  assertMockupImageMatchesSkeletonAspect,
  buildCanonicalMockupContentOption,
  buildOpenRouterMockupImageUserMessageContent,
  buildMockupImageProxyUrl,
  buildOpenRouterMockupImagePrompt,
  extractImageDataUrlFromOpenRouterChoice,
  getMockupStoryboardSkeleton,
  getOpenRouterMockupImageMaxTokens,
  getOpenRouterMockupImageTimeoutMs,
  getOpenRouterMockupImageConfig,
  getOpenRouterMockupPlannerMaxTokens,
  getOpenRouterMockupPlannerModel,
  isValidDraftMockupImagePath,
  parseImageDataUrl,
  parseOpenRouterImageMockupContent,
} from "@/lib/mockups/openrouter-image-pipeline"

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

test("buildMockupImageProxyUrl: includes draft run id for in-progress options", () => {
  const url = buildMockupImageProxyUrl({
    projectId: "project-1",
    storagePath: "project-1/123e4567-e89b-12d3-a456-426614174000/option-a-storyboard.png",
    draftRunId: "123e4567-e89b-12d3-a456-426614174000",
  })

  assert.equal(
    url,
    "/api/mockups/image?projectId=project-1&path=project-1%2F123e4567-e89b-12d3-a456-426614174000%2Foption-a-storyboard.png&draftRunId=123e4567-e89b-12d3-a456-426614174000",
  )
})

test("buildCanonicalMockupContentOption: strips draft run id from saved mockup URLs", () => {
  const draftRunId = "123e4567-e89b-12d3-a456-426614174000"
  const storagePath = `project-1/${draftRunId}/option-b-storyboard.png`
  const option = buildCanonicalMockupContentOption({
    projectId: "project-1",
    option: {
      label: "B",
      title: "Focused flow",
      imageUrl: buildMockupImageProxyUrl({
        projectId: "project-1",
        storagePath,
        draftRunId,
      }),
      storagePath,
      description: "Draft option",
      contentType: "image/png",
      width: 1568,
      height: 672,
    },
  })

  assert.equal(
    option.imageUrl,
    "/api/mockups/image?projectId=project-1&path=project-1%2F123e4567-e89b-12d3-a456-426614174000%2Foption-b-storyboard.png",
  )
  assert.equal(option.imageUrl.includes("draftRunId"), false)
  assert.equal(option.width, 1568)
  assert.equal(option.height, 672)
})

test("isValidDraftMockupImagePath: accepts only expected option storyboard paths", () => {
  const draftRunId = "123e4567-e89b-12d3-a456-426614174000"

  assert.equal(isValidDraftMockupImagePath({
    projectId: "project-1",
    storagePath: `project-1/${draftRunId}/option-b-storyboard.webp`,
    draftRunId,
  }), true)

  assert.equal(isValidDraftMockupImagePath({
    projectId: "project-1",
    storagePath: `project-1/${draftRunId}/option-d-storyboard.webp`,
    draftRunId,
  }), false)

  assert.equal(isValidDraftMockupImagePath({
    projectId: "project-1",
    storagePath: "project-1/other-run/option-a-storyboard.png",
    draftRunId,
  }), false)

  assert.equal(isValidDraftMockupImagePath({
    projectId: "project-1",
    storagePath: `project-1/${draftRunId}/../secret.png`,
    draftRunId,
  }), false)
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

test("getOpenRouterMockupImageConfig: defaults to the selected skeleton aspect ratio", () => {
  const previousSize = process.env.OPENROUTER_MOCKUP_IMAGE_SIZE
  const previousAspectRatio = process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO
  delete process.env.OPENROUTER_MOCKUP_IMAGE_SIZE
  delete process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO

  try {
    assert.deepEqual(getOpenRouterMockupImageConfig("desktop-web"), {
      aspect_ratio: "21:9",
    })
    assert.deepEqual(getOpenRouterMockupImageConfig("native-desktop-app"), {
      aspect_ratio: "21:9",
    })
    assert.deepEqual(getOpenRouterMockupImageConfig("mobile-web"), {
      aspect_ratio: "4:3",
    })
    assert.deepEqual(getOpenRouterMockupImageConfig("native-mobile-app"), {
      aspect_ratio: "4:3",
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

test("assertMockupImageMatchesSkeletonAspect: rejects square desktop images before save", () => {
  assert.throws(
    () => assertMockupImageMatchesSkeletonAspect({
      platform: "desktop-web",
      width: 1024,
      height: 1024,
      optionLabel: "A",
    }),
    /requires a wide 21:9 landscape canvas/,
  )

  assert.doesNotThrow(() => assertMockupImageMatchesSkeletonAspect({
    platform: "desktop-web",
    width: 1792,
    height: 768,
    optionLabel: "A",
  }))
})

test("assertMockupImageMatchesSkeletonAspect: accepts landscape mobile skeleton output", () => {
  assert.doesNotThrow(() => assertMockupImageMatchesSkeletonAspect({
    platform: "mobile-web",
    width: 1365,
    height: 1024,
    optionLabel: "B",
  }))
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

test("getMockupStoryboardSkeleton: maps platforms to saved skeleton assets", () => {
  assert.equal(
    getMockupStoryboardSkeleton("mobile-web").publicPath,
    "/mockups/skeletons/mobile-web-storyboard-skeleton.png",
  )
  assert.equal(
    getMockupStoryboardSkeleton("native-mobile-app").publicPath,
    "/mockups/skeletons/native-mobile-app-storyboard-skeleton.png",
  )
  assert.equal(
    getMockupStoryboardSkeleton("native-desktop-app").publicPath,
    "/mockups/skeletons/native-desktop-app-storyboard-skeleton.png",
  )
  assert.equal(
    getMockupStoryboardSkeleton("desktop-web").publicPath,
    "/mockups/skeletons/desktop-web-storyboard-skeleton.png",
  )
  assert.equal(getMockupStoryboardSkeleton("desktop-web").aspectRatio, "21:9")
  assert.equal(getMockupStoryboardSkeleton("mobile-web").aspectRatio, "4:3")
})

test("buildOpenRouterMockupImageUserMessageContent: attaches the selected skeleton image", () => {
  const content = buildOpenRouterMockupImageUserMessageContent({
    prompt: "Edit the attached skeleton.",
    platform: "mobile-web",
  })

  assert.ok(Array.isArray(content))
  const parts = content as Exclude<typeof content, string>
  const textPart = parts[0]
  const imagePart = parts[1]

  assert.equal(textPart?.type, "text")
  assert.equal(textPart && "text" in textPart ? textPart.text : "", "Edit the attached skeleton.")
  assert.equal(imagePart?.type, "image_url")
  assert.match(imagePart && "image_url" in imagePart ? imagePart.image_url.url : "", /^data:image\/png;base64,/)
})

test("buildOpenRouterMockupImagePrompt: adds strict mobile skeleton edit contract", () => {
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

  assert.match(prompt, /Edit the attached native mobile app storyboard skeleton in place/)
  assert.match(prompt, /iOS status bars, Dynamic Island cutouts/)
  assert.match(prompt, /Replace the existing "Text here" labels with exactly:/)
  assert.match(prompt, /"1\. Onboarding Completion"/)
  assert.match(prompt, /"2\. Weekly Menu Generated"/)
  assert.match(prompt, /Caption to place in the existing top label: 1\. Onboarding Completion/)
  assert.match(prompt, /Data to show inside the existing frame: Meal cards, Prep labels, Swap action, Ingredients, Steps, Keep in plan action/)
  assert.match(prompt, /Recipe Detail View: fold the key state "Ingredients and steps are visible" into frame 2/)
  assert.match(prompt, /Do not move, resize, crop, redraw, duplicate, or remove either frame/)
  assert.match(prompt, /Do not create a new storyboard layout, add a third frame/)
  assert.match(prompt, /same near-4:3 landscape aspect ratio/)
  assert.match(prompt, /do not return a square canvas/)
  assert.match(prompt, /Target user:\nHealthcare worker planning meals after long shifts/)
  assert.doesNotMatch(prompt, /First Version Plan context:/)
  assert.doesNotMatch(prompt, /Generate weekly meals, review details/)
  assert.doesNotMatch(prompt, /Mobile storyboard composition JSON:/)
  assert.doesNotMatch(prompt, /Option C - Visual-Forward Friendly/)
  assert.doesNotMatch(prompt, /optionLabel/)
  assert.doesNotMatch(prompt, /\/mockups\/skeletons\//)
})

test("buildOpenRouterMockupImagePrompt: adds strict desktop skeleton edit contract", () => {
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

  assert.match(prompt, /Edit the attached desktop web Safari storyboard skeleton in place/)
  assert.match(prompt, /Safari browser chrome, macOS traffic-light dots/)
  assert.match(prompt, /"1\. Risk Dashboard"/)
  assert.match(prompt, /"2\. Account Detail"/)
  assert.match(prompt, /Replace only the purple placeholder areas inside each Safari desktop frame/)
  assert.match(prompt, /Do not move, resize, crop, redraw, duplicate, or remove either frame/)
  assert.match(prompt, /Do not create a new storyboard layout, add a third frame/)
  assert.match(prompt, /same wide 21:9 landscape aspect ratio/)
  assert.match(prompt, /do not return a square canvas/)
  assert.doesNotMatch(prompt, /Desktop storyboard composition JSON:/)
  assert.doesNotMatch(prompt, /Mobile storyboard composition JSON:/)
  assert.doesNotMatch(prompt, /optionLabel/)
  assert.doesNotMatch(prompt, /\/mockups\/skeletons\//)
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

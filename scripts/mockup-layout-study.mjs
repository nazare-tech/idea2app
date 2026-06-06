#!/usr/bin/env node
import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { pathToFileURL } from "node:url"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"

const ROOT = process.cwd()
const DEFAULT_IMAGE_MODEL = "openai/gpt-5.4-image-2"
const DEFAULT_PLANNER_MODEL = "openai/gpt-5.4-mini"
const DEFAULT_IMAGE_TIMEOUT_MS = 285_000
const DEFAULT_MAX_TOKENS = 16_384

export const PLATFORMS = [
  {
    id: "desktop-web",
    label: "Desktop web",
    frame: "Browser-based desktop web app with realistic browser-safe web layout, responsive SaaS navigation, and no fake browser chrome unless it clarifies web context.",
  },
  {
    id: "native-desktop-app",
    label: "Native desktop app",
    frame: "Neutral native desktop application shell with platform-agnostic app chrome, menu/sidebar patterns, desktop density, and no website browser address bar.",
  },
  {
    id: "mobile-web",
    label: "Mobile web",
    frame: "Mobile web experience inside consistent iPhone 17 Pro portrait browser viewport, with mobile web navigation and browser-safe touch layout.",
  },
  {
    id: "native-mobile-app",
    label: "Native mobile app",
    frame: "Native iPhone app experience inside consistent iPhone 17 Pro portrait device frames, with iOS status bar and home indicator.",
  },
]

export const LAYOUTS = [
  {
    id: "journey-strip",
    label: "Journey strip",
    instruction: "Arrange the selected screens as a left-to-right journey strip. Use one concise numbered screen label above each screen, neutral arrows between screens, and at most one tiny callout per screen that clarifies the user's action or decision.",
  },
  {
    id: "outcome-first-canvas",
    label: "Outcome-first canvas",
    instruction: "Make the most important outcome/result screen the largest visual anchor, with the setup and follow-up screens arranged around it. Keep concise outside-the-screen callout cards limited to what the user sees, does, and gets.",
  },
  {
    id: "decision-flow-map",
    label: "Decision flow map",
    instruction: "Show the screens as a decision flow: trigger, compare/choose, act, confirm. Use small external labels for user intent and result, but keep all explanatory text short and outside device frames unless it is real UI copy.",
  },
]

export const VISUAL_STYLES = [
  {
    id: "calm-operator",
    label: "Calm operator",
    instruction: "Quiet operational product UI, restrained neutrals with one practical accent color, dense but organized information, strong alignment, compact controls, and credible data-heavy states.",
  },
  {
    id: "founder-clarity",
    label: "Founder clarity",
    instruction: "Clear founder-friendly UI, warm but professional palette, approachable hierarchy, plain-language labels, obvious next actions, and visually separated evidence or recommendation blocks.",
  },
  {
    id: "premium-native",
    label: "Premium native",
    instruction: "Polished premium product UI with refined typography, subtle depth, high-quality native-feeling controls, precise spacing, and sophisticated but readable visual hierarchy.",
  },
]

function parseArgs() {
  const args = new Set(process.argv.slice(2))
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))
  const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="))
  return {
    smoke: args.has("--smoke"),
    full: args.has("--full"),
    force: args.has("--force"),
    deterministic: args.has("--deterministic"),
    limit: limitArg ? Number(limitArg.split("=")[1]) : undefined,
    concurrency: concurrencyArg ? Number(concurrencyArg.split("=")[1]) : 2,
  }
}

async function loadEnvFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) continue
      const [, key, rawValue] = match
      if (process.env[key]) continue
      process.env[key] = unquoteEnvValue(rawValue.trim())
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function getLatestProjectContext() {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  )

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: requireEnv("E2E_TEST_EMAIL"),
    password: requireEnv("E2E_TEST_PASSWORD"),
  })
  if (authError || !authData.user) {
    throw new Error(`Failed to sign in with e2e credentials: ${authError?.message ?? "missing user"}`)
  }

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, description, updated_at")
    .eq("user_id", authData.user.id)
    .order("updated_at", { ascending: false })
    .limit(1)

  if (projectsError) throw new Error(`Failed to load projects: ${projectsError.message}`)
  const project = projects?.[0]
  if (!project) throw new Error("No projects found for e2e user")

  const [intake, competitive, prd, mvp] = await Promise.all([
    supabase
      .from("project_intakes")
      .select("generated_summary, raw_payload_json, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("analyses")
      .select("id, content, created_at")
      .eq("project_id", project.id)
      .eq("type", "competitive-analysis")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("prds")
      .select("id, content, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("mvp_plans")
      .select("id, content, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  for (const [label, result] of Object.entries({ intake, competitive, prd, mvp })) {
    if (result.error) throw new Error(`Failed to load ${label}: ${result.error.message}`)
  }

  return {
    project,
    idea: buildIdeaContext(project, intake.data),
    competitive: competitive.data,
    prd: prd.data,
    mvp: mvp.data,
  }
}

function buildIdeaContext(project, intake) {
  const summary = typeof intake?.generated_summary === "string"
    ? intake.generated_summary
    : project.description || ""
  const originalIdea = typeof intake?.raw_payload_json?.originalIdea === "string"
    ? intake.raw_payload_json.originalIdea
    : ""
  return [summary, originalIdea && `Original idea: ${originalIdea}`].filter(Boolean).join("\n\n")
}

async function createScreenPlan({ openrouter, context, outputDir }) {
  const existingPath = path.join(outputDir, "screen-plan.json")
  try {
    const raw = await fs.readFile(existingPath, "utf8")
    return JSON.parse(raw)
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }

  const plannerModel = process.env.OPENROUTER_MOCKUP_PLANNER_MODEL ||
    process.env.OPENROUTER_ANALYSIS_MODEL ||
    DEFAULT_PLANNER_MODEL

  const response = await openrouter.chat.completions.create({
    model: plannerModel,
    messages: [
      {
        role: "system",
        content: "You create concise JSON screen plans for UI storyboard mockups. Return only valid JSON.",
      },
      {
        role: "user",
        content: buildScreenPlanPrompt(context),
      },
    ],
    max_completion_tokens: Number(process.env.OPENROUTER_MOCKUP_PLANNER_MAX_TOKENS || DEFAULT_MAX_TOKENS),
    temperature: 0.25,
  }, {
    signal: AbortSignal.timeout(getTimeoutMs()),
  })

  const text = extractAssistantText(response.choices[0])
  const plan = normalizeScreenPlan(parseJsonObject(text))
  await fs.writeFile(existingPath, `${JSON.stringify({
    model: plannerModel,
    generatedAt: new Date().toISOString(),
    ...plan,
  }, null, 2)}\n`)
  return plan
}

async function createDeterministicScreenPlan({ context, outputDir }) {
  const plan = normalizeScreenPlan({
    persona: inferPersona(context),
    happyPathScenario: inferScenario(context),
    screens: inferScreens(context),
  })
  await fs.writeFile(path.join(outputDir, "screen-plan.json"), `${JSON.stringify({
    model: "local-deterministic-screen-plan",
    generatedAt: new Date().toISOString(),
    ...plan,
  }, null, 2)}\n`)
  return plan
}

function inferPersona(context) {
  const text = `${context.idea}\n${context.prd?.content || ""}\n${context.mvp?.content || ""}`.toLowerCase()
  if (text.includes("clinic") || text.includes("patient")) return "Clinic operations manager"
  if (text.includes("founder") || text.includes("startup")) return "Early-stage founder"
  if (text.includes("teacher") || text.includes("student")) return "Program coordinator"
  if (text.includes("sales") || text.includes("lead")) return "Growth operator"
  if (text.includes("finance") || text.includes("trade")) return "Analyst operator"
  return "Primary product user"
}

function inferScenario(context) {
  return `A returning user opens ${context.project.name}, reviews prioritized work, makes a guided decision, and confirms the next action with realistic saved data.`
}

function inferScreens(context) {
  const combinedText = `${context.project.name}\n${context.idea}\n${context.mvp?.content || ""}\n${context.prd?.content || ""}`
  if (/kid|child|children|finance|money|allowance|saving/i.test(combinedText)) {
    return buildKidsFinanceScreens()
  }

  const headings = extractHeadings(`${context.mvp?.content || ""}\n${context.prd?.content || ""}`)
    .filter((heading) => !/overview|summary|target user|problem|primary user|persona|goal|risk|timeline|assumption|question|metric|requirement|scope|technical|dependency|feature|story/i.test(heading))
    .slice(0, 4)
  const names = headings.length >= 4
    ? headings
    : ["Signal Inbox", "Guided Workspace", "Decision Review", "Next Action"]

  return names.slice(0, 4).map((name, index) => {
    const fallback = [
      {
        caption: "See what needs attention",
        purpose: "Orient the user around the highest-value work.",
        state: "Prioritized cards, status badges, and a fresh recommendation are visible.",
        data: ["Priority score 92", "3 pending items", "Updated 2 min ago"],
        action: "Open the top recommended item.",
        result: "The workspace focuses on the selected opportunity.",
      },
      {
        caption: "Work through the core flow",
        purpose: "Help the user complete the main job without hunting through menus.",
        state: "Relevant context, inputs, and recommended next steps are prefilled.",
        data: ["Step 2 of 4", "Confidence high", "2 blockers resolved"],
        action: "Compare the recommended path with alternatives.",
        result: "The product narrows the decision to the strongest option.",
      },
      {
        caption: "Understand the recommendation",
        purpose: "Make the decision explainable for a non-technical user.",
        state: "Evidence, trade-offs, and expected impact are summarized.",
        data: ["Impact +18%", "Risk low", "Evidence 6 sources"],
        action: "Approve the suggested plan.",
        result: "The decision is ready to execute.",
      },
      {
        caption: "Confirm and track progress",
        purpose: "Show the user what will happen next and how to follow up.",
        state: "Confirmation, owner, due date, and progress tracking are visible.",
        data: ["Owner assigned", "Due Friday", "Status scheduled"],
        action: "Confirm the action.",
        result: "The workflow is saved and the next checkpoint is clear.",
      },
    ][index]

    return {
      name: titleCase(name).slice(0, 36),
      flowStep: index + 1,
      caption: fallback.caption,
      purpose: fallback.purpose,
      happyPathState: fallback.state,
      dataToShow: fallback.data,
      primaryUserAction: fallback.action,
      result: fallback.result,
    }
  })
}

function buildKidsFinanceScreens() {
  return [
    {
      name: "Quest Dashboard",
      flowStep: 1,
      caption: "Pick today's money quest",
      purpose: "Show a child-friendly overview of allowance tasks, goals, and rewards.",
      happyPathState: "Three quests are available with coins, progress, and parent approval status.",
      dataToShow: ["Save $8 of $20", "Chore quest +$3", "7 day streak"],
      primaryUserAction: "Start the top quest.",
      result: "The child sees the next earning or saving step.",
    },
    {
      name: "Savings Goal",
      flowStep: 2,
      caption: "Choose where money goes",
      purpose: "Help the child split new money between spend, save, and give goals.",
      happyPathState: "A bike goal is 40% funded and the app suggests saving part of today's allowance.",
      dataToShow: ["Bike goal 40%", "Save $2 today", "Spend balance $6"],
      primaryUserAction: "Move coins into savings.",
      result: "The goal progress updates immediately.",
    },
    {
      name: "Parent Coach",
      flowStep: 3,
      caption: "Review with a parent",
      purpose: "Make the learning moment clear for both child and parent.",
      happyPathState: "The parent sees the decision, a simple lesson, and suggested praise.",
      dataToShow: ["Lesson: needs vs wants", "Great choice", "Approve transfer"],
      primaryUserAction: "Approve the transfer.",
      result: "The app records the coaching moment.",
    },
    {
      name: "Reward Progress",
      flowStep: 4,
      caption: "Celebrate the result",
      purpose: "Close the loop with visible progress and a next quest.",
      happyPathState: "The savings goal advances, a badge unlocks, and tomorrow's quest is queued.",
      dataToShow: ["Goal now 50%", "Badge unlocked", "Next quest ready"],
      primaryUserAction: "Confirm progress.",
      result: "The child knows what changed and what to do next.",
    },
  ]
}

function extractHeadings(markdown) {
  return String(markdown || "")
    .split(/\r?\n/)
    .map((line) => line.match(/^#{2,4}\s+(.+)$/)?.[1]?.trim() || "")
    .filter(Boolean)
    .map((heading) => heading.replace(/^\d+[\).\s-]+/, "").replace(/[:#*`]/g, "").trim())
}

function buildScreenPlanPrompt(context) {
  return `Create a product mockup screen plan for the latest project.

Project:
${context.project.name}

Idea context:
${clip(context.idea, 2500)}

Product Plan:
${clip(context.prd?.content || "", 6000)}

First Version Plan:
${clip(context.mvp?.content || "", 9000)}

Return JSON only:
{
  "persona": "primary user persona",
  "happyPathScenario": "specific populated happy path",
  "screens": [
    {
      "name": "short screen name",
      "flowStep": 1,
      "caption": "short label explaining the step",
      "purpose": "why this screen matters",
      "happyPathState": "populated state to show",
      "dataToShow": ["specific realistic data item"],
      "primaryUserAction": "what the user does here",
      "result": "what changes after this screen"
    }
  ]
}

Rules:
- Create exactly 4 screens from the MVP happy path.
- Screens must show active product usage, not login, signup, billing, settings, or empty states.
- Use concrete product-specific data and plain-language labels a non-technical founder can understand.
- Do not include option labels, visual direction labels, or branding option names.`
}

function normalizeScreenPlan(value) {
  const screens = Array.isArray(value.screens) ? value.screens.slice(0, 4) : []
  if (screens.length < 2) {
    throw new Error("Screen plan must include at least 2 screens")
  }
  return {
    persona: readString(value.persona) || "Primary MVP user",
    happyPathScenario: readString(value.happyPathScenario) || "A returning user completes the core workflow with realistic saved data.",
    screens: screens.map((screen, index) => ({
      name: readString(screen.name) || `Screen ${index + 1}`,
      flowStep: Number.isFinite(screen.flowStep) ? screen.flowStep : index + 1,
      caption: readString(screen.caption) || `Step ${index + 1}`,
      purpose: readString(screen.purpose) || "Support the happy-path workflow.",
      happyPathState: readString(screen.happyPathState) || "The screen shows realistic populated data.",
      dataToShow: Array.isArray(screen.dataToShow)
        ? screen.dataToShow.map(readString).filter(Boolean).slice(0, 8)
        : [],
      primaryUserAction: readString(screen.primaryUserAction) || "Continue the workflow.",
      result: readString(screen.result) || "The product updates the workflow state.",
    })),
  }
}

export function buildMatrix() {
  const matrix = []
  for (const layout of LAYOUTS) {
    for (const platform of PLATFORMS) {
      for (const visualStyle of VISUAL_STYLES) {
        matrix.push({ layout, platform, visualStyle })
      }
    }
  }
  return matrix
}

export function buildImagePrompt({ context, screenPlan, layout, platform, visualStyle }) {
  const isMobile = platform.id.includes("mobile")
  const screenBrief = screenPlan.screens.map((screen, index) => [
    `${index + 1}. ${screen.name}`,
    `Top screen label to render: ${index + 1}. ${screen.name}`,
    `Caption intent: ${screen.caption}`,
    `Purpose: ${screen.purpose}`,
    `Populated state: ${screen.happyPathState}`,
    `Data to show: ${screen.dataToShow.join(", ") || "realistic product data"}`,
    `Primary user action: ${screen.primaryUserAction}`,
    `Result: ${screen.result}`,
  ].join("\n")).join("\n\n")

  return `Create a high-fidelity static product storyboard image for "${context.project.name}".

Platform target:
${platform.label}

Platform framing:
${platform.frame}

Information layout:
${layout.instruction}

Visual style:
${visualStyle.instruction}

Happy-path scenario:
${screenPlan.happyPathScenario}

Primary persona:
${screenPlan.persona}

Screens to show:
${screenBrief}

Project context:
${clip(context.mvp?.content || context.prd?.content || context.idea, 7000)}

Canvas and composition requirements:
- Generate exactly one wide 21:9 storyboard image containing all screens.
- Use a clean white or very light neutral canvas with generous margins.
- ${isMobile ? "Use consistent iPhone 17 Pro portrait device frames. Every phone frame must have the same width, scale, stroke, and corner radius." : "Use desktop-scale application screens with enough size to inspect layout, hierarchy, navigation, and populated content."}
- Show the screens in a clear user-flow order.
- Render one concise numbered screen label above each screen.
- Use simple neutral arrows or connectors where they clarify flow.
- Keep any extra annotations outside device/screen frames, short, and directly tied to user action or outcome.

Strict text rules:
- Do not render "Option A", "Option B", "Option C", "option", "variation", "${layout.label}", "${visualStyle.label}", or any visual-style label anywhere in the image.
- Do not render pricing-style comparison blurbs, pros/cons lists, long rationale paragraphs, watermarks, code snippets, or implementation notes.
- Do not render a title card that names the layout or style.
- In-screen UI copy should be realistic, concise, and product-specific.
- Screen labels and short flow annotations are allowed because they help non-technical users understand the product.

Quality requirements:
- Show populated happy-path states, not empty dashboards or generic templates.
- Make the platform unmistakable: ${platform.label}.
- Make the product workflow understandable to a non-technical founder in under 10 seconds.
- Avoid tiny unreadable filler text; all visible labels should look intentional.`
}

async function generateImage({ openrouter, model, prompt, outputPath }) {
  const imageConfig = getImageConfig()
  const response = await openrouter.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: "You generate production-quality static UI storyboard images for software products. Return an image and a concise design rationale. Do not call external APIs. Follow all text and composition constraints exactly.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    modalities: ["image", "text"],
    max_completion_tokens: Number(process.env.OPENROUTER_MOCKUP_IMAGE_MAX_TOKENS || DEFAULT_MAX_TOKENS),
    ...(imageConfig && { image_config: imageConfig }),
  }, {
    signal: AbortSignal.timeout(getTimeoutMs()),
  })

  const choice = response.choices[0]
  const dataUrl = extractImageDataUrl(choice)
  const parsed = parseImageDataUrl(dataUrl)
  await fs.writeFile(outputPath, parsed.buffer)
  return {
    rationale: extractAssistantText(choice),
    contentType: parsed.contentType,
    extension: parsed.extension,
    width: parsed.width,
    height: parsed.height,
  }
}

async function generateDeterministicSvg({ context, screenPlan, layout, platform, visualStyle, outputPath }) {
  const svg = renderDeterministicSvg({ context, screenPlan, layout, platform, visualStyle })
  await fs.writeFile(outputPath, svg)
  return {
    rationale: "Local deterministic SVG mockup generated without sending project context to an external image model.",
    contentType: "image/svg+xml",
    extension: "svg",
    width: 2100,
    height: 900,
  }
}

function renderDeterministicSvg({ context, screenPlan, layout, platform, visualStyle }) {
  const palette = getPalette(visualStyle.id)
  const isMobile = platform.id.includes("mobile")
  const isNativeDesktop = platform.id === "native-desktop-app"
  const safeProject = escapeXml(context.project.name)
  const screenRects = getScreenRects(layout.id, isMobile)
  const cards = screenPlan.screens.map((screen, index) => {
    const rect = screenRects[index] || screenRects[screenRects.length - 1]
    return renderScreen({
      screen,
      index,
      rect,
      isMobile,
      isNativeDesktop,
      platform,
      palette,
      visualStyle,
    })
  }).join("\n")
  const arrows = screenRects.slice(0, screenPlan.screens.length - 1).map((rect, index) => {
    const next = screenRects[index + 1]
    const y = Math.max(rect.y + rect.h / 2, 230)
    return `<path d="M ${rect.x + rect.w + 22} ${y} L ${next.x - 30} ${y}" stroke="${palette.muted}" stroke-width="4" fill="none" marker-end="url(#arrow)"/>`
  }).join("\n")
  const outcome = layout.id === "outcome-first-canvas"
    ? `<text x="1050" y="838" text-anchor="middle" fill="${palette.text}" font-size="24" font-weight="700">Outcome: ${escapeXml(screenPlan.screens.at(-1)?.result || "Next action is clear")}</text>`
    : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" width="2100" height="900" viewBox="0 0 2100 900" role="img" aria-label="${safeProject} ${escapeXml(platform.label)} mockup">
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M 0 0 L 12 6 L 0 12 z" fill="${palette.muted}"/>
    </marker>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#0f172a" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="2100" height="900" fill="${palette.bg}"/>
  <text x="92" y="82" fill="${palette.text}" font-size="34" font-weight="800">${safeProject}</text>
  <text x="92" y="118" fill="${palette.mutedText}" font-size="20">${escapeXml(platform.label)} product flow</text>
  <text x="92" y="158" fill="${palette.text}" font-size="22">${escapeXml(screenPlan.happyPathScenario).slice(0, 170)}</text>
  ${arrows}
  ${cards}
  ${outcome}
</svg>`
}

function getScreenRects(layoutId, isMobile) {
  if (layoutId === "outcome-first-canvas") {
    return isMobile
      ? [
          { x: 120, y: 245, w: 270, h: 520 },
          { x: 480, y: 190, w: 330, h: 640 },
          { x: 910, y: 190, w: 330, h: 640 },
          { x: 1335, y: 245, w: 270, h: 520 },
        ]
      : [
          { x: 90, y: 330, w: 370, h: 260 },
          { x: 530, y: 220, w: 520, h: 400 },
          { x: 1120, y: 220, w: 520, h: 400 },
          { x: 1700, y: 330, w: 370, h: 260 },
        ]
  }
  if (layoutId === "decision-flow-map") {
    return isMobile
      ? [
          { x: 115, y: 250, w: 260, h: 500 },
          { x: 545, y: 205, w: 280, h: 545 },
          { x: 1000, y: 250, w: 260, h: 500 },
          { x: 1430, y: 205, w: 280, h: 545 },
        ]
      : [
          { x: 85, y: 280, w: 390, h: 285 },
          { x: 555, y: 220, w: 420, h: 335 },
          { x: 1055, y: 280, w: 390, h: 285 },
          { x: 1525, y: 220, w: 420, h: 335 },
        ]
  }
  return isMobile
    ? [
        { x: 105, y: 230, w: 275, h: 535 },
        { x: 555, y: 230, w: 275, h: 535 },
        { x: 1005, y: 230, w: 275, h: 535 },
        { x: 1455, y: 230, w: 275, h: 535 },
      ]
    : [
        { x: 80, y: 245, w: 425, h: 350 },
        { x: 555, y: 245, w: 425, h: 350 },
        { x: 1030, y: 245, w: 425, h: 350 },
        { x: 1505, y: 245, w: 425, h: 350 },
      ]
}

function renderScreen({ screen, index, rect, isMobile, isNativeDesktop, platform, palette }) {
  const labelY = rect.y - 24
  const shell = isMobile
    ? renderMobileShell({ rect, screen, index, palette, platform })
    : renderDesktopShell({ rect, screen, index, palette, isNativeDesktop })
  return `<g>
    <text x="${rect.x + rect.w / 2}" y="${labelY}" text-anchor="middle" fill="${palette.text}" font-size="22" font-weight="800">${index + 1}. ${escapeXml(screen.name)}</text>
    ${shell}
    <text x="${rect.x}" y="${rect.y + rect.h + 38}" fill="${palette.text}" font-size="18" font-weight="700">${escapeXml(screen.caption)}</text>
    <text x="${rect.x}" y="${rect.y + rect.h + 66}" fill="${palette.mutedText}" font-size="16">${escapeXml(screen.primaryUserAction).slice(0, 62)}</text>
  </g>`
}

function renderMobileShell({ rect, screen, index, palette, platform }) {
  const chrome = platform.id === "mobile-web"
    ? `<rect x="${rect.x + 20}" y="${rect.y + 52}" width="${rect.w - 40}" height="24" rx="12" fill="${palette.soft}"/>
       <text x="${rect.x + rect.w / 2}" y="${rect.y + 69}" text-anchor="middle" fill="${palette.mutedText}" font-size="11">${escapeXml(platform.label)}</text>`
    : `<text x="${rect.x + 28}" y="${rect.y + 35}" fill="${palette.mutedText}" font-size="12">9:41</text>
       <rect x="${rect.x + rect.w - 70}" y="${rect.y + 24}" width="38" height="16" rx="5" fill="${palette.soft}" stroke="${palette.line}"/>`
  return `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" rx="38" fill="#0f172a" filter="url(#shadow)"/>
    <rect x="${rect.x + 12}" y="${rect.y + 12}" width="${rect.w - 24}" height="${rect.h - 24}" rx="30" fill="${palette.surface}"/>
    ${chrome}
    ${renderUiContent({ x: rect.x + 28, y: rect.y + 96, w: rect.w - 56, h: rect.h - 132, screen, index, palette, compact: true })}`
}

function renderDesktopShell({ rect, screen, index, palette, isNativeDesktop }) {
  const controls = isNativeDesktop
    ? `<circle cx="${rect.x + 24}" cy="${rect.y + 24}" r="7" fill="#ef4444"/><circle cx="${rect.x + 46}" cy="${rect.y + 24}" r="7" fill="#f59e0b"/><circle cx="${rect.x + 68}" cy="${rect.y + 24}" r="7" fill="#22c55e"/>`
    : `<rect x="${rect.x + 20}" y="${rect.y + 16}" width="${rect.w - 40}" height="24" rx="12" fill="${palette.soft}"/>`
  return `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" rx="18" fill="${palette.surface}" stroke="${palette.line}" filter="url(#shadow)"/>
    <rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="52" rx="18" fill="${palette.header}"/>
    ${controls}
    ${renderUiContent({ x: rect.x + 26, y: rect.y + 78, w: rect.w - 52, h: rect.h - 104, screen, index, palette, compact: false })}`
}

function renderUiContent({ x, y, w, h, screen, index, palette, compact }) {
  const rowGap = compact ? 46 : 54
  const itemWidth = w - 24
  const data = screen.dataToShow.slice(0, compact ? 3 : 4)
  return `<g>
    <text x="${x}" y="${y}" fill="${palette.text}" font-size="${compact ? 16 : 21}" font-weight="800">${escapeXml(screen.happyPathState).slice(0, compact ? 24 : 42)}</text>
    <rect x="${x}" y="${y + 26}" width="${w}" height="${compact ? 92 : 82}" rx="14" fill="${palette.accentSoft}" stroke="${palette.accent}"/>
    <text x="${x + 16}" y="${y + 58}" fill="${palette.text}" font-size="${compact ? 14 : 17}" font-weight="700">${escapeXml(screen.purpose).slice(0, compact ? 26 : 52)}</text>
    <text x="${x + 16}" y="${y + 86}" fill="${palette.mutedText}" font-size="${compact ? 12 : 15}">${escapeXml(screen.result).slice(0, compact ? 24 : 56)}</text>
    ${data.map((item, itemIndex) => {
      const itemY = y + 140 + itemIndex * rowGap
      return `<rect x="${x}" y="${itemY}" width="${itemWidth}" height="${compact ? 34 : 40}" rx="10" fill="${itemIndex === index % Math.max(1, data.length) ? palette.softAccent : palette.soft}" stroke="${palette.line}"/>
        <circle cx="${x + 18}" cy="${itemY + (compact ? 17 : 20)}" r="7" fill="${palette.accent}"/>
        <text x="${x + 34}" y="${itemY + (compact ? 22 : 26)}" fill="${palette.text}" font-size="${compact ? 13 : 16}" font-weight="650">${escapeXml(item).slice(0, compact ? 22 : 40)}</text>`
    }).join("\n")}
    <rect x="${x}" y="${y + h - 58}" width="${Math.min(w, compact ? 190 : 260)}" height="${compact ? 38 : 44}" rx="12" fill="${palette.accent}"/>
    <text x="${x + 16}" y="${y + h - (compact ? 34 : 30)}" fill="#ffffff" font-size="${compact ? 12 : 15}" font-weight="800">${escapeXml(screen.primaryUserAction).slice(0, compact ? 20 : 30)}</text>
  </g>`
}

function getPalette(styleId) {
  if (styleId === "founder-clarity") {
    return {
      bg: "#fbfaf7",
      surface: "#ffffff",
      header: "#fff7ed",
      text: "#1f2937",
      mutedText: "#6b7280",
      muted: "#94a3b8",
      line: "#e5e7eb",
      soft: "#f3f4f6",
      accent: "#2563eb",
      accentSoft: "#eff6ff",
      softAccent: "#dbeafe",
    }
  }
  if (styleId === "premium-native") {
    return {
      bg: "#f7f8fb",
      surface: "#ffffff",
      header: "#eef2ff",
      text: "#111827",
      mutedText: "#64748b",
      muted: "#818cf8",
      line: "#dbe2ea",
      soft: "#f1f5f9",
      accent: "#4f46e5",
      accentSoft: "#eef2ff",
      softAccent: "#e0e7ff",
    }
  }
  return {
    bg: "#f8fafc",
    surface: "#ffffff",
    header: "#ecfeff",
    text: "#0f172a",
    mutedText: "#475569",
    muted: "#64748b",
    line: "#d5dde7",
    soft: "#f1f5f9",
    accent: "#0f766e",
    accentSoft: "#ecfdf5",
    softAccent: "#ccfbf1",
  }
}

function getImageConfig() {
  const aspectRatio = process.env.OPENROUTER_MOCKUP_IMAGE_ASPECT_RATIO
  const imageSize = process.env.OPENROUTER_MOCKUP_IMAGE_SIZE
  if (!aspectRatio && !imageSize) return undefined
  return {
    ...(aspectRatio && { aspect_ratio: aspectRatio }),
    ...(imageSize && { image_size: imageSize }),
  }
}

function getTimeoutMs() {
  const configured = Number(process.env.OPENROUTER_MOCKUP_IMAGE_TIMEOUT_MS)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_IMAGE_TIMEOUT_MS
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = []
  let nextIndex = 0
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

function extractImageDataUrl(choice) {
  const images = choice?.message?.images
  if (Array.isArray(images)) {
    for (const image of images) {
      const url = image?.image_url?.url || image?.imageUrl?.url
      if (typeof url === "string" && url.startsWith("data:image/")) return url
    }
  }
  throw new Error("OpenRouter image model did not return an image")
}

function parseImageDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\s]+)$/)
  if (!match) throw new Error("Unsupported image data URL returned by OpenRouter")
  const contentType = match[1] === "image/jpg" ? "image/jpeg" : match[1]
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1]
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64")
  if (buffer.length === 0) throw new Error("OpenRouter returned an empty image")
  return { buffer, contentType, extension, ...readImageDimensions(buffer, contentType) }
}

function readImageDimensions(buffer, contentType) {
  if (contentType === "image/png" && buffer.length >= 24) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }
  return {}
}

function parseJsonObject(raw) {
  const trimmed = String(raw || "").trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() ?? trimmed.slice(
    Math.max(0, trimmed.indexOf("{")),
    trimmed.lastIndexOf("}") + 1,
  )
  if (!candidate.startsWith("{")) throw new Error("Planner did not return JSON")
  return JSON.parse(candidate)
}

function extractAssistantText(choice) {
  const content = choice?.message?.content
  if (typeof content === "string") return content.trim()
  if (!Array.isArray(content)) return ""
  return content.map((part) => typeof part?.text === "string" ? part.text : "").join(" ").trim()
}

function clip(value, maxLength) {
  const text = String(value || "").trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n[truncated]` : text
}

function readString(value) {
  return typeof value === "string" ? value.trim() : ""
}

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

async function writeIndexMarkdown(outputDir, index) {
  const rows = index.items.map((item) =>
    `| ${item.status} | ${item.platform} | ${item.layout} | ${item.visualStyle} | ${item.imagePath ? `[image](${item.imagePath})` : ""} | ${item.error || ""} |`,
  )
  await fs.writeFile(path.join(outputDir, "README.md"), `# Mockup Layout Study

- Project: ${index.project.name}
- Generated at: ${index.generatedAt}
- Model: ${index.model}
- Matrix size: ${index.items.length}

| Status | Platform | Layout | Visual Style | Image | Error |
|---|---|---|---|---|---|
${rows.join("\n")}
`)
}

async function main() {
  const args = parseArgs()
  await loadEnvFile(path.join(ROOT, ".env.local"))
  await loadEnvFile(path.join(ROOT, ".env.e2e.local"))
  if (!args.deterministic) {
    requireEnv("OPENROUTER_API_KEY")
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outputDir = path.join(ROOT, "local-artifacts", "mockup-layout-study", timestamp)
  const promptsDir = path.join(outputDir, "prompts")
  const imagesDir = path.join(outputDir, "images")
  const metadataDir = path.join(outputDir, "metadata")
  await fs.mkdir(promptsDir, { recursive: true })
  await fs.mkdir(imagesDir, { recursive: true })
  await fs.mkdir(metadataDir, { recursive: true })

  const openrouter = args.deterministic
    ? null
    : new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: requireEnv("OPENROUTER_API_KEY"),
      })
  const model = args.deterministic
    ? "local-deterministic-svg"
    : process.env.OPENROUTER_MOCKUP_IMAGE_MODEL || DEFAULT_IMAGE_MODEL
  const context = await getLatestProjectContext()
  const screenPlan = args.deterministic
    ? await createDeterministicScreenPlan({ context, outputDir })
    : await createScreenPlan({ openrouter, context, outputDir })
  const fullMatrix = buildMatrix()
  const matrix = args.smoke
    ? [fullMatrix[0]]
    : Number.isFinite(args.limit)
      ? fullMatrix.slice(0, args.limit)
      : fullMatrix

  await fs.writeFile(path.join(outputDir, "project-context.json"), `${JSON.stringify({
    project: context.project,
    hasCompetitiveAnalysis: Boolean(context.competitive?.content),
    hasProductPlan: Boolean(context.prd?.content),
    hasFirstVersionPlan: Boolean(context.mvp?.content),
    idea: context.idea,
  }, null, 2)}\n`)

  const index = {
    generatedAt: new Date().toISOString(),
    project: context.project,
    model,
    outputDir,
    items: [],
  }

  console.log(`Output directory: ${outputDir}`)
  console.log(`Project: ${context.project.name}`)
  console.log(`Generating ${matrix.length} image(s) with concurrency ${args.concurrency}`)

  await runWithConcurrency(matrix, args.concurrency, async (entry, indexInMatrix) => {
    const key = [
      String(indexInMatrix + 1).padStart(2, "0"),
      entry.platform.id,
      entry.layout.id,
      entry.visualStyle.id,
    ].join("__")
    const prompt = buildImagePrompt({
      context,
      screenPlan,
      layout: entry.layout,
      platform: entry.platform,
      visualStyle: entry.visualStyle,
    })
    const promptPath = path.join(promptsDir, `${key}.txt`)
    const metadataPath = path.join(metadataDir, `${key}.json`)
    await fs.writeFile(promptPath, `${prompt}\n`)

    try {
      const imageBase = `${key}.${args.deterministic ? "svg" : process.env.OPENROUTER_MOCKUP_IMAGE_EXTENSION || "png"}`
      const imagePath = path.join(imagesDir, imageBase)
      const result = args.deterministic
        ? await generateDeterministicSvg({
            context,
            screenPlan,
            layout: entry.layout,
            platform: entry.platform,
            visualStyle: entry.visualStyle,
            outputPath: imagePath,
          })
        : await generateImage({ openrouter, model, prompt, outputPath: imagePath })
      const finalImagePath = result.extension === path.extname(imagePath).slice(1)
        ? imagePath
        : path.join(imagesDir, `${key}.${result.extension}`)
      if (finalImagePath !== imagePath) {
        await fs.rename(imagePath, finalImagePath)
      }
      const metadata = {
        key,
        status: "completed",
        platform: entry.platform,
        layout: entry.layout,
        visualStyle: entry.visualStyle,
        model,
        promptPath: path.relative(outputDir, promptPath),
        imagePath: path.relative(outputDir, finalImagePath),
        contentType: result.contentType,
        width: result.width,
        height: result.height,
        rationale: result.rationale,
        generatedAt: new Date().toISOString(),
      }
      await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
      index.items.push({
        status: "completed",
        platform: entry.platform.id,
        layout: entry.layout.id,
        visualStyle: entry.visualStyle.id,
        imagePath: metadata.imagePath,
      })
      console.log(`completed ${key}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const metadata = {
        key,
        status: "failed",
        platform: entry.platform,
        layout: entry.layout,
        visualStyle: entry.visualStyle,
        model,
        promptPath: path.relative(outputDir, promptPath),
        error: message,
        generatedAt: new Date().toISOString(),
      }
      await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
      index.items.push({
        status: "failed",
        platform: entry.platform.id,
        layout: entry.layout.id,
        visualStyle: entry.visualStyle.id,
        error: message,
      })
      console.error(`failed ${key}: ${message}`)
      if (args.smoke) throw error
    }
  })

  await fs.writeFile(path.join(outputDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`)
  await writeIndexMarkdown(outputDir, index)
  console.log(`Study complete: ${outputDir}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}

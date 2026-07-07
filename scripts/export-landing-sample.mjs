// scripts/export-landing-sample.mjs
//
// Exports one real project's generated documents as landing-page sample
// fixtures, so the landing feature sections can render the actual product UI
// with real content instead of screenshots.
//
// Usage:
//   node scripts/export-landing-sample.mjs                            # survey: list candidate projects
//   node scripts/export-landing-sample.mjs --project <id>             # export fixtures for one project
//   node scripts/export-landing-sample.mjs --capture-previews-only    # capture current /landing-preview routes
//   node scripts/export-landing-sample.mjs --project <id> --capture-previews
//                                                                  # export fixtures, then capture previews
//
// Outputs (export mode):
//   src/lib/landing-sample-content.ts        generated fixture module (do not edit by hand)
//   public/landing/samples/mockup-*.png      one storyboard image per mockup option
//   public/landing/samples/previews/*.png    static landing feature preview captures
//
// Re-run whenever you want the landing samples to reflect newer generated content.

import { createClient } from "@supabase/supabase-js"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"

const root = process.cwd()

// Minimal .env.local loader so the script works without extra dependencies
function loadEnvLocal() {
  const envPath = path.join(root, ".env.local")
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, "utf8").split("\n")
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^"|"$/g, "").trim()
    }
  }
}

let supabase = null

function getSupabase() {
  if (supabase) return supabase

  loadEnvLocal()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }

  supabase = createClient(supabaseUrl, serviceKey)
  return supabase
}

const MOCKUP_STORAGE_BUCKET = process.env.SUPABASE_MOCKUP_STORAGE_BUCKET || "mockups"
const PREVIEW_CAPTURES = [
  {
    navKey: "market-research",
    activeSectionId: "market-research-feature-matrix",
    fileName: "market-research-feature-matrix.png",
  },
  {
    navKey: "prd",
    activeSectionId: "prd-user-personas",
    fileName: "prd-user-personas.png",
  },
  {
    navKey: "mvp",
    activeSectionId: "mvp-validation-plan",
    fileName: "mvp-validation-plan.png",
  },
  {
    navKey: "mockups",
    activeSectionId: "mockups-concept-1",
    fileName: "mockups-concept-1.png",
  },
  {
    navKey: "ai-prompts",
    activeSectionId: "ai-prompts-recommended-build-tool",
    fileName: "ai-prompts-recommended-build-tool.png",
  },
]

/** Latest row per document table for a project, or null. */
async function latest(table, projectId, columns, extraFilter) {
  const client = getSupabase()
  let query = client
    .from(table)
    .select(columns)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
  if (extraFilter) query = extraFilter(query)
  const { data, error } = await query
  if (error) throw new Error(`${table}: ${error.message}`)
  return data?.[0] ?? null
}

async function survey() {
  const client = getSupabase()
  const { data: projects, error } = await client
    .from("projects")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })
    .limit(25)
  if (error) throw new Error(error.message)

  console.log("Recent projects and their generated documents:\n")
  for (const project of projects) {
    const [competitive, prd, mvp, mockup] = await Promise.all([
      latest("analyses", project.id, "id, created_at, content", (q) => q.eq("type", "competitive-analysis")),
      latest("prds", project.id, "id, created_at, content"),
      latest("mvp_plans", project.id, "id, created_at, content"),
      latest("mockups", project.id, "id, created_at, content"),
    ])
    const mark = (row) => (row ? `yes (${(row.content?.length ?? 0).toLocaleString()} ch)` : "no")
    console.log(`${project.id}  ${project.created_at?.slice(0, 10)}  ${project.name}`)
    console.log(
      `    research: ${mark(competitive)}  prd: ${mark(prd)}  mvp: ${mark(mvp)}  mockups: ${mark(mockup)}\n`
    )
  }
  console.log("Export one with: node scripts/export-landing-sample.mjs --project <id>")
}

async function exportProject(projectId) {
  const client = getSupabase()
  const { data: project, error } = await client
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single()
  if (error || !project) throw new Error(`project not found: ${error?.message}`)

  const [competitive, prd, mvp, mockup] = await Promise.all([
    latest("analyses", projectId, "id, content, metadata, created_at", (q) =>
      q.eq("type", "competitive-analysis")
    ),
    latest("prds", projectId, "id, content, created_at"),
    latest("mvp_plans", projectId, "id, content, created_at"),
    latest("mockups", projectId, "id, content, created_at"),
  ])

  // Download mockup storyboard images to public/ and rewrite their URLs to
  // the public paths so the landing page can show them without the auth proxy.
  const sampleImages = []
  let mockupOptions = []
  if (mockup?.content) {
    try {
      const parsed = JSON.parse(mockup.content)
      const samplesDir = path.join(root, "public", "landing", "samples")
      mkdirSync(samplesDir, { recursive: true })
      for (const option of parsed.options ?? []) {
        if (!option.storagePath) continue
        const { data: blob, error: downloadError } = await client.storage
          .from(MOCKUP_STORAGE_BUCKET)
          .download(option.storagePath)
        if (downloadError) {
          console.warn(`  skipped ${option.storagePath}: ${downloadError.message}`)
          continue
        }
        const ext = option.storagePath.split(".").pop() || "png"
        const fileName = `mockup-option-${(option.label || "x").toLowerCase()}.${ext}`
        writeFileSync(path.join(samplesDir, fileName), Buffer.from(await blob.arrayBuffer()))
        sampleImages.push(fileName)
        mockupOptions.push({
          label: option.label ?? "",
          title: option.title ?? "",
          summary: option.summary ?? "",
          imagePath: `/landing/samples/${fileName}`,
          screens: (option.screens ?? []).map((screen) => ({
            name: screen.name ?? "",
            caption: screen.caption ?? "",
          })),
        })
      }
    } catch (parseError) {
      console.warn(`  could not parse mockup content: ${parseError.message}`)
    }
  }

  // Landing-only sanitization: drop italic "*Note: ... unavailable ...*" caveat
  // paragraphs that generation adds when live competitor search fails. They are
  // accurate in the product but read as a defect on the marketing page. This
  // becomes a no-op once competitor search works and the data is re-exported.
  const sanitizeForLanding = (content) =>
    content.replace(/^\*Note:[^\n]*unavailable[^\n]*\*\s*$/gim, "").replace(/\n{3,}/g, "\n\n")

  // Landing-ready mockup content: the original stored JSON with each option's
  // auth-proxied imageUrl replaced by the exported public path, so the real
  // MockupRenderer can render it on the landing page.
  let mockupContentForLanding = null
  if (mockup?.content && mockupOptions.length) {
    try {
      const parsed = JSON.parse(mockup.content)
      const publicPathByLabel = new Map(mockupOptions.map((option) => [option.label, option.imagePath]))
      parsed.options = (parsed.options ?? []).map((option) => ({
        ...Object.fromEntries(Object.entries(option).filter(([key]) => key !== "storagePath")),
        imageUrl: publicPathByLabel.get(option.label) ?? option.imageUrl,
      }))
      mockupContentForLanding = JSON.stringify(parsed)
    } catch {
      // leave null; the landing section simply falls back to no visual
    }
  }

  const fixture = {
    exportedFrom: { projectName: project.name },
    competitive: competitive
      ? { content: sanitizeForLanding(competitive.content), metadata: competitive.metadata ?? null }
      : null,
    prd: prd ? { content: prd.content } : null,
    mvp: mvp ? { content: mvp.content } : null,
    mockupContent: mockupContentForLanding,
    mockupOptions,
  }

  const banner =
    "// GENERATED by scripts/export-landing-sample.mjs. Do not edit by hand.\n" +
    "// Real generated documents from one sample project, rendered by the\n" +
    "// landing page feature previews through the actual workspace renderers.\n\n"
  const body =
    "export const LANDING_SAMPLE_CONTENT = " +
    JSON.stringify(fixture, null, 2) +
    " as const\n"
  writeFileSync(path.join(root, "src", "lib", "landing-sample-content.ts"), banner + body)

  console.log(`Exported from project "${project.name}" (${project.id})`)
  console.log(`  research: ${competitive ? "yes" : "MISSING"}  prd: ${prd ? "yes" : "MISSING"}  mvp: ${mvp ? "yes" : "MISSING"}`)
  console.log(`  mockup images: ${sampleImages.length ? sampleImages.join(", ") : "none"}`)
  console.log("  wrote src/lib/landing-sample-content.ts")
}

async function captureLandingPreviews() {
  const baseUrl = (process.env.LANDING_PREVIEW_BASE_URL || "http://localhost:3000").replace(/\/$/, "")
  const previewsDir = path.join(root, "public", "landing", "samples", "previews")
  mkdirSync(previewsDir, { recursive: true })

  let chromium
  try {
    ;({ chromium } = await import("playwright"))
  } catch {
    throw new Error("Playwright is not available. Install project dependencies or set NEXT_PUBLIC_LANDING_LIVE_PREVIEWS=1 for live previews.")
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 960 },
      deviceScaleFactor: 1,
    })

    for (const capture of PREVIEW_CAPTURES) {
      const searchParams = new URLSearchParams({ active: capture.activeSectionId })
      if (capture.cropToId) searchParams.set("crop", capture.cropToId)
      const url = `${baseUrl}/landing-preview/${encodeURIComponent(capture.navKey)}?${searchParams.toString()}`
      const outputPath = path.join(previewsDir, capture.fileName)

      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 })
      await page.waitForFunction(
        () => document.querySelector('[data-landing-preview-ready="true"]'),
        null,
        { timeout: 60000 },
      )
      await page.evaluate(() => document.fonts?.ready)
      await page.screenshot({
        path: outputPath,
        clip: { x: 0, y: 0, width: 768, height: 576 },
      })
      console.log(`  captured ${capture.fileName}`)
    }
  } finally {
    await browser.close()
  }
}

const projectFlagIndex = process.argv.indexOf("--project")
const shouldCapturePreviews = process.argv.includes("--capture-previews")
const capturePreviewsOnly = process.argv.includes("--capture-previews-only")

if (capturePreviewsOnly) {
  await captureLandingPreviews()
} else if (projectFlagIndex !== -1) {
  await exportProject(process.argv[projectFlagIndex + 1])
  if (shouldCapturePreviews) {
    await captureLandingPreviews()
  }
} else {
  await survey()
}

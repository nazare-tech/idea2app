import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CREDIT_COSTS } from "@/lib/utils"
import OpenAI from "openai"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { getMockupSystemPrompt } from "@/lib/json-render/catalog"

export const maxDuration = 300 // 5 min — AI generation can be slow

function MOCKUP_PROMPT(mvpPlan: string, projectName: string): string {
  const fence = "```"
  const catalogPrompt = getMockupSystemPrompt(projectName)

  return [
    catalogPrompt,
    "",
    "---",
    "",
    `**Product Name:** ${projectName}`,
    "**MVP Plan:**",
    mvpPlan,
    "",
    "## Your Task",
    "",
    "Create WIREFRAME mockups for the key pages from the MVP plan above.",
    "Wireframes focus on LAYOUT and STRUCTURE — not detailed content.",
    "Generate one json-render spec per page/screen.",
    "",
    "## Required Pages",
    "",
    "1. **Homepage** — full-width hero area, feature grid, pricing section, CTA",
    "2. **Key Feature Pages** — main app screens from the MVP plan with realistic layouts",
    "3. **Dashboard** — main logged-in view with stats grid, data table, sidebar (if applicable)",
    "",
    "## Wireframe Design Principles",
    "",
    "CRITICAL: Your wireframes must look like REAL app layouts — not a narrow list of components stacked vertically.",
    "",
    "### Layout Rules",
    "- Every major section (nav, hero, features, footer) must SPAN THE FULL WIDTH of the page",
    "- Use Grid (columns=2 or columns=3) to arrange Cards SIDE BY SIDE — never stack narrow cards vertically when they can go in a grid",
    "- Dashboard pages: use Grid with columns=3 or columns=4 for stat cards, then Grid columns=2 for main content + sidebar",
    "- Navigation: horizontal Stack with logo left, links center, buttons right — spanning full width",
    "- Hero sections: full-width Card containing heading, description, and CTA buttons",
    "- Feature sections: Grid with columns=3 containing feature Cards side by side",
    "- Forms: wrap in a full-width Card, use Grid columns=2 for side-by-side input fields",
    "",
    "### Content Rules",
    "- Use SHORT labels only (1-3 words): 'Sign Up', 'Search', 'Dashboard', 'Save'",
    "- Headings should be brief page/section titles: 'Hero Section', 'Features', 'Pricing'",
    "- Text elements describe WHAT goes there: 'Tagline text', 'Feature description', 'User bio'",
    "- Use Skeleton for images/banners/media placeholders",
    "- Keep forms minimal: input fields with short placeholder labels",
    "- Tables: 3-4 columns with short headers, inside full-width Cards",
    "- Aim for 15-30 elements per page — enough for a realistic layout",
    "- Create 3-5 pages total",
    "",
    "## CRITICAL OUTPUT FORMAT",
    "",
    "Your response MUST follow this exact structure — markdown headers followed by JSON code blocks.",
    "Study this example carefully — note how Grid creates multi-column layouts and Cards fill the width:",
    "",
    "### Homepage",
    "",
    `${fence}json`,
    '{',
    '  "root": "root",',
    '  "elements": {',
    '    "root": {',
    '      "type": "Stack",',
    '      "props": { "direction": "vertical", "gap": "lg" },',
    '      "children": ["nav", "hero", "features-section", "cta-section"]',
    '    },',
    '    "nav": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "md", "align": "center", "justify": "between" },',
    '      "children": ["logo", "nav-links", "nav-actions"]',
    '    },',
    '    "logo": {',
    '      "type": "Heading",',
    '      "props": { "text": "AppName", "level": "h3" },',
    '      "children": []',
    '    },',
    '    "nav-links": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "sm" },',
    '      "children": ["link-features", "link-pricing", "link-about"]',
    '    },',
    '    "link-features": { "type": "Button", "props": { "label": "Features", "variant": "ghost" }, "children": [] },',
    '    "link-pricing": { "type": "Button", "props": { "label": "Pricing", "variant": "ghost" }, "children": [] },',
    '    "link-about": { "type": "Button", "props": { "label": "About", "variant": "ghost" }, "children": [] },',
    '    "nav-actions": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "sm" },',
    '      "children": ["btn-login", "btn-signup"]',
    '    },',
    '    "btn-login": { "type": "Button", "props": { "label": "Log In", "variant": "outline" }, "children": [] },',
    '    "btn-signup": { "type": "Button", "props": { "label": "Sign Up" }, "children": [] },',
    '    "hero": {',
    '      "type": "Card",',
    '      "props": { "title": "Hero Section" },',
    '      "children": ["hero-banner", "hero-text", "hero-buttons"]',
    '    },',
    '    "hero-banner": { "type": "Skeleton", "props": { "height": "200px" }, "children": [] },',
    '    "hero-text": { "type": "Text", "props": { "text": "Tagline and value proposition" }, "children": [] },',
    '    "hero-buttons": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "sm" },',
    '      "children": ["hero-cta", "hero-secondary"]',
    '    },',
    '    "hero-cta": { "type": "Button", "props": { "label": "Get Started" }, "children": [] },',
    '    "hero-secondary": { "type": "Button", "props": { "label": "Learn More", "variant": "outline" }, "children": [] },',
    '    "features-section": {',
    '      "type": "Stack",',
    '      "props": { "direction": "vertical", "gap": "md" },',
    '      "children": ["features-heading", "features-grid"]',
    '    },',
    '    "features-heading": { "type": "Heading", "props": { "text": "Features", "level": "h2" }, "children": [] },',
    '    "features-grid": {',
    '      "type": "Grid",',
    '      "props": { "columns": 3, "gap": "md" },',
    '      "children": ["feat-1", "feat-2", "feat-3"]',
    '    },',
    '    "feat-1": {',
    '      "type": "Card",',
    '      "props": { "title": "Feature One" },',
    '      "children": ["feat-1-desc"]',
    '    },',
    '    "feat-1-desc": { "type": "Text", "props": { "text": "Feature description" }, "children": [] },',
    '    "feat-2": {',
    '      "type": "Card",',
    '      "props": { "title": "Feature Two" },',
    '      "children": ["feat-2-desc"]',
    '    },',
    '    "feat-2-desc": { "type": "Text", "props": { "text": "Feature description" }, "children": [] },',
    '    "feat-3": {',
    '      "type": "Card",',
    '      "props": { "title": "Feature Three" },',
    '      "children": ["feat-3-desc"]',
    '    },',
    '    "feat-3-desc": { "type": "Text", "props": { "text": "Feature description" }, "children": [] },',
    '    "cta-section": {',
    '      "type": "Card",',
    '      "props": { "title": "Ready to start?" },',
    '      "children": ["cta-text", "cta-btn"]',
    '    },',
    '    "cta-text": { "type": "Text", "props": { "text": "Call to action message" }, "children": [] },',
    '    "cta-btn": { "type": "Button", "props": { "label": "Get Started" }, "children": [] }',
    '  }',
    '}',
    fence,
    "",
    "## Rules",
    "",
    "- IMPORTANT: Do NOT use JSON Patch format ({\"op\":\"add\",\"path\":...}) — output complete JSON objects only",
    "- Each JSON block must be a COMPLETE, self-contained json-render spec with `root` and `elements` at the top level",
    "- Every element must have `type`, `props`, and `children` (even if children is empty [])",
    "- Use short descriptive IDs (e.g., 'nav', 'hero', 'sidebar', 'form-section')",
    "- WIREFRAME RULE: Keep ALL text short — labels (1-3 words), descriptions (3-6 words max)",
    "- Use Skeleton for image/media placeholders instead of Image components",
    "- Only use component types from the catalog above",
    "- Use Stack (direction='vertical') as the root element for each page",
    "- LAYOUT RULE: Use Grid (columns=2 or columns=3) to arrange Cards side by side — NEVER stack all Cards vertically",
    "- LAYOUT RULE: Nav bars must use horizontal Stack with justify='between' to span full width",
    "- LAYOUT RULE: Dashboard pages need Grid layouts for stats and content areas — not a vertical list",
    "- Do NOT use advanced features like $state, $bindState, $template, visible conditions, or repeat — keep specs static",
    "- Keep each page spec focused: 15-30 elements for realistic layouts",
  ].join("\n")
}

export async function POST(request: Request) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let creditsConsumed = 0
  let modelUsed: string | undefined
  let userId: string | undefined
  let projectId: string | undefined

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      statusCode = 401
      errorType = "unauthorized"
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id

    const body = await request.json()
    projectId = body.projectId
    const { mvpPlan, projectName, model } = body

    if (!projectId || !mvpPlan || !projectName) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId, mvpPlan, and projectName are required"
      return NextResponse.json(
        { error: "projectId, mvpPlan, and projectName are required" },
        { status: 400 }
      )
    }

    // Validate model (optional - if not provided, use default)
    const selectedModel = model || process.env.OPENROUTER_ANALYSIS_MODEL || "anthropic/claude-sonnet-4"

    // Verify project ownership
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      statusCode = 404
      errorType = "not_found"
      errorMessage = "Project not found"
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check and deduct credits
    const creditCost = CREDIT_COSTS['mockup']
    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: creditCost,
      p_action: 'mockup',
      p_description: `Mockup generation for "${projectName}"`,
    })

    if (!consumed) {
      statusCode = 402
      errorType = "insufficient_credits"
      errorMessage = "Insufficient credits"
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan." },
        { status: 402 }
      )
    }

    creditsConsumed = creditCost

    // Generate mockup using OpenRouter
    const openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "",
    })

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key not configured")
    }

    const response = await openrouter.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "user",
          content: MOCKUP_PROMPT(mvpPlan, projectName),
        },
      ],
      max_tokens: 16384, // Large limit for multiple JSON spec pages
    })

    const content = response.choices[0]?.message?.content

    if (!content) {
      throw new Error("No content returned from OpenRouter")
    }

    modelUsed = selectedModel

    const metadata = {
      source: "openrouter",
      model: selectedModel,
      generated_at: new Date().toISOString(),
    }

    // Store the mockup in database
    await supabase.from("mockups").insert({
      project_id: projectId,
      content,
      model_used: selectedModel,
      metadata,
    })

    // Update project
    await supabase
      .from("projects")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", projectId)

    console.log(`[Mockup] project=${projectId} model=${selectedModel}`)

    return NextResponse.json({
      content,
      model: selectedModel,
      source: "openrouter",
    })
  } catch (error) {
    console.error("Mockup generation error:", error)
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json(
      { error: "Failed to generate mockup. Please try again." },
      { status: 500 }
    )
  } finally {
    // Track metrics (fire and forget - won't block response)
    if (userId) {
      trackAPIMetrics({
        endpoint: `/api/mockups/generate`,
        method: "POST",
        featureType: "mockup",
        userId,
        projectId: projectId || null,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        creditsConsumed,
        modelUsed,
        aiSource: "openrouter",
        errorType,
        errorMessage,
      })
    }
  }
}

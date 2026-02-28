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
    "1. **Homepage** — hero area, feature sections, CTA",
    "2. **Key Feature Pages** — main app screens from the MVP plan",
    "3. **Dashboard** — main logged-in view (if applicable)",
    "",
    "## Wireframe Style Guide",
    "",
    "- Use SHORT labels only (1-3 words): 'Sign Up', 'Search', 'Dashboard', 'Save'",
    "- Headings should be brief page/section titles: 'Hero Section', 'Features', 'Pricing'",
    "- Text elements should describe WHAT goes there, not actual copy: 'Tagline text', 'Feature description', 'User bio'",
    "- Use Skeleton components to represent images, banners, and content blocks that would be filled in later",
    "- Keep forms minimal: show the input fields with short labels but no long descriptions",
    "- Tables should have 2-3 columns max with short header labels",
    "- Aim for 8-20 elements per page — show structure, not every detail",
    "- Create 3-5 pages total",
    "",
    "## CRITICAL OUTPUT FORMAT",
    "",
    "Your response MUST follow this exact structure — markdown headers followed by JSON code blocks:",
    "",
    "### Page Name",
    "",
    `${fence}json`,
    '{',
    '  "root": "root",',
    '  "elements": {',
    '    "root": {',
    '      "type": "Stack",',
    '      "props": { "direction": "vertical", "gap": "md" },',
    '      "children": ["nav", "hero"]',
    '    },',
    '    "nav": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "sm" },',
    '      "children": ["logo", "nav-links"]',
    '    },',
    '    "logo": {',
    '      "type": "Heading",',
    '      "props": { "text": "Logo", "level": "h3" },',
    '      "children": []',
    '    },',
    '    "nav-links": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "sm" },',
    '      "children": ["link-1", "link-2"]',
    '    },',
    '    "link-1": {',
    '      "type": "Button",',
    '      "props": { "label": "Features", "variant": "ghost" },',
    '      "children": []',
    '    },',
    '    "link-2": {',
    '      "type": "Button",',
    '      "props": { "label": "Sign Up" },',
    '      "children": []',
    '    },',
    '    "hero": {',
    '      "type": "Card",',
    '      "props": { "title": "Hero Section" },',
    '      "children": ["hero-text", "hero-cta"]',
    '    },',
    '    "hero-text": {',
    '      "type": "Text",',
    '      "props": { "text": "Tagline and value proposition" },',
    '      "children": []',
    '    },',
    '    "hero-cta": {',
    '      "type": "Button",',
    '      "props": { "label": "Get Started" },',
    '      "children": []',
    '    }',
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
    "- Do NOT use advanced features like $state, $bindState, $template, visible conditions, or repeat — keep specs static",
    "- Keep each page spec concise — wireframes should be simple, 8-20 elements per page",
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

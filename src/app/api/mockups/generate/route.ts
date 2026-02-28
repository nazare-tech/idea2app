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
    "Create comprehensive UI mockups for all major pages and flows from the MVP plan above.",
    "Generate one json-render spec per page/screen.",
    "",
    "## Required Pages",
    "",
    "1. **Homepage** — landing page with hero section, features, and call-to-action",
    "2. **Key Feature Pages** — main application screens from the MVP plan",
    "3. **User Dashboard** — if applicable, show the main logged-in view",
    "4. **Settings/Profile** — if applicable",
    "5. **Authentication** — login/signup flows if the app requires accounts",
    "",
    "## CRITICAL OUTPUT FORMAT",
    "",
    "Your response MUST follow this exact structure — markdown headers followed by JSON code blocks:",
    "",
    "### Page Name",
    "",
    `${fence}json`,
    '{',
    '  "root": "root-element-id",',
    '  "elements": {',
    '    "root-element-id": {',
    '      "type": "Stack",',
    '      "props": { "direction": "vertical", "gap": "md" },',
    '      "children": ["child-1", "child-2"]',
    '    },',
    '    "child-1": {',
    '      "type": "Heading",',
    '      "props": { "text": "Page Title", "level": "h1" },',
    '      "children": []',
    '    },',
    '    "child-2": {',
    '      "type": "Card",',
    '      "props": { "title": "Section" },',
    '      "children": ["child-3"]',
    '    },',
    '    "child-3": {',
    '      "type": "Text",',
    '      "props": { "text": "Content goes here" },',
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
    "- Use unique IDs for each element (e.g., 'nav-1', 'hero-card', 'feature-grid')",
    "- Use descriptive IDs that reflect the element's purpose",
    "- Use realistic content — not placeholder text like 'lorem ipsum'",
    "- Only use component types from the catalog above",
    "- Use Stack (direction='vertical') as the root element for each page",
    "- Do NOT use advanced features like $state, $bindState, $template, visible conditions, or repeat — keep specs static",
    "- Keep each page spec focused and concise — aim for 10-30 elements per page, not 50+",
    "- Add brief descriptive text between page sections using markdown (outside code blocks)",
    "- Create 3-6 page mockups depending on the MVP plan complexity",
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

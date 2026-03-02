import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CREDIT_COSTS } from "@/lib/utils"
import OpenAI from "openai"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"

export const maxDuration = 300 // 5 min — AI generation can be slow

function MOCKUP_PROMPT(mvpPlan: string, projectName: string): string {
  const fence = "```"
  return [
    "You are an expert UI/UX designer and information architect. Create detailed ASCII art mockups showing the information architecture for the following MVP plan.",
    "",
    `**Product Name:** ${projectName}`,
    "**MVP Plan:**",
    mvpPlan,
    "",
    "Please create comprehensive ASCII art mockups that visualize:",
    "",
    "## Website/App Information Architecture",
    "",
    "Create ASCII art diagrams showing:",
    "",
    "1. **Site Map / Navigation Structure**",
    "   - Use boxes and lines to show page hierarchy",
    "   - Show main navigation, subpages, and user flows",
    "",
    "2. **Key Page Layouts**",
    "   - Homepage layout with sections",
    "   - Main feature pages",
    "   - User dashboard (if applicable)",
    "   - Settings/profile pages (if applicable)",
    "",
    "3. **User Flows**",
    "   - Registration/onboarding flow",
    "   - Core feature usage flows",
    "   - Checkout/conversion flow (if e-commerce)",
    "",
    "## ASCII Art Guidelines",
    "",
    "- Use Unicode box-drawing characters: ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ ─ │ for clean lines",
    "- Avoid using pipe character | for borders — always use │ (U+2502) instead",
    "- Create clear visual hierarchy with proper spacing",
    "- Label all sections and components",
    "- Use consistent box styling",
    "- Add annotations for interactive elements",
    "- Keep diagrams under 100 characters wide for readability",
    "",
    "## CRITICAL FORMATTING RULE",
    "",
    `**Every single ASCII art diagram MUST be wrapped in triple backtick code fences (${fence}).** This is mandatory for correct rendering. Never place ASCII art outside of code fences. Use markdown headers (## or ###) between code blocks to label sections.`,
    "",
    "## Example Format:",
    "",
    "### Homepage",
    "",
    fence,
    "┌─────────────────────────────────────────────────────────────┐",
    "│                        HOMEPAGE                              │",
    "├─────────────────────────────────────────────────────────────┤",
    "│  ┌──────────────────────────────────────────────────────┐  │",
    "│  │  Logo                    [Sign in] [Sign up]            │  │",
    "│  └──────────────────────────────────────────────────────┘  │",
    "│                                                              │",
    "│  ┌──────────────────────────────────────────────────────┐  │",
    "│  │             Hero Section - Value Prop                 │  │",
    "│  │          [Call to Action Button]                      │  │",
    "│  └──────────────────────────────────────────────────────┘  │",
    "│                                                              │",
    "│  ┌──────────────────────────────────────────────────────┐  │",
    "│  │  Feature 1  │  Feature 2  │  Feature 3                │  │",
    "│  └──────────────────────────────────────────────────────┘  │",
    "└─────────────────────────────────────────────────────────────┘",
    fence,
    "",
    "Create mockups for all major pages and flows mentioned in the MVP plan.",
    `Use markdown headers (##, ###) to separate different mockups, and wrap ALL ASCII art in ${fence} code fences.`,
    "Make the mockups practical and actionable for developers.",
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
      max_tokens: 8192, // Larger token limit for ASCII art
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
    await supabase.from("mockups" as any).insert({
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

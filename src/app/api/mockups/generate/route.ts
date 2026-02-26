import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CREDIT_COSTS } from "@/lib/utils"
import OpenAI from "openai"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"
import { WiretextMCP } from "@/lib/wiretext-mcp"

export const maxDuration = 300

function WIRETEXT_PROMPT(mvpPlan: string, projectName: string): string {
  return `You are an expert UI/UX wireframe designer. Based on the MVP plan below, create wireframe layouts for the 3-5 CORE screens of the product.

**Product Name:** ${projectName}

**MVP Plan:**
${mvpPlan}

## Instructions

1. Identify the 3-5 most important screens that show the product's core value. Examples: Dashboard, Product Detail, Marketplace, Feed, Editor, etc.
2. Do NOT include generic screens like Login, Sign Up, Settings, Profile, 404, or Landing Page.
3. For each screen, output an array of wiretext component objects positioned on a grid.

## Available Wiretext Components

Primitives: box, text, line, arrow, connector
UI Components:
- button: { type: "button", x, y, label, icon?, align? }
- input: { type: "input", x, y, width?, label?, icon? }
- select: { type: "select", x, y, width?, label? }
- checkbox: { type: "checkbox", x, y, label, checked? }
- radio: { type: "radio", x, y, label, checked? }
- toggle: { type: "toggle", x, y, label, checked? }
- table: { type: "table", x, y, width?, columns, rows?, filterable? }
- modal: { type: "modal", x, y, width?, height?, label, body? }
- browser: { type: "browser", x, y, width, height, label? }
- card: { type: "card", x, y, width, height, label?, body? }
- navbar: { type: "navbar", x, y, width?, navItems }
- tabs: { type: "tabs", x, y, width?, tabs }
- progress: { type: "progress", x, y, width?, progress? }
- icon: { type: "icon", x, y, icon }
- image: { type: "image", x, y, width?, height?, label?, icon? }
- alert: { type: "alert", x, y, width?, label, alertType? }
- avatar: { type: "avatar", x, y, label?, icon? }
- divider: { type: "divider", x, y, width?, label? }
- breadcrumb: { type: "breadcrumb", x, y, items, separator? }
- list: { type: "list", x, y, items, listStyle? }
- stepper: { type: "stepper", x, y, items, activeStep? }
- rating: { type: "rating", x, y, value?, maxValue? }
- skeleton: { type: "skeleton", x, y, width?, height? }

## Coordinate System
- x, y are character positions (0-based). y=0 is top.
- width, height are in characters. Typical screen fits within 80x40.
- Place components logically: navbar at top (y=0), content below, buttons at appropriate positions.

## Example

A dashboard screen might look like:
{
  "name": "Dashboard",
  "objects": [
    { "type": "browser", "x": 0, "y": 0, "width": 80, "height": 35, "label": "https://app.example.com/dashboard" },
    { "type": "navbar", "x": 1, "y": 2, "width": 78, "navItems": ["Dashboard", "Projects", "Analytics", "Team"] },
    { "type": "text", "x": 2, "y": 5, "text": "Welcome back, User" },
    { "type": "card", "x": 2, "y": 7, "width": 24, "height": 8, "label": "Active Projects", "body": "12" },
    { "type": "card", "x": 28, "y": 7, "width": 24, "height": 8, "label": "Tasks Due", "body": "5" },
    { "type": "card", "x": 54, "y": 7, "width": 24, "height": 8, "label": "Team Members", "body": "8" },
    { "type": "table", "x": 2, "y": 17, "width": 76, "columns": ["Project", "Status", "Due Date", "Owner"], "rows": 5 }
  ]
}

## Output Format

Respond with ONLY valid JSON, no markdown, no explanation:

{
  "screens": [
    {
      "name": "Screen Name",
      "objects": [ ...wiretext objects... ]
    }
  ]
}`
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

    // Generate wireframe objects via AI
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
        { role: "user", content: WIRETEXT_PROMPT(mvpPlan, projectName) },
      ],
      max_tokens: 8192,
      response_format: { type: "json_object" },
    })

    const rawContent = response.choices[0]?.message?.content
    if (!rawContent) {
      throw new Error("No content returned from OpenRouter")
    }

    // Parse AI response
    let screens: { name: string; objects: Record<string, unknown>[] }[]
    try {
      const parsed = JSON.parse(rawContent)
      screens = parsed.screens
      if (!Array.isArray(screens) || screens.length === 0) {
        throw new Error("No screens in response")
      }
    } catch (parseErr) {
      console.error("[Mockup] JSON parse failed, retrying:", parseErr)
      const retryResponse = await openrouter.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: "user", content: WIRETEXT_PROMPT(mvpPlan, projectName) },
          { role: "assistant", content: rawContent },
          { role: "user", content: "Your response was not valid JSON. Please respond with ONLY the JSON object, no markdown code fences, no explanation. Start with { and end with }." },
        ],
        max_tokens: 8192,
        response_format: { type: "json_object" },
      })
      const retryContent = retryResponse.choices[0]?.message?.content
      if (!retryContent) throw new Error("Retry returned no content")
      const retryParsed = JSON.parse(retryContent)
      screens = retryParsed.screens
      if (!Array.isArray(screens) || screens.length === 0) {
        throw new Error("Retry also failed to produce valid screens")
      }
    }

    modelUsed = selectedModel

    // Render each screen via Wiretext MCP
    const mcp = await WiretextMCP.create()
    const renderedScreens: {
      name: string
      order: number
      wire_objects: Record<string, unknown>[]
      ascii_art: string | null
      wiretext_url: string | null
    }[] = []

    try {
      for (let i = 0; i < screens.length; i++) {
        const screen = screens[i]
        const result = await mcp.renderScreen(screen.objects as any)
        renderedScreens.push({
          name: screen.name,
          order: i,
          wire_objects: screen.objects,
          ascii_art: result.ascii_art,
          wiretext_url: result.wiretext_url,
        })
      }
    } finally {
      await mcp.close()
    }

    // Store in database
    const metadata = {
      source: "openrouter+wiretext",
      model: selectedModel,
      generated_at: new Date().toISOString(),
      screen_count: renderedScreens.length,
    }

    const combinedContent = renderedScreens
      .map((s) => `## ${s.name}\n\n\`\`\`\n${s.ascii_art || "(render failed)"}\n\`\`\``)
      .join("\n\n")

    const { data: mockupRow, error: mockupError } = await supabase
      .from("mockups")
      .insert({
        project_id: projectId,
        content: combinedContent,
        model_used: selectedModel,
        metadata,
      })
      .select("id")
      .single()

    if (mockupError || !mockupRow) {
      throw new Error(`Failed to insert mockup row: ${mockupError?.message}`)
    }

    const screenRows = renderedScreens.map((s) => ({
      mockup_id: mockupRow.id,
      screen_name: s.name,
      screen_order: s.order,
      wire_objects: s.wire_objects,
      ascii_art: s.ascii_art,
      wiretext_url: s.wiretext_url,
    }))

    const { error: screensError } = await supabase
      .from("mockup_screens")
      .insert(screenRows)

    if (screensError) {
      console.error("[Mockup] Failed to insert screens:", screensError)
      throw new Error(`Failed to insert mockup screens: ${screensError.message}`)
    }

    // Update project status
    await supabase
      .from("projects")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", projectId)

    console.log(`[Mockup] project=${projectId} model=${selectedModel} screens=${renderedScreens.length}`)

    return NextResponse.json({
      content: combinedContent,
      screens: renderedScreens,
      model: selectedModel,
      source: "openrouter+wiretext",
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

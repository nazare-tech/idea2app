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
3. For each screen, output an array of wiretext objects using the EXACT schema below.

## CRITICAL SCHEMA RULES

There are exactly 5 primitive types and 1 component wrapper type:
- Primitives: "box", "text", "line", "arrow", "connector"
- All UI components (button, input, card, navbar, etc.) use type: "component" with a componentType field

Position is ALWAYS an object: "position": { "col": NUMBER, "row": NUMBER }
NEVER use "x" or "y" — always use "position" with "col" and "row".

## Object Schemas

### Primitives

Box: { "type": "box", "position": { "col": 0, "row": 0 }, "width": 20, "height": 10, "label": "Title" }
Text: { "type": "text", "position": { "col": 0, "row": 0 }, "content": "Hello World" }
  - Text REQUIRES a "content" field (string). Do NOT use "text" or "label" for text objects.

### UI Components (ALL use type: "component")

Button:    { "type": "component", "componentType": "button", "position": { "col": 0, "row": 0 }, "label": "Click Me", "width": 14 }
Input:     { "type": "component", "componentType": "input", "position": { "col": 0, "row": 0 }, "label": "Username", "width": 30 }
Select:    { "type": "component", "componentType": "select", "position": { "col": 0, "row": 0 }, "label": "Choose...", "width": 20 }
Checkbox:  { "type": "component", "componentType": "checkbox", "position": { "col": 0, "row": 0 }, "label": "Remember me", "checked": true }
Radio:     { "type": "component", "componentType": "radio", "position": { "col": 0, "row": 0 }, "label": "Option A" }
Toggle:    { "type": "component", "componentType": "toggle", "position": { "col": 0, "row": 0 }, "label": "Dark mode", "checked": false }
Table:     { "type": "component", "componentType": "table", "position": { "col": 0, "row": 0 }, "width": 60, "height": 10, "columns": ["Name", "Status", "Date"], "rows": 5 }
Card:      { "type": "component", "componentType": "card", "position": { "col": 0, "row": 0 }, "width": 30, "height": 10, "label": "Title", "body": "Content here" }
Browser:   { "type": "component", "componentType": "browser", "position": { "col": 0, "row": 0 }, "width": 80, "height": 35, "label": "https://example.com" }
Navbar:    { "type": "component", "componentType": "navbar", "position": { "col": 0, "row": 0 }, "width": 78, "navItems": ["Home", "Dashboard", "Settings"] }
Tabs:      { "type": "component", "componentType": "tabs", "position": { "col": 0, "row": 0 }, "width": 60, "height": 20, "tabs": ["Tab 1", "Tab 2", "Tab 3"] }
Progress:  { "type": "component", "componentType": "progress", "position": { "col": 0, "row": 0 }, "width": 30, "progress": 75 }
Icon:      { "type": "component", "componentType": "icon", "position": { "col": 0, "row": 0 }, "icon": "★" }
Image:     { "type": "component", "componentType": "image", "position": { "col": 0, "row": 0 }, "width": 20, "height": 10, "label": "Photo" }
Divider:   { "type": "component", "componentType": "divider", "position": { "col": 0, "row": 0 }, "width": 60 }
Alert:     { "type": "component", "componentType": "alert", "position": { "col": 0, "row": 0 }, "width": 40, "label": "Warning message", "alertType": "warning" }
Avatar:    { "type": "component", "componentType": "avatar", "position": { "col": 0, "row": 0 }, "label": "JD" }
Breadcrumb:{ "type": "component", "componentType": "breadcrumb", "position": { "col": 0, "row": 0 }, "items": ["Home", "Products", "Detail"] }
List:      { "type": "component", "componentType": "list", "position": { "col": 0, "row": 0 }, "items": ["Item 1", "Item 2", "Item 3"] }
Stepper:   { "type": "component", "componentType": "stepper", "position": { "col": 0, "row": 0 }, "items": ["Step 1", "Step 2", "Step 3"], "activeStep": 1 }
Rating:    { "type": "component", "componentType": "rating", "position": { "col": 0, "row": 0 }, "value": 3, "maxValue": 5 }
Skeleton:  { "type": "component", "componentType": "skeleton", "position": { "col": 0, "row": 0 }, "width": 40, "height": 3 }

## Layout Rules — FOLLOW STRICTLY

The grid is character-based: 1 cell = 1 char wide, 1 char tall.

**Browser container is the outermost wrapper:**
- ALWAYS start with a browser at col:0, row:0, width:80.
- The browser height should be tall enough to fit ALL content inside (calculate based on your content).

**All children MUST fit inside the browser's inner area:**
- Usable columns: 1 to 78 (inclusive). So child.col >= 1 AND child.col + child.width <= 79.
- Usable rows: start at row 2 (below browser chrome).
- NEVER place a child at col:0 or let col + width exceed 79. This causes overlap with the browser border.

**No overlapping:**
- Elements stacked vertically must NOT share rows. Leave at least 1 row gap.
- Elements side by side: ensure left.col + left.width + 1 <= right.col.
- Plan your layout TOP-TO-BOTTOM: navbar (row 2), then title (row 5), then content sections below, each spaced apart.

**Sizing rules:**
- Width must fit the label. Buttons: width >= label.length + 4. Selects: width >= label.length + 5. Inputs: width >= label.length + 6.
- Bordered components (button, input, card, browser, table, tabs, progress, icon, image, alert, avatar): height >= 3.
- Borderless components (checkbox, radio, toggle, divider, breadcrumb, list, stepper, rating, skeleton): height can be 1.
- Use zIndex: 0 for the browser, 1 for everything inside.

**Keep it simple:**
- Use 8-12 objects per screen maximum. Fewer objects = cleaner wireframe.
- Prefer cards, text, tables, and buttons. Avoid deeply nested layouts.
- Arrows and connectors REQUIRE "endPosition": { "col": NUMBER, "row": NUMBER }.

## Example — Study this layout carefully

{
  "name": "Dashboard",
  "objects": [
    { "type": "component", "componentType": "browser", "position": { "col": 0, "row": 0 }, "width": 80, "height": 40, "label": "https://app.example.com/dashboard", "zIndex": 0 },
    { "type": "component", "componentType": "navbar", "position": { "col": 1, "row": 2 }, "width": 78, "navItems": ["Dashboard", "Projects", "Analytics"], "zIndex": 1 },
    { "type": "text", "position": { "col": 3, "row": 5 }, "content": "Welcome back, User", "zIndex": 1 },
    { "type": "component", "componentType": "card", "position": { "col": 3, "row": 7 }, "width": 24, "height": 7, "label": "Active Projects", "body": "12", "zIndex": 1 },
    { "type": "component", "componentType": "card", "position": { "col": 29, "row": 7 }, "width": 24, "height": 7, "label": "Tasks Due", "body": "5", "zIndex": 1 },
    { "type": "component", "componentType": "card", "position": { "col": 55, "row": 7 }, "width": 23, "height": 7, "label": "Team Members", "body": "8", "zIndex": 1 },
    { "type": "component", "componentType": "table", "position": { "col": 3, "row": 16 }, "width": 75, "height": 12, "columns": ["Project", "Status", "Due Date"], "rows": 4, "zIndex": 1 },
    { "type": "component", "componentType": "button", "position": { "col": 3, "row": 30 }, "label": "New Project", "width": 17, "zIndex": 1 }
  ]
}

Notice: all children have col >= 1 and col + width <= 79. Rows are spaced apart. No overlapping.

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

    const mcpErrors: string[] = []
    try {
      for (let i = 0; i < screens.length; i++) {
        const screen = screens[i]
        console.log(`[Mockup] Rendering screen ${i}: "${screen.name}" with ${screen.objects.length} objects`)
        const result = await mcp.renderScreen(screen.objects as any)
        if (result.render_error) {
          mcpErrors.push(`Screen "${screen.name}" render: ${result.render_error}`)
        }
        if (result.create_error) {
          mcpErrors.push(`Screen "${screen.name}" create: ${result.create_error}`)
        }
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

    if (mcpErrors.length > 0) {
      console.error("[Mockup] MCP errors:", mcpErrors)
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
      ...(mcpErrors.length > 0 && { mcpErrors }),
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

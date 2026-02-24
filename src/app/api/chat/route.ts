import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { chatCompletion } from "@/lib/openrouter"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"

export async function POST(request: Request) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let creditsConsumed = 0
  let modelUsed: string | undefined
  let aiSource: "openrouter" | "anthropic" | "n8n" | undefined
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
    const message = body.message

    if (!projectId || !message) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId and message are required"
      return NextResponse.json(
        { error: "projectId and message are required" },
        { status: 400 }
      )
    }

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

    // Check credits (1 credit per chat message)
    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: 1,
      p_action: "chat",
      p_description: "Chat message",
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

    creditsConsumed = 1

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from("messages")
      .insert({
        project_id: projectId,
        role: "user",
        content: message,
      })
      .select()
      .single()

    if (userMsgError) {
      statusCode = 500
      errorType = "server_error"
      errorMessage = userMsgError.message
      return NextResponse.json({ error: userMsgError.message }, { status: 500 })
    }

    // Get recent message history for context
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .limit(20)

    // Generate AI response
    const aiMessages = (history || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    const aiResult = await chatCompletion(aiMessages, project.description)

    // Track AI model and source
    modelUsed = aiResult.model
    aiSource = aiResult.source as "openrouter"

    // Save assistant message with source/model metadata
    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from("messages")
      .insert({
        project_id: projectId,
        role: "assistant",
        content: aiResult.content,
        metadata: {
          source: aiResult.source,
          model: aiResult.model,
          responded_at: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (assistantMsgError) {
      statusCode = 500
      errorType = "server_error"
      errorMessage = assistantMsgError.message
      return NextResponse.json(
        { error: assistantMsgError.message },
        { status: 500 }
      )
    }

    // Update project status to active
    if (project.status === "draft") {
      await supabase
        .from("projects")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", projectId)
    }

    console.log(`[Chat] project=${projectId} source=${aiResult.source} model=${aiResult.model}`)

    return NextResponse.json({
      userMessage,
      assistantMessage,
    })
  } catch (error) {
    console.error("Chat error:", error)
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  } finally {
    // Track metrics (fire and forget - won't block response)
    if (userId) {
      trackAPIMetrics({
        endpoint: "/api/chat",
        method: "POST",
        featureType: "chat",
        userId,
        projectId: projectId || null,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        creditsConsumed,
        modelUsed,
        aiSource,
        errorType,
        errorMessage,
      })
    }
  }
}

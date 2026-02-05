import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"
import { PROMPT_CHAT_SYSTEM, IDEA_SUMMARY_PROMPT, POST_SUMMARY_SYSTEM } from "@/lib/prompt-chat-config"

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get all messages for this project from the prompt_chat_messages table
    const { data: messages, error: messagesError } = await supabase
      .from("prompt_chat_messages")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
      return NextResponse.json({ messages: [], stage: "initial" })
    }

    // Determine conversation stage based on messages
    let stage = "initial"
    if (messages && messages.length > 0) {
      const lastAssistantMsg = messages.filter(m => m.role === "assistant").pop()
      if (lastAssistantMsg?.metadata?.stage === "summary") {
        stage = "summarized"
      } else if (messages.length > 0) {
        stage = "refining"
      }
    }

    return NextResponse.json({ messages: messages || [], stage })
  } catch (error) {
    console.error("GET /api/prompt-chat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId, message, model, isInitial } = await request.json()

    if (!projectId || !message) {
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
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check credits (1 credit per message)
    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: 1,
      p_action: "prompt_chat",
      p_description: "Prompt chat message",
    })

    if (!consumed) {
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan." },
        { status: 402 }
      )
    }

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from("prompt_chat_messages")
      .insert({
        project_id: projectId,
        role: "user",
        content: message,
      })
      .select()
      .single()

    if (userMsgError) {
      console.error("Error saving user message:", userMsgError)
      return NextResponse.json({ error: userMsgError.message }, { status: 500 })
    }

    // Get conversation history
    const { data: history } = await supabase
      .from("prompt_chat_messages")
      .select("role, content, metadata")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })

    // Check if we already have a summary
    const hasSummary = history?.some(m => m.role === "assistant" && m.metadata?.stage === "summary")
    const messageCount = history?.length || 0

    // Determine conversation stage and system prompt
    let stage: "questions" | "gathering" | "summary" | "post_summary" = "gathering"
    let systemPrompt = PROMPT_CHAT_SYSTEM

    if (isInitial) {
      // First AI response - ask questions
      stage = "questions"
      systemPrompt = PROMPT_CHAT_SYSTEM
    } else if (!hasSummary && messageCount >= 2) {
      // After user answers questions (initial idea + AI questions + user answer = 3 messages, so >= 2)
      // Generate summary immediately
      stage = "summary"
      systemPrompt = PROMPT_CHAT_SYSTEM
    } else if (hasSummary) {
      // Post-summary conversation - check if message is idea-related
      stage = "post_summary"
      systemPrompt = POST_SUMMARY_SYSTEM

      // If the message seems to be refining the idea, trigger re-summarization
      const ideaRelatedKeywords = [
        "change", "update", "modify", "different", "instead", "actually", "rather",
        "target", "audience", "feature", "problem", "solution", "model", "price",
        "market", "customer", "user", "business", "revenue", "competitor"
      ]
      const messageWords = message.toLowerCase().split(/\s+/)
      const hasIdeaKeywords = ideaRelatedKeywords.some(keyword =>
        messageWords.some(word => word.includes(keyword))
      )

      if (hasIdeaKeywords || message.length > 50) {
        // Likely refining the idea - trigger re-summarization
        stage = "summary"
      }
    }

    // Build messages for AI
    const aiMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      { role: "system", content: systemPrompt },
    ]

    // Add conversation history
    if (history && history.length > 0) {
      history.forEach((msg) => {
        if (msg.role === "user" || msg.role === "assistant") {
          aiMessages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })
        }
      })
    }

    // Add summary instruction if needed
    if (stage === "summary") {
      aiMessages.push({
        role: "system",
        content: IDEA_SUMMARY_PROMPT,
      })
    }

    let assistantContent = ""

    // Call OpenRouter API
    const response = await openrouter.chat.completions.create({
      model: model || "anthropic/claude-sonnet-4",
      messages: aiMessages,
      max_tokens: 2048,
    })

    assistantContent = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again."

    // Save assistant message
    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from("prompt_chat_messages")
      .insert({
        project_id: projectId,
        role: "assistant",
        content: assistantContent,
        metadata: {
          model: model || "anthropic/claude-sonnet-4",
          stage: stage,
          responded_at: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (assistantMsgError) {
      console.error("Error saving assistant message:", assistantMsgError)
      return NextResponse.json({ error: assistantMsgError.message }, { status: 500 })
    }

    // Get all messages to return
    const { data: allMessages } = await supabase
      .from("prompt_chat_messages")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })

    // Determine overall conversation stage
    let conversationStage = "refining"
    if (stage === "summary") {
      conversationStage = "summarized"
    } else if (isInitial) {
      conversationStage = "refining"
    }

    // Update project description with the latest summary if this was a summary stage
    if (stage === "summary" && assistantContent) {
      await supabase
        .from("projects")
        .update({
          description: assistantContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
    }

    console.log(`[PromptChat] project=${projectId} model=${model || "default"} stage=${stage}`)

    return NextResponse.json({
      messages: allMessages,
      stage: conversationStage,
      summary: stage === "summary" ? assistantContent : null,
    })
  } catch (error) {
    console.error("POST /api/prompt-chat error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

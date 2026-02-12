import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request
    const { projectId, fullContent, selectedText, editPrompt, model } = await request.json()

    // Validation
    if (!projectId || !fullContent || !selectedText || !editPrompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check credits (soft check - log warning but allow for testing)
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single()

    // Type assertion needed as the credits column might not be in generated types yet
    const profileData = profile as { credits?: number } | null
    const hasAppCredits = profileData && (profileData.credits ?? 0) >= 1
    if (!hasAppCredits) {
      console.warn(`User ${user.id} has insufficient app credits, but proceeding with OpenRouter`)
    }

    // Determine which model to use
    const selectedModel = model || process.env.OPENROUTER_ANALYSIS_MODEL || "anthropic/claude-sonnet-4"

    // Call OpenRouter API
    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Idea2App Document Editor",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content: `You are an expert document editor. The user has selected a portion of text from their document and wants to make a specific edit.

IMPORTANT INSTRUCTIONS:
1. You will receive the FULL document content for context
2. You will receive the SELECTED TEXT that needs editing
3. You will receive the USER'S EDIT REQUEST
4. You must return ONLY the edited version of the selected text
5. Do NOT return the full document
6. Do NOT add explanations or markdown
7. Maintain the original formatting style (if it has markdown, keep markdown; if plain text, keep plain text)
8. Only change what was requested in the edit prompt

Your response should contain ONLY the replacement text for the selected portion.`,
            },
            {
              role: "user",
              content: `FULL DOCUMENT (for context):
---
${fullContent}
---

SELECTED TEXT TO EDIT:
---
${selectedText}
---

EDIT REQUEST:
${editPrompt}

Please provide ONLY the edited version of the selected text, nothing else.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      }
    )

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json()
      console.error("OpenRouter API error:", errorData)
      return NextResponse.json(
        { error: "Failed to generate edit" },
        { status: 500 }
      )
    }

    const data = await openRouterResponse.json()
    const suggestedEdit = data.choices?.[0]?.message?.content?.trim()

    if (!suggestedEdit) {
      return NextResponse.json(
        { error: "No edit generated" },
        { status: 500 }
      )
    }

    // Consume 1 credit only if user has app credits
    let creditsUsed = 0
    if (hasAppCredits) {
      const { error: creditError } = await supabase.rpc("consume_credits", {
        p_user_id: user.id,
        p_amount: 1,
        p_action: "document_edit",
        p_description: `Inline AI edit for project ${projectId}`,
      })

      if (creditError) {
        console.error("Error consuming credits:", creditError)
      } else {
        creditsUsed = 1
      }
    }

    return NextResponse.json({
      suggestedEdit,
      creditsUsed,
      modelUsed: selectedModel,
    })
  } catch (error) {
    console.error("Error in document-edit API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

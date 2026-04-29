import { NextResponse } from "next/server"
import OpenAI from "openai"

import { generateIntakeQuestions } from "@/lib/intake-question-generation"
import { createClient } from "@/lib/supabase/server"

const MAX_IDEA_LENGTH = 10000
const MIN_IDEA_LENGTH = 10
const INTAKE_MODEL = process.env.OPENROUTER_INTAKE_MODEL || process.env.OPENROUTER_CHAT_MODEL || "anthropic/claude-sonnet-4-6"

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

function normalizeIdea(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_IDEA_LENGTH) : ""
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { idea?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const idea = normalizeIdea(body.idea)
  if (idea.length < MIN_IDEA_LENGTH) {
    return NextResponse.json(
      { error: "Add a little more detail before generating questions." },
      { status: 400 }
    )
  }

  try {
    const result = await generateIntakeQuestions(idea, {
      generateText: async ({ systemPrompt, userPrompt, maxTokens }) => {
        if (!process.env.OPENROUTER_API_KEY) {
          throw new Error("OpenRouter API key not configured")
        }

        const response = await openrouter.chat.completions.create({
          model: INTAKE_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
        })

        return response.choices[0]?.message?.content ?? ""
      },
    })

    return NextResponse.json({
      questionSet: result.questionSet,
      usedFallback: false,
    })
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "We couldn't generate follow-up questions right now. Please retry in a moment."

    return NextResponse.json(
      {
        error: message,
        retryable: true,
      },
      { status: 503 }
    )
  }
}

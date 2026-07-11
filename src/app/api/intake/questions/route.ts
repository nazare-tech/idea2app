import { NextResponse } from "next/server"

import { getOpenRouterClient } from "@/lib/openrouter"
import {
  IntakeIdeaRejectedError,
  generateIntakeQuestions,
} from "@/lib/intake/question-generation"
import { validateIdeaInput } from "@/lib/intake/idea-validation"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { buildRequestLogContext, logError, logWarn } from "@/lib/logger"

const INTAKE_MODEL = process.env.OPENROUTER_INTAKE_MODEL || process.env.OPENROUTER_CHAT_MODEL || "anthropic/claude-sonnet-4-6"

const openrouter = getOpenRouterClient()

// App-authored copy for model rejection verdicts; model text is never echoed.
const IDEA_REJECTION_MESSAGES: Record<string, string> = {
  unsafe:
    "We can't create a plan from that input. Please describe a legitimate product or business idea.",
  default:
    "That doesn't look like an idea we can plan yet. Describe what you want to build, who it's for, and the problem it solves.",
}

export async function POST(request: Request) {
  const requestLogContext = buildRequestLogContext(request)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    logWarn("IntakeQuestions", "unauthorized", requestLogContext)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Sized so no plan's project entitlement can collide with the abuse
  // guardrail: Pro allows 10 projects/month, all burnable in one hour, so the
  // per-user limit is double that. Same limit for every plan; limits are
  // abuse prevention, not entitlement (see NAZ-124).
  const [userRateLimit, ipRateLimit] = await Promise.all([
    checkRateLimit({
      key: `intake-questions:user:${user.id}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    }),
    checkRateLimit({
      key: `intake-questions:ip:${getClientIp(request)}`,
      limit: 80,
      windowMs: 60 * 60 * 1000,
    }),
  ])

  if (userRateLimit.limited || ipRateLimit.limited) {
    const retryAfterSeconds = Math.max(
      userRateLimit.retryAfterSeconds,
      ipRateLimit.retryAfterSeconds,
    )

    return NextResponse.json(
      { error: "Too many question generation requests. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    )
  }

  let body: { idea?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const ideaValidation = validateIdeaInput(typeof body.idea === "string" ? body.idea : "")
  if (ideaValidation.status !== "ok") {
    return NextResponse.json({ error: ideaValidation.message }, { status: 400 })
  }
  const idea = ideaValidation.idea

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
    if (error instanceof IntakeIdeaRejectedError) {
      logWarn("IntakeQuestions", "idea_rejected", {
        ...requestLogContext,
        userId: user.id,
        reason: error.reason,
        ideaLength: idea.length,
      })
      return NextResponse.json(
        {
          error: IDEA_REJECTION_MESSAGES[error.reason] ?? IDEA_REJECTION_MESSAGES.default,
          rejected: true,
        },
        { status: 422 }
      )
    }

    logError("IntakeQuestions", "request_failed", error, {
      ...requestLogContext,
      userId: user.id,
      ideaLength: idea.length,
      model: INTAKE_MODEL,
    })
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

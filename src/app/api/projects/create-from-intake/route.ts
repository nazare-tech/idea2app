import { NextResponse } from "next/server"
import OpenAI from "openai"

import type { IntakeAnswer, IntakeQuestion, ProjectIntakeSource } from "@/lib/intake-types"
import { formatProjectIntakeForAi } from "@/lib/intake-context"
import { buildProjectIntakePayload, buildProjectSummary } from "@/lib/intake-summary"
import {
  buildOnboardingGenerationQueue,
  buildOnboardingQueueMetadata,
  buildOnboardingRedirectUrl,
} from "@/lib/onboarding-generation"
import { createGenerationQueueItems } from "@/lib/generation-queue-service"
import { generateProjectName } from "@/lib/project-name-generation"
import { canCreateProject, type ProjectAllowanceClient } from "@/lib/project-allowance"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { Json } from "@/types/database"

const MAX_IDEA_LENGTH = 10000
const MIN_IDEA_LENGTH = 10
const MAX_ANSWER_LENGTH = 1000
const MAX_OTHER_LENGTH = 300
const PROJECT_NAME_MODEL =
  process.env.OPENROUTER_PROJECT_NAME_MODEL ||
  process.env.OPENROUTER_CHAT_MODEL ||
  "anthropic/claude-sonnet-4-6"

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

type CreateFromIntakeBody = {
  idea?: unknown
  questions?: unknown
  answers?: unknown
  source?: unknown
  pendingToken?: unknown
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : ""
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function isQuestion(value: unknown): value is IntakeQuestion {
  if (!isRecord(value)) return false
  const selectionMode = value.selectionMode
  const options = value.options
  return (
    typeof value.id === "string" &&
    typeof value.question === "string" &&
    (selectionMode === "single" || selectionMode === "multiple" || selectionMode === "text") &&
    Array.isArray(options) &&
    typeof value.allowOther === "boolean"
  )
}

function normalizeQuestions(value: unknown): IntakeQuestion[] {
  if (!Array.isArray(value)) return []

  return value.filter(isQuestion).map((question) => ({
    id: normalizeText(question.id, 80),
    question: normalizeText(question.question, 220),
    selectionMode: question.selectionMode,
    options: question.options
      .filter((option) => isRecord(option) && typeof option.id === "string" && typeof option.label === "string")
      .map((option) => ({
        id: normalizeText(option.id, 80),
        label: normalizeText(option.label, 80),
      })),
    allowOther: question.allowOther,
    ...(question.helperText ? { helperText: normalizeText(question.helperText, 180) } : {}),
  }))
}

function normalizeSource(value: unknown): ProjectIntakeSource {
  return value === "landing" || value === "dashboard" || value === "manual" ? value : "wizard"
}

function validateAnswers(questions: IntakeQuestion[], value: unknown): {
  answers: IntakeAnswer[]
  error: string | null
} {
  if (!Array.isArray(value)) {
    return { answers: [], error: "Answers must be an array" }
  }

  const questionById = new Map(questions.map((question) => [question.id, question]))
  const answers: IntakeAnswer[] = []
  const seenQuestionIds = new Set<string>()

  for (const item of value) {
    if (!isRecord(item)) {
      return { answers: [], error: "Each answer must be an object" }
    }

    const questionId = normalizeText(item.questionId, 80)
    const question = questionById.get(questionId)
    if (!question) {
      return { answers: [], error: "Answer references an unknown question" }
    }

    if (seenQuestionIds.has(questionId)) {
      return { answers: [], error: "Each question can only be answered once" }
    }
    seenQuestionIds.add(questionId)

    const selectedOptionIds = Array.isArray(item.selectedOptionIds)
      ? item.selectedOptionIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => normalizeText(id, 80))
          .filter(Boolean)
      : []

    const text = normalizeText(item.text, MAX_ANSWER_LENGTH)
    const otherText = normalizeText(item.otherText, MAX_OTHER_LENGTH)

    if (question.selectionMode === "text") {
      if (!text) {
        return { answers: [], error: "Text questions require an answer" }
      }
      answers.push({ questionId, text })
      continue
    }

    const allowedOptionIds = new Set(question.options.map((option) => option.id))
    const uniqueOptionIds = [...new Set(selectedOptionIds)]

    if (question.selectionMode === "single" && uniqueOptionIds.length > 1) {
      return { answers: [], error: "Single-select questions can only have one selected option" }
    }

    for (const optionId of uniqueOptionIds) {
      if (!allowedOptionIds.has(optionId)) {
        return { answers: [], error: "Answer includes an invalid option" }
      }
    }

    if (uniqueOptionIds.length === 0 && !otherText) {
      return { answers: [], error: "Every question requires an answer" }
    }

    if (otherText && !question.allowOther) {
      return { answers: [], error: "This question does not allow an Other answer" }
    }

    answers.push({
      questionId,
      ...(uniqueOptionIds.length > 0 ? { selectedOptionIds: uniqueOptionIds } : {}),
      ...(otherText ? { otherText } : {}),
    })
  }

  if (answers.length !== questions.length) {
    return { answers: [], error: "Please answer every question before creating the project" }
  }

  return { answers, error: null }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const queueSupabase = createServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: CreateFromIntakeBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const idea = normalizeText(body.idea, MAX_IDEA_LENGTH)
  if (idea.length < MIN_IDEA_LENGTH) {
    return NextResponse.json({ error: "Project idea is too short" }, { status: 400 })
  }

  const questions = normalizeQuestions(body.questions)
  if (questions.length < 4 || questions.length > 5) {
    return NextResponse.json({ error: "Question set must include 4-5 questions" }, { status: 400 })
  }

  const answerResult = validateAnswers(questions, body.answers)
  if (answerResult.error) {
    return NextResponse.json({ error: answerResult.error }, { status: 400 })
  }

  const pendingToken = normalizeText(body.pendingToken, 180)
  if (pendingToken) {
    const { data: pending, error: pendingError } = await supabase
      .from("pending_intakes")
      .select("id")
      .eq("token", pendingToken)
      .is("claimed_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()

    if (pendingError) {
      console.error("[create-from-intake] pending lookup failed:", pendingError)
      return NextResponse.json({ error: "Failed to verify pending intake" }, { status: 500 })
    }

    if (!pending) {
      return NextResponse.json({ error: "Pending intake token is expired or already used" }, { status: 400 })
    }
  }

  const allowance = await canCreateProject(supabase as unknown as ProjectAllowanceClient, user.id)
  if (!allowance.canCreate) {
    const status = allowance.reason === "limit_reached" ? 403 : 500
    return NextResponse.json(
      {
        error: allowance.message,
        code: allowance.reason,
        allowance: allowance.allowance,
        used: allowance.used,
        remaining: allowance.remaining,
      },
      { status }
    )
  }

  const payload = buildProjectIntakePayload({
    originalIdea: idea,
    questions,
    answers: answerResult.answers,
    source: normalizeSource(body.source),
  })
  const summary = buildProjectSummary(payload)
  const intakeContext = formatProjectIntakeForAi(payload)
  const nameResult = await generateProjectName(
    {
      originalIdea: idea,
      summary,
      intakeContext,
    },
    {
      generateText: async ({ systemPrompt, userPrompt, maxTokens }) => {
        if (!process.env.OPENROUTER_API_KEY) {
          throw new Error("OpenRouter API key not configured")
        }

        const response = await openrouter.chat.completions.create({
          model: PROJECT_NAME_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
        })

        return response.choices[0]?.message?.content ?? ""
      },
    }
  )

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: nameResult.name,
      description: summary,
      category: "other",
      status: "draft",
    })
    .select("id, name")
    .single()

  if (projectError || !project) {
    console.error("[create-from-intake] project insert failed:", projectError)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }

  const { error: intakeError } = await supabase.from("project_intakes").insert({
    project_id: project.id,
    user_id: user.id,
    schema_version: payload.schemaVersion,
    original_idea: payload.originalIdea,
    questions_json: payload.questions as unknown as Json,
    answers_json: payload.answers as unknown as Json,
    raw_payload_json: payload as unknown as Json,
    generated_summary: summary,
    source: payload.source,
  })

  if (intakeError) {
    console.error("[create-from-intake] intake insert failed:", intakeError)
    await supabase.from("projects").delete().eq("id", project.id).eq("user_id", user.id)
    return NextResponse.json({ error: "Failed to save project intake" }, { status: 500 })
  }

  const onboardingQueue = buildOnboardingGenerationQueue()
  const generationRunId = onboardingQueue[0].runId
  const redirectUrl = buildOnboardingRedirectUrl(project)
  const statusUrl = `/api/projects/${project.id}/onboarding-status?runId=${encodeURIComponent(generationRunId)}`
  const { data: queueRow, error: queueError } = await queueSupabase
    .from("generation_queues")
    .insert({
      project_id: project.id,
      user_id: user.id,
      status: "running",
      queue: onboardingQueue as unknown as Json,
      current_index: 0,
      model_selections: {
        ...buildOnboardingQueueMetadata(generationRunId),
        redirectUrl,
        minimumReadyDocTypes: ["competitive"],
        createdAt: new Date().toISOString(),
      } as unknown as Json,
      started_at: new Date().toISOString(),
      completed_at: null,
      error_info: null,
    })
    .select("*")
    .single()

  if (queueError || !queueRow) {
    console.error("[create-from-intake] onboarding queue insert failed:", queueError)
    await supabase.from("projects").delete().eq("id", project.id).eq("user_id", user.id)
    return NextResponse.json({ error: "Failed to start project generation" }, { status: 500 })
  }

  try {
    await createGenerationQueueItems(queueSupabase, queueRow, onboardingQueue)
  } catch (itemError) {
    console.error("[create-from-intake] onboarding queue item insert failed:", itemError)
    await supabase.from("projects").delete().eq("id", project.id).eq("user_id", user.id)
    return NextResponse.json({ error: "Failed to start project generation" }, { status: 500 })
  }

  if (pendingToken) {
    const { error: claimError } = await supabase
      .from("pending_intakes")
      .update({
        claimed_at: new Date().toISOString(),
        claimed_by: user.id,
      })
      .eq("token", pendingToken)
      .is("claimed_at", null)
      .gt("expires_at", new Date().toISOString())

    if (claimError) {
      console.error("[create-from-intake] pending claim failed:", claimError)
    }
  }

  return NextResponse.json({
    project,
    projectUrl: redirectUrl,
    redirectUrl,
    projectName: nameResult.name,
    usedFallbackName: nameResult.usedFallback,
    generationRunId,
    statusUrl,
  })
}

// POST /api/projects/[id]/composer
// Ephemeral "Ask this project" chat. Answers questions grounded in the
// project's saved planning documents via OpenRouter, with the OpenRouter
// web-search plugin enabled for live outside information.
//
// Deliberately minimal backend surface: no database writes, no credits,
// no saved conversation. The client holds the session in memory only.

import { NextResponse } from "next/server"
import OpenAI from "openai"

import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { buildRequestLogContext, logError, logWarn } from "@/lib/logger"
import {
  PROJECT_COMPOSER_SYSTEM_PROMPT,
  buildProjectComposerUserPrompt,
  sanitizeInput,
  type ProjectComposerContextDoc,
} from "@/lib/prompts"

export const maxDuration = 120

const COMPOSER_MODEL =
  process.env.OPENROUTER_COMPOSER_MODEL ||
  process.env.OPENROUTER_CHAT_MODEL ||
  "anthropic/claude-sonnet-4-6"

const MAX_MESSAGE_CHARS = 4_000
const MAX_HISTORY_TURNS = 12
const MAX_HISTORY_ENTRY_CHARS = 6_000
const REQUEST_TIMEOUT_MS = 100_000

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

/** Nav keys the client may send as the active document scope. */
const DOC_SCOPE_KEYS = [
  "executive-summary",
  "market-research",
  "prd",
  "mvp",
  "mockups",
  "ai-prompts",
] as const

type DocScopeKey = (typeof DOC_SCOPE_KEYS)[number]

const DOC_SCOPE_LABELS: Record<DocScopeKey, string> = {
  "executive-summary": "Executive Summary",
  "market-research": "Market Research",
  prd: "Product Plan",
  mvp: "First Version Plan",
  mockups: "Design Mockups",
  "ai-prompts": "AI Prompts",
}

/** Which saved document tables feed each scope. */
const DOC_SCOPE_SOURCES: Record<DocScopeKey, Array<"competitive" | "prd" | "mvp">> = {
  "executive-summary": ["competitive"],
  "market-research": ["competitive"],
  prd: ["prd"],
  mvp: ["mvp"],
  // Mockups are stored images; the First Version Plan is the text the
  // storyboards were generated from, so it is the closest readable context.
  mockups: ["mvp"],
  "ai-prompts": ["prd", "mvp"],
}

const SOURCE_LABELS: Record<"competitive" | "prd" | "mvp", string> = {
  competitive: "Market Research (competitive analysis)",
  prd: "Product Plan",
  mvp: "First Version Plan",
}

interface ComposerRequestBody {
  message?: unknown
  scope?: unknown
  docKey?: unknown
  history?: unknown
}

interface HistoryTurn {
  role: "user" | "assistant"
  content: string
}

function parseHistory(value: unknown): HistoryTurn[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is { role: unknown; content: unknown } =>
      Boolean(entry && typeof entry === "object")
    )
    .filter(
      (entry): entry is { role: "user" | "assistant"; content: string } =>
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.content === "string" &&
        entry.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((entry) => ({
      role: entry.role,
      content: sanitizeInput(entry.content, MAX_HISTORY_ENTRY_CHARS),
    }))
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestLogContext = buildRequestLogContext(request)
  const { id: projectId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    logWarn("ProjectComposer", "unauthorized", requestLogContext)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [userRateLimit, ipRateLimit] = await Promise.all([
    checkRateLimit({
      key: `project-composer:user:${user.id}`,
      limit: 30,
      windowMs: 60 * 60 * 1000,
    }),
    checkRateLimit({
      key: `project-composer:ip:${getClientIp(request)}`,
      limit: 90,
      windowMs: 60 * 60 * 1000,
    }),
  ])

  if (userRateLimit.limited || ipRateLimit.limited) {
    const retryAfterSeconds = Math.max(
      userRateLimit.retryAfterSeconds,
      ipRateLimit.retryAfterSeconds
    )
    return NextResponse.json(
      { error: "Too many questions in a short time. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    )
  }

  let body: ComposerRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const message =
    typeof body.message === "string"
      ? sanitizeInput(body.message.trim(), MAX_MESSAGE_CHARS)
      : ""
  if (!message) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 })
  }

  const scope = body.scope === "project" ? "project" : "document"
  const docKey: DocScopeKey = DOC_SCOPE_KEYS.includes(body.docKey as DocScopeKey)
    ? (body.docKey as DocScopeKey)
    : "executive-summary"
  const history = parseHistory(body.history)

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "The assistant is not configured on this server." },
      { status: 503 }
    )
  }

  // Ownership check + project context.
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Load the latest saved document for each source the scope needs.
  const sources: Array<"competitive" | "prd" | "mvp"> =
    scope === "project" ? ["competitive", "prd", "mvp"] : DOC_SCOPE_SOURCES[docKey]

  const documents: ProjectComposerContextDoc[] = []
  await Promise.all(
    sources.map(async (source) => {
      let content: string | null = null
      if (source === "competitive") {
        const { data } = await supabase
          .from("analyses")
          .select("content")
          .eq("project_id", projectId)
          .eq("type", "competitive-analysis")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        content = data?.content ?? null
      } else if (source === "prd") {
        const { data } = await supabase
          .from("prds")
          .select("content")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        content = data?.content ?? null
      } else {
        const { data } = await supabase
          .from("mvp_plans")
          .select("content")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        content = data?.content ?? null
      }

      if (content?.trim()) {
        documents.push({ label: SOURCE_LABELS[source], content })
      }
    })
  )
  // Keep document order stable (competitive → prd → mvp) regardless of
  // which query resolved first.
  documents.sort(
    (a, b) =>
      Object.values(SOURCE_LABELS).indexOf(a.label) -
      Object.values(SOURCE_LABELS).indexOf(b.label)
  )

  const scopeLabel =
    scope === "project" ? "Whole project" : DOC_SCOPE_LABELS[docKey]

  const userPrompt = buildProjectComposerUserPrompt({
    projectName: project.name,
    projectSummary: project.description ?? "",
    documents,
    scopeLabel,
    question: message,
  })

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)

  try {
    const completion = await openrouter.chat.completions.create(
      {
        model: COMPOSER_MODEL,
        messages: [
          { role: "system", content: PROJECT_COMPOSER_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2_048,
        stream: true,
        // OpenRouter-specific: enables the online web-search plugin for this
        // request. Passed through the OpenAI SDK as an extra body field.
        ...({ plugins: [{ id: "web", max_results: 3 }] } as Record<string, unknown>),
      },
      { signal: timeoutSignal }
    )

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const token = chunk.choices?.[0]?.delta?.content ?? ""
            if (token) controller.enqueue(encoder.encode(token))
          }
          controller.close()
        } catch (error) {
          logError("ProjectComposer", "stream_interrupted", error, {
            ...requestLogContext,
            userId: user.id,
            projectId,
            model: COMPOSER_MODEL,
          })
          controller.error(error)
        }
      },
      cancel() {
        completion.controller.abort()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    logError("ProjectComposer", "request_failed", error, {
      ...requestLogContext,
      userId: user.id,
      projectId,
      scope,
      docKey,
      model: COMPOSER_MODEL,
    })
    const timedOut = timeoutSignal.aborted
    return NextResponse.json(
      {
        error: timedOut
          ? "The assistant took too long to answer. Please try again."
          : "The assistant could not answer right now. Please try again.",
      },
      { status: timedOut ? 504 : 502 }
    )
  }
}

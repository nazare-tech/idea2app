import { NextResponse } from "next/server"

import { createResearchRepository } from "../../../lib/research/repository"
import { buildReplyPrompt, isAllowedLocalRequest, normalizeReplyDraft, readJsonWithLimit } from "../../../lib/server/request-policy"
import { checkReplyRateLimit } from "../../../lib/server/rate-limit"
import { hasValidLaunchToken } from "../../../lib/server/session"
import { CodexUnavailableError, generateWithCodex } from "../../../lib/server/codex-runner"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isAllowedLocalRequest(request.headers) || !(await hasValidLaunchToken(request.headers))) return NextResponse.json({ error: "Invalid local session." }, { status: 403 })
  if (!checkReplyRateLimit(request.headers.get("x-research-token") || "unknown")) return NextResponse.json({ error: "Reply limit reached. Try again later." }, { status: 429 })
  try {
    const body = await readJsonWithLimit(request) as { itemId?: unknown }
    if (typeof body.itemId !== "string") throw new Error("Research item is required")
    const { document } = await createResearchRepository().load()
    const item = document.items.find((candidate) => candidate.id === body.itemId)
    if (!item) throw new Error("Unknown research item")
    const draft = normalizeReplyDraft(await generateWithCodex(buildReplyPrompt({
      source: item.sourceLabel, title: item.title, excerpt: item.excerpt,
      context: document.workspace.topic, voice: document.workspace.voice,
    }), { outputCap: 12_000 }))
    return NextResponse.json({ draft })
  } catch (error) {
    if (error instanceof CodexUnavailableError) return NextResponse.json({ error: "Local Codex CLI is unavailable or not configured." }, { status: 503 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reply generation failed." }, { status: 400 })
  }
}

import { NextResponse } from "next/server"

import { InvalidArticleDraftError, isArticleCandidate, parseArticleDraft } from "../../../lib/research/article"
import { ArticleConflictError, createResearchRepository, DocumentTooLargeError } from "../../../lib/research/repository"
import { generateWithCodex, CodexUnavailableError } from "../../../lib/server/codex-runner"
import { checkReplyRateLimit } from "../../../lib/server/rate-limit"
import { buildArticlePrompt, isAllowedLocalRequest, readJsonWithLimit } from "../../../lib/server/request-policy"
import { hasValidLaunchToken } from "../../../lib/server/session"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isAllowedLocalRequest(request.headers) || !(await hasValidLaunchToken(request.headers))) return NextResponse.json({ error: "Invalid local session." }, { status: 403 })
  try {
    const body = await readJsonWithLimit(request, 1_000) as { itemId?: unknown; replace?: unknown }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid article request")
    if (Object.keys(body).some((key) => key !== "itemId" && key !== "replace")) throw new Error("Invalid article request")
    if (typeof body.itemId !== "string" || (body.replace !== undefined && typeof body.replace !== "boolean")) throw new Error("Invalid article request")

    const repository = createResearchRepository()
    const { document } = await repository.load()
    const item = document.items.find((candidate) => candidate.id === body.itemId)
    if (!item) throw new Error("Unknown research item")
    if (!isArticleCandidate(item)) throw new Error("This finding is not an article candidate")
    const token = request.headers.get("x-research-token") || "unknown"
    if (!checkReplyRateLimit(`article:${token}`, 10)) return NextResponse.json({ error: "Article generation limit reached. Try again later." }, { status: 429 })

    const raw = await generateWithCodex(buildArticlePrompt({
      title: item.title,
      excerpt: item.excerpt,
      tags: item.tags,
      url: item.url,
      context: document.workspace.topic,
      voice: document.workspace.voice,
    }), { purpose: "article", timeoutMs: 120_000, outputCap: 20_000 })
    const article = parseArticleDraft(raw)
    const updatedDocument = await repository.saveArticleDraft(item.id, article, body.replace === true)
    return NextResponse.json({ article, document: updatedDocument })
  } catch (error) {
    if (error instanceof ArticleConflictError) return NextResponse.json({ error: "Article draft already exists. Choose regenerate to replace it." }, { status: 409 })
    if (error instanceof DocumentTooLargeError) return NextResponse.json({ error: "The local research workspace is too large to save another article." }, { status: 507 })
    if (error instanceof CodexUnavailableError) return NextResponse.json({ error: "Local Codex CLI is unavailable or did not finish the article." }, { status: 503 })
    if (error instanceof InvalidArticleDraftError) return NextResponse.json({ error: "Codex returned an invalid article draft. Try again." }, { status: 502 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Article generation failed." }, { status: 400 })
  }
}

import { NextResponse } from "next/server"

import { createResearchRepository } from "../../../lib/research/repository"
import type { BrowserMode } from "../../../lib/research/types"
import { launchBrowser } from "../../../lib/server/browser-launcher"
import { isAllowedLocalRequest, parseStoredHttpsUrl, readJsonWithLimit } from "../../../lib/server/request-policy"
import { hasValidLaunchToken } from "../../../lib/server/session"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isAllowedLocalRequest(request.headers) || !(await hasValidLaunchToken(request.headers))) return NextResponse.json({ error: "Invalid local session." }, { status: 403 })
  try {
    const body = await readJsonWithLimit(request) as { itemId?: unknown; browserMode?: unknown }
    if (typeof body.itemId !== "string") throw new Error("Research item is required")
    const { document } = await createResearchRepository().load()
    const item = document.items.find((candidate) => candidate.id === body.itemId)
    if (!item) throw new Error("Unknown research item")
    const mode = body.browserMode as BrowserMode
    if (!["default", "chrome", "safari", "firefox", "arc"].includes(mode)) throw new Error("Unsupported browser")
    await launchBrowser(mode, parseStoredHttpsUrl(item.url))
    return NextResponse.json({ opened: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Browser launch failed." }, { status: 400 })
  }
}

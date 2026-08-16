import { NextResponse } from "next/server"

import { createResearchRepository, RepositoryBusyError, RevisionConflictError } from "../../../lib/research/repository"
import type { ResearchUpdate } from "../../../lib/research/types"
import { isAllowedLocalRequest, readJsonWithLimit } from "../../../lib/server/request-policy"
import { hasValidLaunchToken } from "../../../lib/server/session"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isAllowedLocalRequest(request.headers) || !(await hasValidLaunchToken(request.headers))) return NextResponse.json({ error: "Invalid local session." }, { status: 403 })
  try {
    const body = await readJsonWithLimit(request) as { revision?: unknown; update?: unknown }
    if (!Number.isSafeInteger(body.revision) || !body.update || typeof body.update !== "object") throw new Error("Invalid state update")
    const document = await createResearchRepository().update(body.revision as number, body.update as ResearchUpdate)
    return NextResponse.json({ document })
  } catch (error) {
    if (error instanceof RevisionConflictError) return NextResponse.json({ error: error.message }, { status: 409 })
    if (error instanceof RepositoryBusyError) return NextResponse.json({ error: error.message }, { status: 503 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "State update failed." }, { status: 400 })
  }
}

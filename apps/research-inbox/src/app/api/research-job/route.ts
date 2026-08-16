import { NextResponse } from "next/server"

import { isAllowedLocalRequest, readJsonWithLimit } from "../../../lib/server/request-policy"
import { getResearchJobService, toPublicResearchRun } from "../../../lib/server/research-job-service"
import { hasValidLaunchToken } from "../../../lib/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

export async function GET(request: Request) {
  if (!isAllowedLocalRequest(request.headers, true) || !(await hasValidLaunchToken(request.headers))) return json({ error: "Invalid local session." }, 403)
  try {
    return json({ job: toPublicResearchRun(await getResearchJobService().load()) })
  } catch {
    return json({ error: "Could not read research status." }, 500)
  }
}

export async function POST(request: Request) {
  if (!isAllowedLocalRequest(request.headers) || !(await hasValidLaunchToken(request.headers))) return json({ error: "Invalid local session." }, 403)
  try {
    const body = await readJsonWithLimit(request, 256)
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) throw new Error("This action does not accept input.")
    const claimed = await getResearchJobService().start()
    return json({ job: toPublicResearchRun(claimed.job), reused: claimed.reused }, 202)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not start research." }, 400)
  }
}

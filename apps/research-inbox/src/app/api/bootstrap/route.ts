import { NextResponse } from "next/server"

import { createResearchRepository } from "../../../lib/research/repository"
import { isAllowedLocalRequest } from "../../../lib/server/request-policy"
import { issueLaunchToken } from "../../../lib/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (!isAllowedLocalRequest(request.headers, true)) return NextResponse.json({ error: "Loopback access only." }, { status: 403 })
  const loaded = await createResearchRepository().load()
  return NextResponse.json({ ...loaded, launchToken: await issueLaunchToken(), freshWorkspace: loaded.document.revision === 0 })
}

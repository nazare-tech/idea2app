import { NextResponse } from "next/server"

import { requirePromptLabRequest, getOwnedProject } from "../_utils"
import { isPromptLabArtifact } from "@/lib/prompt-lab"

export async function GET(request: Request) {
  const guard = await requirePromptLabRequest(request, {
    rateLimitKey: "runs",
    limit: 90,
  })
  if ("response" in guard) return guard.response

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const artifact = searchParams.get("artifact")

  if (!projectId || !isPromptLabArtifact(artifact)) {
    return NextResponse.json({ error: "projectId and valid artifact are required" }, { status: 400 })
  }

  const project = await getOwnedProject(guard.supabase, projectId, guard.user.id)
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const { data, error } = await guard.supabase
    .from("prompt_lab_runs")
    .select("*")
    .eq("user_id", guard.user.id)
    .eq("project_id", projectId)
    .eq("artifact_type", artifact)
    .order("created_at", { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: "Failed to load Prompt Lab runs" }, { status: 500 })
  }

  return NextResponse.json({ runs: data ?? [] })
}

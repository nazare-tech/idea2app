import { NextResponse } from "next/server"

import { requirePromptLabRequest, getOwnedProject } from "../_utils"
import { isPromptLabArtifact } from "@/lib/prompt-lab"

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

export async function GET(request: Request) {
  const guard = await requirePromptLabRequest(request, {
    rateLimitKey: "drafts",
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
    .from("prompt_lab_experiments")
    .select("*")
    .eq("user_id", guard.user.id)
    .eq("project_id", projectId)
    .eq("artifact_type", artifact)
    .order("updated_at", { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: "Failed to load Prompt Lab drafts" }, { status: 500 })
  }

  return NextResponse.json({ drafts: data ?? [] })
}

export async function POST(request: Request) {
  const guard = await requirePromptLabRequest(request, {
    rateLimitKey: "drafts-save",
    limit: 30,
  })
  if ("response" in guard) return guard.response

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const artifact = body.artifact
  const projectId = asString(body.projectId)
  const title = asString(body.title, "Untitled prompt draft").trim().slice(0, 160) || "Untitled prompt draft"
  const systemPrompt = asString(body.systemPrompt).trim()
  const userPrompt = asString(body.userPrompt).trim()
  const model = asString(body.model).trim()

  if (!projectId || !isPromptLabArtifact(artifact) || !systemPrompt || !userPrompt || !model) {
    return NextResponse.json(
      { error: "projectId, artifact, systemPrompt, userPrompt, and model are required" },
      { status: 400 },
    )
  }

  if (systemPrompt.length > 200_000 || userPrompt.length > 200_000) {
    return NextResponse.json({ error: "Prompt text is too long" }, { status: 400 })
  }

  const project = await getOwnedProject(guard.supabase, projectId, guard.user.id)
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const { data, error } = await guard.supabase
    .from("prompt_lab_experiments")
    .insert({
      user_id: guard.user.id,
      project_id: projectId,
      artifact_type: artifact,
      title,
      system_prompt: systemPrompt,
      user_prompt: userPrompt,
      model_id: model,
      metadata: {},
    })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to save Prompt Lab draft" }, { status: 500 })
  }

  return NextResponse.json({ draft: data })
}

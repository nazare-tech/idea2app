import { NextResponse } from "next/server"

import { requirePromptLabRequest, getOwnedProject } from "../_utils"
import {
  PROMPT_LAB_ARTIFACT_LABELS,
  isMockupOptionLabel,
  isPromptLabArtifact,
  runPromptLabArtifact,
} from "@/lib/prompt-lab"
import { linkifyBareUrls } from "@/lib/markdown-links"
import type { Json } from "@/types/database"

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function validatePromptText(value: string, label: string) {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} is required`)
  if (trimmed.length > 200_000) throw new Error(`${label} is too long`)
  return trimmed
}

export async function POST(request: Request) {
  const guard = await requirePromptLabRequest(request, {
    rateLimitKey: "run",
    limit: 12,
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
  const experimentId = asString(body.experimentId) || null
  const title = asString(body.title, "Untitled run").trim().slice(0, 160) || "Untitled run"
  const notes = asString(body.notes).trim().slice(0, 5000) || null
  const mockupOption = isMockupOptionLabel(body.mockupOption) ? body.mockupOption : "A"
  const model = asString(body.model).trim()
  let systemPrompt: string
  let userPrompt: string

  if (!isPromptLabArtifact(artifact) || !projectId || !model) {
    return NextResponse.json({ error: "artifact, projectId, and model are required" }, { status: 400 })
  }

  try {
    systemPrompt = validatePromptText(asString(body.systemPrompt), "System prompt")
    userPrompt = validatePromptText(asString(body.userPrompt), "User prompt")
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid prompt input" },
      { status: 400 },
    )
  }

  const project = await getOwnedProject(guard.supabase, projectId, guard.user.id)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const inputSnapshot = {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
    },
    mockupOption,
  } satisfies Record<string, Json>

  try {
    const result = await runPromptLabArtifact({
      artifact,
      projectId,
      projectName: project.name,
      systemPrompt,
      userPrompt,
      model,
      mockupOption,
    })

    const outputContent = artifact === "mockups" ? result.content : linkifyBareUrls(result.content)
    const { data: run, error: insertError } = await guard.supabase
      .from("prompt_lab_runs")
      .insert({
        experiment_id: experimentId,
        user_id: guard.user.id,
        project_id: projectId,
        artifact_type: artifact,
        title,
        model_id: result.model,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        input_snapshot: inputSnapshot,
        output_content: outputContent,
        output_metadata: {
          ...result.metadata,
          source: result.source,
        } satisfies Record<string, Json>,
        status: "completed",
        notes,
      })
      .select("*")
      .single()

    if (insertError) {
      throw new Error(`Failed to save Prompt Lab run: ${insertError.message}`)
    }

    return NextResponse.json({ run, content: outputContent, model: result.model })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompt Lab run failed"

    const { data: failedRun } = await guard.supabase
      .from("prompt_lab_runs")
      .insert({
        experiment_id: experimentId,
        user_id: guard.user.id,
        project_id: projectId,
        artifact_type: artifact,
        title,
        model_id: model,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        input_snapshot: inputSnapshot,
        output_metadata: {
          source: "prompt-lab",
          mockupOption,
        },
        status: "failed",
        error_message: message,
        notes,
      })
      .select("*")
      .single()

    return NextResponse.json(
      {
        error: message,
        run: failedRun ?? null,
        artifactLabel: PROMPT_LAB_ARTIFACT_LABELS[artifact],
      },
      { status: 500 },
    )
  }
}

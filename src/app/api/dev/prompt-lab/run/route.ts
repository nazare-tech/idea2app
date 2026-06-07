import { NextResponse } from "next/server"

import { requirePromptLabRequest, getOwnedProject } from "../_utils"
import {
  PROMPT_LAB_ARTIFACT_LABELS,
  isMockupOptionLabel,
  isPromptLabArtifact,
  runPromptLabArtifact,
} from "@/lib/prompt-lab"
import { linkifyBareUrls } from "@/lib/markdown-links"
import { MOCKUP_PRIMARY_PLATFORMS, type MockupPrimaryPlatform } from "@/lib/mockup-design-plan"
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

function readMockupPlatformPreference(value: unknown): MockupPrimaryPlatform | "auto" {
  if (typeof value !== "string" || !value || value === "auto") return "auto"
  if ((MOCKUP_PRIMARY_PLATFORMS as readonly string[]).includes(value)) return value as MockupPrimaryPlatform
  return "auto"
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
  const mockupPlatform = readMockupPlatformPreference(body.mockupPlatform)
  const runMode = artifact === "mockups" && asString(body.runMode) === "planner-option" ? "planner-option" : "isolated"
  const model = asString(body.model).trim()
  let systemPrompt: string
  let userPrompt: string
  let plannerSystemPrompt: string | undefined
  let plannerUserPrompt: string | undefined

  if (!isPromptLabArtifact(artifact) || !projectId || !model) {
    return NextResponse.json({ error: "artifact, projectId, and model are required" }, { status: 400 })
  }

  try {
    systemPrompt = validatePromptText(asString(body.systemPrompt), "System prompt")
    userPrompt = validatePromptText(asString(body.userPrompt), "User prompt")
    if (runMode === "planner-option") {
      plannerSystemPrompt = validatePromptText(asString(body.plannerSystemPrompt), "Planner system prompt")
      plannerUserPrompt = validatePromptText(asString(body.plannerUserPrompt), "Planner user prompt")
    }
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

  let mockupMvpPlan: string | undefined
  if (artifact === "mockups" && runMode === "planner-option") {
    const { data: mvpPlan, error: mvpError } = await guard.supabase
      .from("mvp_plans")
      .select("content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (mvpError) {
      return NextResponse.json({ error: "Failed to load First Version Plan context" }, { status: 500 })
    }

    mockupMvpPlan = mvpPlan?.content ?? `First Version Plan for ${project.name}: ${project.description ?? ""}`
  }

  const inputSnapshot = {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
    },
    mockupOption,
    mockupPlatform,
    runMode,
    ...(runMode === "planner-option" && plannerSystemPrompt && plannerUserPrompt
      ? {
          plannerPrompts: {
            systemPrompt: plannerSystemPrompt,
            userPrompt: plannerUserPrompt,
          },
        }
      : {}),
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
      mockupPlatform,
      runMode,
      plannerSystemPrompt,
      plannerUserPrompt,
      mockupMvpPlan,
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
          mockupPlatform,
          runMode,
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

import { NextResponse } from "next/server"

import { requirePromptLabRequest, getOwnedProject } from "../_utils"
import {
  PROMPT_LAB_DEFAULT_LAUNCH_BRIEF,
  buildPromptLabDefaultPrompts,
  isMockupOptionLabel,
  isPromptLabArtifact,
} from "@/lib/prompt-lab"
import {
  MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT,
  MOCKUP_PRIMARY_PLATFORMS,
  buildMockupDesignPlanUserPrompt,
  type MockupPrimaryPlatform,
} from "@/lib/mockups/design-plan"
import { getProjectIntakeContextForAi } from "@/lib/project-intake-context"

function readMockupPlatformPreference(value: string | null): MockupPrimaryPlatform | null {
  if (!value || value === "auto") return null
  return (MOCKUP_PRIMARY_PLATFORMS as readonly string[]).includes(value)
    ? value as MockupPrimaryPlatform
    : null
}

export async function GET(request: Request) {
  const guard = await requirePromptLabRequest(request, {
    rateLimitKey: "context",
    limit: 90,
  })
  if ("response" in guard) return guard.response

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const artifact = searchParams.get("artifact")
  const mockupOptionParam = searchParams.get("mockupOption")
  const mockupPlatformPreference = readMockupPlatformPreference(searchParams.get("mockupPlatform"))

  if (!projectId || !isPromptLabArtifact(artifact)) {
    return NextResponse.json({ error: "projectId and valid artifact are required" }, { status: 400 })
  }

  const project = await getOwnedProject(guard.supabase, projectId, guard.user.id)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const [
    idea,
    competitive,
    prd,
    mvp,
    launch,
    mockup,
  ] = await Promise.all([
    getProjectIntakeContextForAi(guard.supabase, projectId, project.description),
    guard.supabase
      .from("analyses")
      .select("id, content, created_at, metadata")
      .eq("project_id", projectId)
      .eq("type", "competitive-analysis")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    guard.supabase
      .from("prds")
      .select("id, content, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    guard.supabase
      .from("mvp_plans")
      .select("id, content, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    guard.supabase
      .from("analyses")
      .select("id, content, created_at, metadata")
      .eq("project_id", projectId)
      .eq("type", "launch-plan")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    guard.supabase
      .from("mockups")
      .select("id, content, created_at, metadata, model_used")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (competitive.error || prd.error || mvp.error || launch.error || mockup.error) {
    return NextResponse.json({ error: "Failed to load project artifacts" }, { status: 500 })
  }

  const mockupOption = isMockupOptionLabel(mockupOptionParam) ? mockupOptionParam : "A"
  const promptDefaults = buildPromptLabDefaultPrompts({
    artifact,
    idea,
    name: project.name,
    competitiveAnalysis: competitive.data?.content,
    prd: prd.data?.content,
    mvpPlan: mvp.data?.content,
    launchBrief: PROMPT_LAB_DEFAULT_LAUNCH_BRIEF,
    mockupOption,
  })
  const mockupPlannerPrompt = artifact === "mockups"
    ? {
        systemPrompt: MOCKUP_DESIGN_PLAN_SYSTEM_PROMPT,
        userPrompt: buildMockupDesignPlanUserPrompt({
          projectName: project.name,
          idea: project.description,
          intakeContext: idea,
          platformPreference: mockupPlatformPreference,
          productPlan: prd.data?.content,
          mvpPlan: mvp.data?.content ?? `First Version Plan for ${project.name}: ${idea}`,
        }),
      }
    : null

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      idea,
      updatedAt: project.updated_at,
    },
    promptDefaults,
    mockupPlannerPrompt,
    launchBrief: PROMPT_LAB_DEFAULT_LAUNCH_BRIEF,
    upstream: {
      competitive: competitive.data ?? null,
      prd: prd.data ?? null,
      mvp: mvp.data ?? null,
      launch: launch.data ?? null,
      mockups: mockup.data ?? null,
    },
  })
}

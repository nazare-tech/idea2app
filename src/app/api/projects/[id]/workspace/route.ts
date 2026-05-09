import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isDocumentType, type DocumentType } from "@/lib/document-definitions"
import { resolveWorkspaceDocumentTab } from "@/lib/workspace-tab-policy"

interface WorkspacePayload {
  project: {
    id: string
    name: string
    description: string | null
    status: string | null
  }
  credits: number
  hasStructuredIntake: boolean
  documents: {
    competitive: Array<{ id: string; type: string; content: string; created_at: string | null; metadata?: unknown }>
    prd: Array<{ id: string; content: string; created_at: string | null }>
    mvp: Array<{ id: string; content: string; created_at: string | null }>
    mockups: Array<{ id: string; content: string; model_used: string | null; created_at: string | null }>
    techspec: Array<{ id: string; content: string; created_at: string | null }>
    deploy: Array<{ id: string; deployment_url: string | null; github_repo_url: string | null; status: string | null; build_logs: string | null; error_message: string | null; created_at: string | null }>
    launch: Array<{ id: string; type: string; content: string; created_at: string | null; metadata?: unknown }>
  }
}

const EMPTY_DOCUMENTS: WorkspacePayload["documents"] = {
  competitive: [],
  prd: [],
  mvp: [],
  mockups: [],
  techspec: [],
  deploy: [],
  launch: [],
}

function parseRequestedDocuments(searchParams: URLSearchParams): DocumentType[] {
  const docsParam = searchParams.get("docs")
  if (!docsParam) {
    return [resolveWorkspaceDocumentTab(searchParams.get("tab"))]
  }

  const requested = docsParam
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is DocumentType => isDocumentType(value))

  return requested.length > 0 ? Array.from(new Set(requested)) : [resolveWorkspaceDocumentTab(searchParams.get("tab"))]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const requestedDocs = parseRequestedDocuments(searchParams)
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [{ data: project, error: projectError }, { data: credits }, { data: projectIntake }] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, description, status")
        .eq("id", id)
        .eq("user_id", user.id)
        .single(),
      supabase.from("credits").select("balance").eq("user_id", user.id).single(),
      supabase.from("project_intakes").select("id").eq("project_id", id).eq("user_id", user.id).maybeSingle(),
    ])

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const documents: WorkspacePayload["documents"] = {
      ...EMPTY_DOCUMENTS,
    }

    await Promise.all(
      requestedDocs.map(async (docType) => {
        switch (docType) {
          case "competitive": {
            const { data } = await supabase
              .from("analyses")
              .select("id, type, content, created_at, metadata")
              .eq("project_id", id)
              .eq("type", "competitive-analysis")
              .order("created_at", { ascending: false })
            documents.competitive = data ?? []
            break
          }
          case "prd": {
            const { data } = await supabase
              .from("prds")
              .select("id, content, created_at")
              .eq("project_id", id)
              .order("created_at", { ascending: false })
            documents.prd = data ?? []
            break
          }
          case "mvp": {
            const { data } = await supabase
              .from("mvp_plans")
              .select("id, content, created_at")
              .eq("project_id", id)
              .order("created_at", { ascending: false })
            documents.mvp = data ?? []
            break
          }
          case "mockups": {
            const { data } = await supabase
              .from("mockups")
              .select("id, content, model_used, created_at")
              .eq("project_id", id)
              .order("created_at", { ascending: false })
            documents.mockups = data ?? []
            break
          }
          case "techspec": {
            const { data } = await supabase
              .from("tech_specs")
              .select("id, content, created_at")
              .eq("project_id", id)
              .order("created_at", { ascending: false })
            documents.techspec = data ?? []
            break
          }
          case "deploy": {
            const { data } = await supabase
              .from("deployments")
              .select("id, deployment_url, github_repo_url, status, build_logs, error_message, created_at")
              .eq("project_id", id)
              .order("created_at", { ascending: false })
            documents.deploy = data ?? []
            break
          }
          case "launch": {
            const { data } = await supabase
              .from("analyses")
              .select("id, type, content, created_at, metadata")
              .eq("project_id", id)
              .eq("type", "launch-plan")
              .order("created_at", { ascending: false })
            documents.launch = data ?? []
            break
          }
          case "prompt":
            break
        }
      })
    )

    return NextResponse.json({
      data: {
        project,
        credits: credits?.balance || 0,
        hasStructuredIntake: Boolean(projectIntake),
        documents,
      } satisfies WorkspacePayload,
    })
  } catch (error) {
    console.error("Error loading workspace payload:", error)
    return NextResponse.json({ error: "Failed to load workspace payload" }, { status: 500 })
  }
}

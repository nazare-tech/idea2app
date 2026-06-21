import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildRequestLogContext, logError, logInfo, logWarn } from "@/lib/logger"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

interface MockupParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: MockupParams) {
  const requestLogContext = buildRequestLogContext(request)
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logWarn("MockupUpdate", "unauthorized", requestLogContext)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userLogContext = { ...requestLogContext, userId: user.id, mockupId: id }
    const body = await request.json()
    const { content } = body

    if (!content) {
      logWarn("MockupUpdate", "validation_failed", userLogContext)
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const projectId = await getUserProjectId(supabase, user.id, id)
    if (!projectId) {
      logWarn("MockupUpdate", "not_found", userLogContext)
      return NextResponse.json(
        { error: "Mockup not found or access denied" },
        { status: 404 }
      )
    }

    // Verify ownership and update
    const { data: mockup, error } = await supabase
      .from("mockups")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("project_id", projectId)
      .select()
      .single()

    if (error || !mockup) {
      logError("MockupUpdate", "update_failed", error, { ...userLogContext, projectId })
      return NextResponse.json(
        { error: "Mockup not found or access denied" },
        { status: 404 }
      )
    }

    logInfo("MockupUpdate", "updated", { ...userLogContext, projectId })
    return NextResponse.json({ data: mockup })
  } catch (error) {
    logError("MockupUpdate", "request_failed", error, requestLogContext)
    return NextResponse.json({ error: "Failed to update mockup" }, { status: 500 })
  }
}

// Helper function to verify project ownership
async function getUserProjectId(
  supabase: SupabaseServerClient,
  userId: string,
  mockupId: string,
): Promise<string | null> {
  const { data: mockup } = await supabase
    .from("mockups")
    .select("project_id")
    .eq("id", mockupId)
    .single()

  if (!mockup) return null

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", mockup.project_id)
    .eq("user_id", userId)
    .single()

  return project?.id || null
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let userId: string | undefined
  let projectId: string | undefined

  try {
    const supabase = await createClient()
    const { id } = await params

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      statusCode = 401
      errorType = "unauthorized"
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id

    // Parse request
    const { content } = await request.json()

    if (!content) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "Content is required"
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify the analysis belongs to the user's project
    const { data: analysis, error: fetchError } = await supabase
      .from("analyses")
      .select("project_id, projects!inner(user_id)")
      .eq("id", id)
      .single()

    if (fetchError || !analysis) {
      statusCode = 404
      errorType = "not_found"
      errorMessage = "Analysis not found"
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 })
    }

    projectId = analysis.project_id

    // Type assertion to access nested project data
    const projectData = analysis.projects as unknown as { user_id: string }
    if (projectData.user_id !== user.id) {
      statusCode = 403
      errorType = "unauthorized"
      errorMessage = "Unauthorized"
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update the analysis
    const { data: updated, error: updateError } = await supabase
      .from("analyses")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating analysis:", updateError)
      statusCode = 500
      errorType = "server_error"
      errorMessage = updateError.message
      return NextResponse.json(
        { error: "Failed to update analysis" },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("Error in analyses PATCH:", error)
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  } finally {
    // Track metrics (fire and forget - won't block response)
    if (userId) {
      trackAPIMetrics({
        endpoint: "/api/analyses/[id]",
        method: "PATCH",
        featureType: "project-management",
        userId,
        projectId: projectId || null,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        creditsConsumed: 0,
        errorType,
        errorMessage,
      })
    }
  }
}

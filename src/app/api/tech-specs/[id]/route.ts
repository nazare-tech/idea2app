import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"

export async function PATCH(
  _request: Request,
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
    const { id: _id } = await params

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

    // Tech Spec feature is currently disabled
    return NextResponse.json({ error: "Tech spec feature is currently unavailable" }, { status: 410 })
  } catch (error) {
    console.error("Error in tech-specs PATCH:", error)
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
        endpoint: "/api/tech-specs/[id]",
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

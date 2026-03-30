import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, queue, modelSelections } = body

    if (!projectId || !queue || !modelSelections) {
      return NextResponse.json(
        { error: "projectId, queue, and modelSelections are required" },
        { status: 400 },
      )
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Upsert: replace any existing queue for this project+user
    const { data, error } = await supabase
      .from("generation_queues")
      .upsert(
        {
          project_id: projectId,
          user_id: user.id,
          status: "running",
          queue,
          current_index: 0,
          model_selections: modelSelections,
          started_at: new Date().toISOString(),
          completed_at: null,
          error_info: null,
        },
        { onConflict: "project_id,user_id" },
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ queue: data })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

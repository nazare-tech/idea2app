import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify the tech spec belongs to the user's project
    const { data: techSpec, error: fetchError } = await supabase
      .from("tech_specs")
      .select("project_id, projects!inner(user_id)")
      .eq("id", id)
      .single()

    if (fetchError || !techSpec) {
      return NextResponse.json({ error: "Tech spec not found" }, { status: 404 })
    }

    // Type assertion to access nested project data
    const projectData = techSpec.projects as unknown as { user_id: string }
    if (projectData.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update the tech spec
    const { data: updated, error: updateError } = await supabase
      .from("tech_specs")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating tech spec:", updateError)
      return NextResponse.json(
        { error: "Failed to update tech spec" },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("Error in tech-specs PATCH:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

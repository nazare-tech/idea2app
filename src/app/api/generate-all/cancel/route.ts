import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface QueueItem {
  docType: string
  status: string
  creditCost: number
  stageMessage?: string
}

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
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
    }

    // Fetch current queue to update item statuses
    const { data: existing } = await supabase
      .from("generation_queues")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "No active queue found" }, { status: 404 })
    }

    // Mark pending/generating items as cancelled
    const rawQueue = existing.queue as unknown as QueueItem[]
    const updatedQueue = rawQueue.map((item: QueueItem) =>
      item.status === "pending" || item.status === "generating"
        ? { ...item, status: "cancelled" }
        : item,
    )

    const { data, error } = await supabase
      .from("generation_queues")
      .update({
        status: "cancelled",
        queue: JSON.parse(JSON.stringify(updatedQueue)),
        completed_at: new Date().toISOString(),
      })
      .eq("project_id", projectId)
      .eq("user_id", user.id)
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

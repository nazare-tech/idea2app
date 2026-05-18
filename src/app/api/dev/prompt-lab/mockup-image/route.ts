import { NextResponse } from "next/server"

import { requirePromptLabRequest, getOwnedProject } from "../_utils"
import { MOCKUP_STORAGE_BUCKET } from "@/lib/openrouter-image-mockup-pipeline"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET(request: Request) {
  const guard = await requirePromptLabRequest(request, {
    rateLimitKey: "mockup-image",
    limit: 120,
  })
  if ("response" in guard) return guard.response

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const path = searchParams.get("path")

  if (!projectId || !path) {
    return NextResponse.json({ error: "projectId and path are required" }, { status: 400 })
  }

  if (!path.startsWith(`${projectId}/`) || path.includes("..")) {
    return NextResponse.json({ error: "Invalid image path" }, { status: 400 })
  }

  const project = await getOwnedProject(guard.supabase, projectId, guard.user.id)
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const { data: runs, error } = await guard.supabase
    .from("prompt_lab_runs")
    .select("id, output_content")
    .eq("user_id", guard.user.id)
    .eq("project_id", projectId)
    .eq("artifact_type", "mockups")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: "Failed to verify Prompt Lab image ownership" }, { status: 500 })
  }

  const isOwnedLabPath = (runs ?? []).some((run) => run.output_content?.includes(path))
  if (!isOwnedLabPath) {
    return NextResponse.json({ error: "Image is not associated with a Prompt Lab run" }, { status: 403 })
  }

  const storageSupabase = createServiceClient()
  const { data: blob, error: downloadError } = await storageSupabase.storage
    .from(MOCKUP_STORAGE_BUCKET)
    .download(path)

  if (downloadError || !blob) {
    return NextResponse.json({ error: "Failed to load mockup image" }, { status: 404 })
  }

  const contentType = blob.type || "image/png"
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Stored object is not an image" }, { status: 415 })
  }

  return new Response(await blob.arrayBuffer(), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  })
}

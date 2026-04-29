import { NextResponse } from "next/server"

import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { MOCKUP_STORAGE_BUCKET } from "@/lib/openrouter-image-mockup-pipeline"
import { getStoragePathsFromOpenRouterImageMockupContent } from "@/lib/openrouter-image-mockup-format"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = checkRateLimit({
    key: `mockups-image:${user.id}:${getClientIp(request)}`,
    limit: 120,
    windowMs: 60_000,
  })
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    )
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const path = searchParams.get("path")
  const mockupId = searchParams.get("mockupId")

  if (!projectId || !path) {
    return NextResponse.json({ error: "projectId and path are required" }, { status: 400 })
  }

  if (!path.startsWith(`${projectId}/`) || path.includes("..")) {
    return NextResponse.json({ error: "Invalid image path" }, { status: 400 })
  }

  let query = supabase
    .from("mockups")
    .select("id, content, projects!inner(id, user_id)")
    .eq("project_id", projectId)
    .eq("projects.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  if (mockupId) {
    query = query.eq("id", mockupId).limit(1)
  }

  const { data: mockups, error } = await query
  if (error) {
    console.error("[Mockup image proxy] ownership lookup failed:", error)
    return NextResponse.json({ error: "Failed to verify mockup ownership" }, { status: 500 })
  }

  const isOwnedSavedPath = (mockups ?? []).some((mockup) =>
    getStoragePathsFromOpenRouterImageMockupContent(mockup.content).has(path),
  )
  if (!isOwnedSavedPath) {
    return NextResponse.json({ error: "Image is not associated with this project" }, { status: 403 })
  }

  const storageSupabase = createServiceClient()
  const { data: blob, error: downloadError } = await storageSupabase.storage
    .from(MOCKUP_STORAGE_BUCKET)
    .download(path)

  if (downloadError || !blob) {
    console.error("[Mockup image proxy] storage download failed:", downloadError)
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

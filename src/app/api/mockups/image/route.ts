import { NextResponse } from "next/server"

import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { MOCKUP_STORAGE_BUCKET } from "@/lib/openrouter-image-mockup-pipeline"
import { getStoragePathsFromOpenRouterImageMockupContent } from "@/lib/openrouter-image-mockup-format"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { buildRequestLogContext, logError, logWarn } from "@/lib/logger"

export async function GET(request: Request) {
  const requestLogContext = buildRequestLogContext(request)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    logWarn("MockupImage", "unauthorized", requestLogContext)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userLogContext = { ...requestLogContext, userId: user.id }
  const rateLimit = checkRateLimit({
    key: `mockups-image:${user.id}:${getClientIp(request)}`,
    limit: 120,
    windowMs: 60_000,
  })
  if (rateLimit.limited) {
    logWarn("MockupImage", "rate_limited", {
      ...userLogContext,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    })
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
    logWarn("MockupImage", "validation_failed", {
      ...userLogContext,
      hasProjectId: Boolean(projectId),
      hasPath: Boolean(path),
    })
    return NextResponse.json({ error: "projectId and path are required" }, { status: 400 })
  }

  if (!path.startsWith(`${projectId}/`) || path.includes("..")) {
    logWarn("MockupImage", "invalid_path", { ...userLogContext, projectId, mockupId })
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
    logError("MockupImage", "ownership_lookup_failed", error, { ...userLogContext, projectId, mockupId })
    return NextResponse.json({ error: "Failed to verify mockup ownership" }, { status: 500 })
  }

  const isOwnedSavedPath = (mockups ?? []).some((mockup) =>
    getStoragePathsFromOpenRouterImageMockupContent(mockup.content).has(path),
  )
  if (!isOwnedSavedPath) {
    logWarn("MockupImage", "path_not_owned", { ...userLogContext, projectId, mockupId })
    return NextResponse.json({ error: "Image is not associated with this project" }, { status: 403 })
  }

  const storageSupabase = createServiceClient()
  const { data: blob, error: downloadError } = await storageSupabase.storage
    .from(MOCKUP_STORAGE_BUCKET)
    .download(path)

  if (downloadError || !blob) {
    logError("MockupImage", "storage_download_failed", downloadError, { ...userLogContext, projectId, mockupId })
    return NextResponse.json({ error: "Failed to load mockup image" }, { status: 404 })
  }

  const contentType = blob.type || "image/png"
  if (!contentType.startsWith("image/")) {
    logWarn("MockupImage", "invalid_content_type", { ...userLogContext, projectId, mockupId, contentType })
    return NextResponse.json({ error: "Stored object is not an image" }, { status: 415 })
  }

  return new Response(await blob.arrayBuffer(), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  })
}

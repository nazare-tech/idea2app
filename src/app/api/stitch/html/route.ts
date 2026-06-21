import { NextResponse } from "next/server"

import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { buildRequestLogContext, logError, logWarn } from "@/lib/logger"

type StitchOption = {
  htmlUrl?: unknown
}

function parseAllowedMockupUrls(content: string) {
  try {
    const parsed = JSON.parse(content) as { type?: unknown; options?: unknown }
    if (parsed.type !== "stitch" || !Array.isArray(parsed.options)) return new Set<string>()

    return new Set(
      parsed.options
        .map((option: StitchOption) => option.htmlUrl)
        .filter((url): url is string => typeof url === "string"),
    )
  } catch {
    return new Set<string>()
  }
}

/**
 * Server-side proxy for saved Stitch HTML download URLs.
 *
 * Live previews remain enabled for MVP, but this route now requires auth and
 * verifies the requested URL belongs to a mockup row in a project owned by the
 * current user.
 */
export async function GET(request: Request) {
  const requestLogContext = buildRequestLogContext(request)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    logWarn("StitchHtmlProxy", "unauthorized", requestLogContext)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userLogContext = { ...requestLogContext, userId: user.id }
  const rateLimit = checkRateLimit({
    key: `stitch-html:${user.id}:${getClientIp(request)}`,
    limit: 60,
    windowMs: 60_000,
  })
  if (rateLimit.limited) {
    logWarn("StitchHtmlProxy", "rate_limited", {
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
  const url = searchParams.get("url")
  const projectId = searchParams.get("projectId")
  const mockupId = searchParams.get("mockupId")

  if (!url || (!projectId && !mockupId)) {
    logWarn("StitchHtmlProxy", "validation_failed", {
      ...userLogContext,
      hasUrl: Boolean(url),
      hasProjectId: Boolean(projectId),
      hasMockupId: Boolean(mockupId),
    })
    return NextResponse.json({ error: "Missing url and project/mockup scope" }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    logWarn("StitchHtmlProxy", "invalid_url", { ...userLogContext, projectId, mockupId })
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  const allowedHosts = ["contribution.usercontent.google.com", "lh3.googleusercontent.com"]
  if (parsed.protocol !== "https:" || !allowedHosts.includes(parsed.hostname)) {
    logWarn("StitchHtmlProxy", "url_not_allowed", {
      ...userLogContext,
      projectId,
      mockupId,
      protocol: parsed.protocol,
      hostname: parsed.hostname,
    })
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 })
  }

  let query = supabase
    .from("mockups")
    .select("id, content, projects!inner(id, user_id)")
    .eq("projects.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  if (mockupId) {
    query = query.eq("id", mockupId).limit(1)
  } else if (projectId) {
    query = query.eq("project_id", projectId)
  }

  const { data: mockups, error } = await query
  if (error) {
    logError("StitchHtmlProxy", "ownership_lookup_failed", error, { ...userLogContext, projectId, mockupId })
    return NextResponse.json({ error: "Failed to verify mockup ownership" }, { status: 500 })
  }

  const isOwnedSavedUrl = (mockups ?? []).some((mockup) =>
    parseAllowedMockupUrls(mockup.content).has(url),
  )
  if (!isOwnedSavedUrl) {
    logWarn("StitchHtmlProxy", "url_not_owned", { ...userLogContext, projectId, mockupId })
    return NextResponse.json({ error: "URL is not associated with this project" }, { status: 403 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    })
    if (!res.ok) {
      logWarn("StitchHtmlProxy", "upstream_status_failed", {
        ...userLogContext,
        projectId,
        mockupId,
        status: res.status,
      })
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: 502 })
    }

    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.includes("text/html") && !contentType.includes("application/octet-stream")) {
      logWarn("StitchHtmlProxy", "content_type_not_allowed", {
        ...userLogContext,
        projectId,
        mockupId,
        contentType,
      })
      return NextResponse.json({ error: "Upstream content type not allowed" }, { status: 415 })
    }

    const html = await res.text()
    if (html.length > 2_000_000) {
      logWarn("StitchHtmlProxy", "html_too_large", {
        ...userLogContext,
        projectId,
        mockupId,
        htmlLength: html.length,
      })
      return NextResponse.json({ error: "HTML preview is too large" }, { status: 413 })
    }

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (err) {
    logError("StitchHtmlProxy", "fetch_failed", err, { ...userLogContext, projectId, mockupId })
    return NextResponse.json({ error: "Failed to fetch HTML" }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}

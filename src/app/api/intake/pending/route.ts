import { randomBytes } from "crypto"
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

const MAX_IDEA_LENGTH = 10000
const TOKEN_BYTES = 24
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function normalizeIdea(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_IDEA_LENGTH) : ""
}

function normalizeSource(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 80)
    : "landing"
}

function createOpaqueToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

export async function POST(request: Request) {
  let body: { idea?: unknown; source?: unknown }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const idea = normalizeIdea(body.idea)
  if (!idea) {
    return NextResponse.json({ error: "Idea is required" }, { status: 400 })
  }

  const token = createOpaqueToken()
  const expiresAt = new Date(Date.now() + ONE_DAY_MS).toISOString()
  const supabase = createServiceClient()

  const { error } = await supabase.from("pending_intakes").insert({
    token,
    idea_text: idea,
    source: normalizeSource(body.source),
    expires_at: expiresAt,
  })

  if (error) {
    console.error("[intake/pending] create failed:", error)
    return NextResponse.json({ error: "Failed to save pending intake" }, { status: 500 })
  }

  return NextResponse.json({ token, expiresAt })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")?.trim()
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("pending_intakes")
    .select("idea_text, source, expires_at")
    .eq("token", token)
    .is("claimed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (error) {
    console.error("[intake/pending] lookup failed:", error)
    return NextResponse.json({ error: "Failed to load pending intake" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Pending intake not found or expired" }, { status: 404 })
  }

  return NextResponse.json({
    idea: data.idea_text,
    source: data.source,
    expiresAt: data.expires_at,
  })
}

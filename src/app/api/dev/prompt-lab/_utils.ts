import { NextResponse } from "next/server"

import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { isPromptLabEnabled } from "@/lib/prompt-lab"
import { createClient } from "@/lib/supabase/server"

export async function requirePromptLabRequest(
  request: Request,
  {
    rateLimitKey,
    limit = 30,
    windowMs = 60_000,
  }: {
    rateLimitKey: string
    limit?: number
    windowMs?: number
  },
) {
  if (!isPromptLabEnabled()) {
    return {
      response: NextResponse.json({ error: "Prompt Lab is only available in local development." }, { status: 404 }),
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  const rateLimit = checkRateLimit({
    key: `prompt-lab:${rateLimitKey}:${user.id}:${getClientIp(request)}`,
    limit,
    windowMs,
  })

  if (rateLimit.limited) {
    return {
      response: NextResponse.json(
        { error: "Too many Prompt Lab requests. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      ),
    }
  }

  return { supabase, user }
}

export async function getOwnedProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string,
) {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, description, updated_at")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load project: ${error.message}`)
  }

  return project
}

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { isWaitlistMode, validateWaitlistEmail, WAITLIST_LIMIT } from "@/lib/waitlist"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { buildRequestLogContext, logError, logWarn } from "@/lib/logger"

/**
 * GET /api/waitlist
 * Returns the current registered user count and whether waitlist mode is active.
 * Used by the landing page to decide which CTA to show.
 */
export async function GET(request: NextRequest) {
  const requestLogContext = buildRequestLogContext(request)
  try {
    const supabase = createServiceClient()
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })

    if (error) {
      logError("Waitlist", "profile_count_failed", error, requestLogContext)
      // Fail open — show normal CTA rather than blocking visitors
      return NextResponse.json({ userCount: 0, isWaitlistMode: false, limit: WAITLIST_LIMIT })
    }

    const userCount = count ?? 0
    return NextResponse.json({ userCount, isWaitlistMode: isWaitlistMode(userCount), limit: WAITLIST_LIMIT })
  } catch (err) {
    logError("Waitlist", "status_request_failed", err, requestLogContext)
    return NextResponse.json({ userCount: 0, isWaitlistMode: false, limit: WAITLIST_LIMIT })
  }
}

/**
 * POST /api/waitlist
 * Body: { email: string }
 * Adds the email to the waitlist table.
 */
export async function POST(req: NextRequest) {
  const requestLogContext = buildRequestLogContext(req)
  const rateLimit = checkRateLimit({
    key: `waitlist:${getClientIp(req)}`,
    limit: 8,
    windowMs: 60_000,
  })
  if (rateLimit.limited) {
    logWarn("Waitlist", "rate_limited", {
      ...requestLogContext,
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { email } = body as { email?: unknown }
  const validationError = validateWaitlistEmail(email)
  if (validationError) {
    logWarn("Waitlist", "validation_failed", requestLogContext)
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("waitlist")
    .insert({ email: (email as string).trim().toLowerCase() })

  if (error) {
    // Postgres unique-violation code
    if (error.code === "23505") {
      logWarn("Waitlist", "duplicate_email", requestLogContext)
      return NextResponse.json(
        { error: "This email is already on the waitlist." },
        { status: 409 }
      )
    }
    logError("Waitlist", "insert_failed", error, requestLogContext)
    return NextResponse.json({ error: "Failed to join the waitlist. Please try again." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

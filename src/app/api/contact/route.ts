import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { validateContactRequest } from "@/lib/contact"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { buildRequestLogContext, logError, logWarn } from "@/lib/logger"

/**
 * POST /api/contact
 * Body: { name?: string, email: string, message: string }
 * Stores the submission in the contact_requests table. There is no support
 * inbox; requests are read from the Supabase dashboard. The table has
 * deny-all RLS, so this rate-limited route (service role) is the only
 * write path.
 */
export async function POST(req: NextRequest) {
  const requestLogContext = buildRequestLogContext(req)
  const rateLimit = await checkRateLimit({
    key: `contact:${getClientIp(req)}`,
    limit: 5,
    windowMs: 600_000,
  })
  if (rateLimit.limited) {
    logWarn("Contact", "rate_limited", {
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

  const { name, email, message } = body as { name?: unknown; email?: unknown; message?: unknown }
  const validationError = validateContactRequest({ name, email, message })
  if (validationError) {
    logWarn("Contact", "validation_failed", requestLogContext)
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from("contact_requests").insert({
    name: typeof name === "string" && name.trim() !== "" ? name.trim() : null,
    email: (email as string).trim().toLowerCase(),
    message: (message as string).trim(),
  })

  if (error) {
    logError("Contact", "insert_failed", error, requestLogContext)
    return NextResponse.json({ error: "Failed to send your message. Please try again." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

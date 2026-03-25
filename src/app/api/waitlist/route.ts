import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { isWaitlistMode, validateWaitlistEmail, WAITLIST_LIMIT } from "@/lib/waitlist"

/**
 * GET /api/waitlist
 * Returns the current registered user count and whether waitlist mode is active.
 * Used by the landing page to decide which CTA to show.
 */
export async function GET() {
  try {
    const supabase = createServiceClient()
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })

    if (error) {
      console.error("[waitlist] Failed to count profiles:", error.message)
      // Fail open — show normal CTA rather than blocking visitors
      return NextResponse.json({ userCount: 0, isWaitlistMode: false, limit: WAITLIST_LIMIT })
    }

    const userCount = count ?? 0
    return NextResponse.json({ userCount, isWaitlistMode: isWaitlistMode(userCount), limit: WAITLIST_LIMIT })
  } catch (err) {
    console.error("[waitlist] Unexpected error in GET:", err)
    return NextResponse.json({ userCount: 0, isWaitlistMode: false, limit: WAITLIST_LIMIT })
  }
}

/**
 * POST /api/waitlist
 * Body: { email: string }
 * Adds the email to the waitlist table.
 */
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { email } = body as { email?: unknown }
  const validationError = validateWaitlistEmail(email)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("waitlist")
    .insert({ email: (email as string).trim().toLowerCase() })

  if (error) {
    // Postgres unique-violation code
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This email is already on the waitlist." },
        { status: 409 }
      )
    }
    console.error("[waitlist] Insert error:", error.message)
    return NextResponse.json({ error: "Failed to join the waitlist. Please try again." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

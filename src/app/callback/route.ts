import { createClient } from "@/lib/supabase/server"
import { sanitizeInternalRedirect } from "@/lib/safe-redirect"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = sanitizeInternalRedirect(searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("[callback] exchangeCodeForSession error:", error.message, error)
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`)
    }

    const { data: { user } } = await supabase.auth.getUser()

    // Safety net: ensure every user has a credits row.
    // The DB trigger handles new users; this covers users who signed up
    // before the trigger was installed.
    if (user) {
      await supabase.from("credits").upsert(
        { user_id: user.id, balance: 150 },
        { onConflict: "user_id", ignoreDuplicates: true }
      )
    }

    const forwardedHost = request.headers.get("x-forwarded-host")
    const isLocalEnv = process.env.NODE_ENV === "development"

    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${next}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${next}`)
    } else {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth?error=Could not authenticate`)
}

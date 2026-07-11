import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe"
import { buildRequestLogContext, logError, logInfo, logWarn } from "@/lib/logger"
import { getUsableStripeCustomerId } from "@/lib/stripe/customer"

export async function POST(request: Request) {
  const requestLogContext = buildRequestLogContext(request)
  try {
    const supabase = await createClient()
    const stripe = getStripeClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logWarn("StripePortal", "unauthorized", requestLogContext)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userLogContext = { ...requestLogContext, userId: user.id }
    logInfo("StripePortal", "request_started", userLogContext)

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      logError("StripePortal", "profile_lookup_failed", profileError, userLogContext)
      return NextResponse.json(
        { error: "Failed to load billing profile" },
        { status: 500 }
      )
    }

    if (!profile?.stripe_customer_id) {
      logWarn("StripePortal", "customer_missing", userLogContext)
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 404 }
      )
    }

    const customerId = await getUsableStripeCustomerId(
      stripe,
      profile.stripe_customer_id,
      user.id
    )
    if (!customerId) {
      logWarn("StripePortal", "customer_out_of_sync", userLogContext)
      return NextResponse.json(
        { error: "Billing profile is out of sync. Please contact support." },
        { status: 409 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    })
    logInfo("StripePortal", "session_created", {
      ...userLogContext,
      stripeCustomerId: customerId,
      portalSessionId: session.id,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logError("StripePortal", "request_failed", error, requestLogContext)
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    )
  }
}

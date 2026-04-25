import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const stripe = getStripeClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const priceId = typeof body?.priceId === "string" ? body.priceId.trim() : ""
    const planId = typeof body?.planId === "string" ? body.planId.trim() : ""

    if (!priceId || !planId) {
      return NextResponse.json(
        { error: "priceId and planId are required" },
        { status: 400 }
      )
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, stripe_price_id, is_active, checkout_enabled")
      .eq("id", planId)
      .eq("stripe_price_id", priceId)
      .eq("is_active", true)
      .eq("checkout_enabled", true)
      .maybeSingle()

    if (planError) {
      console.error("Stripe checkout plan lookup error:", planError.message)
      return NextResponse.json(
        { error: "Failed to verify selected plan" },
        { status: 500 }
      )
    }

    if (!plan?.stripe_price_id) {
      return NextResponse.json(
        { error: "Selected plan is not available for checkout" },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_id: plan.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}

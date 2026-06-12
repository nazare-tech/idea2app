import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe"
import type Stripe from "stripe"

type CheckoutSupabaseClient = Awaited<ReturnType<typeof createClient>>

function isStripeMissingResourceError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "resource_missing"
  )
}

async function getUsableStripeCustomerId(
  stripe: Stripe,
  customerId: string | null
) {
  if (!customerId) {
    return null
  }

  try {
    const customer = await stripe.customers.retrieve(customerId)
    if ("deleted" in customer && customer.deleted) {
      return null
    }

    return customer.id
  } catch (error) {
    if (isStripeMissingResourceError(error)) {
      return null
    }

    throw error
  }
}

async function persistStripeCustomerId(
  supabase: CheckoutSupabaseClient,
  userId: string,
  previousCustomerId: string | null,
  nextCustomerId: string
) {
  let updateQuery = supabase
    .from("profiles")
    .update({ stripe_customer_id: nextCustomerId })
    .eq("id", userId)

  updateQuery = previousCustomerId
    ? updateQuery.eq("stripe_customer_id", previousCustomerId)
    : updateQuery.is("stripe_customer_id", null)

  const { data: updatedProfile, error: updateError } = await updateQuery
    .select("stripe_customer_id")
    .maybeSingle()

  if (updateError) {
    throw new Error(`Failed to persist Stripe customer: ${updateError.message}`)
  }

  if (updatedProfile?.stripe_customer_id) {
    return updatedProfile.stripe_customer_id
  }

  const { data: currentProfile, error: reloadError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle()

  if (reloadError) {
    throw new Error(`Failed to reload billing profile: ${reloadError.message}`)
  }

  if (!currentProfile?.stripe_customer_id) {
    throw new Error("Billing profile did not retain a Stripe customer")
  }

  return currentProfile.stripe_customer_id
}

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

    const { data: planPrice, error: planError } = await supabase
      .from("plan_prices")
      .select("id, plan_id, stripe_price_id, is_active, checkout_enabled, plans(id, is_active, is_public, checkout_enabled)")
      .eq("plan_id", planId)
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

    const joinedPlan = Array.isArray(planPrice?.plans) ? planPrice.plans[0] : planPrice?.plans
    const planIsCheckoutEligible = Boolean(
      joinedPlan?.id &&
        joinedPlan.is_active !== false &&
        joinedPlan.is_public === true &&
        joinedPlan.checkout_enabled === true
    )

    if (!planPrice?.stripe_price_id || !planIsCheckoutEligible) {
      return NextResponse.json(
        { error: "Selected plan is not available for checkout" },
        { status: 400 }
      )
    }

    const { data: existingSubscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .limit(1)
      .maybeSingle()

    if (subscriptionError) {
      console.error("Stripe checkout subscription lookup error:", subscriptionError.message)
      return NextResponse.json(
        { error: "Failed to verify current subscription" },
        { status: 500 }
      )
    }

    if (existingSubscription) {
      return NextResponse.json(
        { error: "Use the billing portal to manage your existing subscription" },
        { status: 409 }
      )
    }

    // Get or create Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("Stripe checkout profile lookup error:", profileError.message)
      return NextResponse.json(
        { error: "Failed to load billing profile" },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Billing profile was not found" },
        { status: 400 }
      )
    }

    const storedCustomerId = profile.stripe_customer_id
    let customerId = await getUsableStripeCustomerId(stripe, storedCustomerId)

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      try {
        customerId = await getUsableStripeCustomerId(
          stripe,
          await persistStripeCustomerId(supabase, user.id, storedCustomerId, customer.id)
        )
      } catch (error) {
        console.error("Stripe checkout customer persistence error:", error)
        return NextResponse.json(
          { error: "Failed to prepare billing profile" },
          { status: 500 }
        )
      }

      if (!customerId) {
        return NextResponse.json(
          { error: "Failed to prepare billing profile" },
          { status: 500 }
        )
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: planPrice.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_id: planPrice.plan_id,
        plan_price_id: planPrice.id,
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

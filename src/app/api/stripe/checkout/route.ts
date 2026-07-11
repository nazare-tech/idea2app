import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe"
import type Stripe from "stripe"
import { buildRequestLogContext, logError, logInfo, logWarn } from "@/lib/logger"
import { buildCheckoutSessionIdempotencyKey } from "@/lib/stripe/checkout-idempotency"
import {
  buildCheckoutAnalyticsMetadata,
  parseCheckoutAnalyticsInput,
} from "@/lib/stripe/checkout-analytics"
import { recordServerProductEvent } from "@/lib/product-analytics/server"
import { normalizeProductAnalyticsPlanKey } from "@/lib/product-analytics/storage"
import { createServiceClient } from "@/lib/supabase/service"

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
  const requestLogContext = buildRequestLogContext(request)
  try {
    const supabase = await createClient()
    const stripe = getStripeClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logWarn("StripeCheckout", "unauthorized", requestLogContext)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userLogContext = { ...requestLogContext, userId: user.id }
    const body = await request.json().catch(() => null)
    const priceId = typeof body?.priceId === "string" ? body.priceId.trim() : ""
    const planId = typeof body?.planId === "string" ? body.planId.trim() : ""
    let analyticsContext = parseCheckoutAnalyticsInput(body)
    const checkoutLogContext = { ...userLogContext, priceId, planId }
    logInfo("StripeCheckout", "request_started", checkoutLogContext)

    if (!priceId || !planId) {
      logWarn("StripeCheckout", "validation_failed", {
        ...userLogContext,
        hasPriceId: Boolean(priceId),
        hasPlanId: Boolean(planId),
      })
      return NextResponse.json(
        { error: "priceId and planId are required" },
        { status: 400 }
      )
    }

    const { data: planPrice, error: planError } = await supabase
      .from("plan_prices")
      .select("id, plan_id, stripe_price_id, is_active, checkout_enabled, plans(id, name, is_active, is_public, checkout_enabled)")
      .eq("plan_id", planId)
      .eq("stripe_price_id", priceId)
      .eq("is_active", true)
      .eq("checkout_enabled", true)
      .maybeSingle()

    if (planError) {
      logError("StripeCheckout", "plan_lookup_failed", planError, checkoutLogContext)
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
      logWarn("StripeCheckout", "plan_not_available", checkoutLogContext)
      return NextResponse.json(
        { error: "Selected plan is not available for checkout" },
        { status: 400 }
      )
    }

    if (analyticsContext.projectId) {
      const { data: attributedProject } = await supabase
        .from("projects")
        .select("id")
        .eq("id", analyticsContext.projectId)
        .eq("user_id", user.id)
        .maybeSingle()
      if (!attributedProject) {
        analyticsContext = { ...analyticsContext, projectId: undefined }
      }
    }
    analyticsContext = await correlateCheckoutAttribution(user.id, analyticsContext)

    const { data: existingSubscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .limit(1)
      .maybeSingle()

    if (subscriptionError) {
      logError("StripeCheckout", "subscription_lookup_failed", subscriptionError, checkoutLogContext)
      return NextResponse.json(
        { error: "Failed to verify current subscription" },
        { status: 500 }
      )
    }

    if (existingSubscription) {
      logWarn("StripeCheckout", "existing_subscription_found", {
        ...checkoutLogContext,
        subscriptionId: existingSubscription.id,
        subscriptionStatus: existingSubscription.status,
      })
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
      logError("StripeCheckout", "profile_lookup_failed", profileError, checkoutLogContext)
      return NextResponse.json(
        { error: "Failed to load billing profile" },
        { status: 500 }
      )
    }

    if (!profile) {
      logWarn("StripeCheckout", "profile_missing", checkoutLogContext)
      return NextResponse.json(
        { error: "Billing profile was not found" },
        { status: 400 }
      )
    }

    const storedCustomerId = profile.stripe_customer_id
    let customerId = await getUsableStripeCustomerId(stripe, storedCustomerId)

    if (!customerId) {
      logInfo("StripeCheckout", "customer_create_started", checkoutLogContext)
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
        logError("StripeCheckout", "customer_persist_failed", error, {
          ...checkoutLogContext,
          stripeCustomerId: customer.id,
        })
        return NextResponse.json(
          { error: "Failed to prepare billing profile" },
          { status: 500 }
        )
      }

      if (!customerId) {
        logError("StripeCheckout", "customer_prepare_failed", new Error("Missing usable Stripe customer"), checkoutLogContext)
        return NextResponse.json(
          { error: "Failed to prepare billing profile" },
          { status: 500 }
        )
      }
    } else {
      logInfo("StripeCheckout", "customer_reused", {
        ...checkoutLogContext,
        stripeCustomerId: customerId,
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(
      {
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
          ...buildCheckoutAnalyticsMetadata(analyticsContext),
        },
      },
      {
        idempotencyKey: buildCheckoutSessionIdempotencyKey({
          userId: user.id,
          planPriceId: planPrice.id,
          stripePriceId: planPrice.stripe_price_id,
        }),
      }
    )
    logInfo("StripeCheckout", "session_created", {
      ...checkoutLogContext,
      stripeCustomerId: customerId,
      checkoutSessionId: session.id,
    })

    const targetPlanKey = normalizeProductAnalyticsPlanKey(joinedPlan?.name ?? "")
    await recordServerProductEvent({
      eventName: "checkout_started",
      idempotencyKey: `stripe:checkout:${session.id}:started`,
      userId: user.id,
      ...(analyticsContext.projectId ? { projectId: analyticsContext.projectId } : {}),
      ...(analyticsContext.sessionId ? { sessionId: analyticsContext.sessionId } : {}),
      properties: {
        checkoutSessionId: session.id,
        planKey: targetPlanKey,
        sourceSurface: analyticsContext.sourceSurface,
        ...(analyticsContext.experimentVariant
          ? { experimentVariant: analyticsContext.experimentVariant }
          : {}),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logError("StripeCheckout", "request_failed", error, requestLogContext)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}

async function correlateCheckoutAttribution(
  userId: string,
  context: ReturnType<typeof parseCheckoutAnalyticsInput>,
): Promise<ReturnType<typeof parseCheckoutAnalyticsInput>> {
  if (!context.attributionEventId) return { sourceSurface: "billing" }
  const { data, error } = await createServiceClient()
    .from("product_events")
    .select("session_id, project_id, properties")
    .eq("idempotency_key", `client:${userId}:${context.attributionEventId}`)
    .eq("event_name", "upgrade_cta_clicked")
    .gte("received_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .maybeSingle()
  if (error || !data || data.properties?.surface !== context.sourceSurface) {
    return { sourceSurface: "billing" }
  }
  if (context.sessionId && data.session_id !== context.sessionId) return { sourceSurface: "billing" }
  if (context.projectId && data.project_id !== context.projectId) return { sourceSurface: "billing" }
  return parseCheckoutAnalyticsInput({
    sourceSurface: data.properties.surface,
    sessionId: data.session_id,
    projectId: data.project_id,
    experimentVariant: data.properties.experimentVariant,
    attributionEventId: context.attributionEventId,
  })
}

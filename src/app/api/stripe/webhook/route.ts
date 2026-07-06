import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getStripeClient } from "@/lib/stripe"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { logError, logInfo, logWarn } from "@/lib/logger"
import {
  buildSubscriptionCreditGrantKey,
  buildSubscriptionSyncSnapshot,
  type StripePlanPriceMapping,
  type SubscriptionSyncSnapshot,
} from "@/lib/stripe/subscription-sync"
import { claimWebhookEvent, type WebhookClaim } from "@/lib/stripe/webhook-claim"

function logWebhook(level: "info" | "warn" | "error", message: string, context: Record<string, unknown> = {}) {
  const event = message
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
  const logContext = { ...context }

  if (level === "error") {
    logError("StripeWebhook", event, context.error ?? message, logContext)
  } else if (level === "warn") {
    logWarn("StripeWebhook", event, logContext)
  } else {
    logInfo("StripeWebhook", event, logContext)
  }
}

// Use service role for webhook handling (no user context)
function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type AdminClient = ReturnType<typeof getAdminClient>

async function getPlanPricesByStripePriceId(supabase: AdminClient) {
  const { data, error } = await supabase
    .from("plan_prices")
    .select("id, plan_id, stripe_price_id, interval_unit, interval_count, credits_multiplier, plans(id, name, credits_monthly)")
    .not("stripe_price_id", "is", null)
    .eq("is_active", true)

  if (error) {
    throw new Error(`Failed to load Stripe plan prices: ${error.message}`)
  }

  return new Map(
    ((data ?? []) as StripePlanPriceMapping[])
      .filter((planPrice) => planPrice.stripe_price_id)
      .map((planPrice) => [planPrice.stripe_price_id, planPrice])
  )
}

async function retrieveSubscription(stripe: Stripe, subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  }) as unknown as Promise<Record<string, unknown>>
}

function getStripeObjectId(value: unknown): string {
  if (typeof value === "string") {
    return value
  }

  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id
  }

  return ""
}

async function findUserIdForSubscription(
  supabase: AdminClient,
  snapshot: SubscriptionSyncSnapshot,
  preferredUserId?: string | null
) {
  if (preferredUserId) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", preferredUserId)
      .eq("stripe_customer_id", snapshot.stripeCustomerId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to verify Stripe checkout profile: ${error.message}`)
    }

    return typeof profile?.id === "string" ? profile.id : null
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", snapshot.stripeCustomerId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to resolve Stripe customer profile: ${error.message}`)
  }

  return typeof profile?.id === "string" ? profile.id : null
}

async function syncSubscriptionSnapshot(
  supabase: AdminClient,
  userId: string,
  snapshot: SubscriptionSyncSnapshot
) {
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_id: snapshot.planId,
      plan_price_id: snapshot.planPriceId,
      stripe_price_id: snapshot.stripePriceId,
      stripe_subscription_id: snapshot.stripeSubscriptionId,
      status: snapshot.status,
      cancel_at_period_end: snapshot.cancelAtPeriodEnd,
      current_period_start: snapshot.currentPeriodStart,
      current_period_end: snapshot.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  if (error) {
    throw new Error(`Failed to sync subscription: ${error.message}`)
  }
}

async function grantSubscriptionCreditsOnce(
  supabase: AdminClient,
  userId: string,
  snapshot: SubscriptionSyncSnapshot,
  eventId: string,
  grantType: "subscription_initial" | "subscription_renewal",
  stripeInvoiceId: string | null
) {
  const { data, error } = await supabase.rpc("grant_subscription_credits_once", {
    p_idempotency_key: buildSubscriptionCreditGrantKey(snapshot),
    p_user_id: userId,
    p_plan_id: snapshot.planId,
    p_plan_price_id: snapshot.planPriceId,
    p_stripe_event_id: eventId,
    p_stripe_subscription_id: snapshot.stripeSubscriptionId,
    p_stripe_invoice_id: stripeInvoiceId,
    p_period_start: snapshot.currentPeriodStart,
    p_period_end: snapshot.currentPeriodEnd,
    p_amount: snapshot.creditsForPeriod,
    p_grant_type: grantType,
    p_description:
      grantType === "subscription_initial"
        ? `${snapshot.planName} plan subscription`
        : `Subscription renewal - ${snapshot.planName}`,
  })

  if (error) {
    throw new Error(`Failed to grant subscription credits: ${error.message}`)
  }

  return data === true
}

async function buildSnapshotForSubscription(
  supabase: AdminClient,
  subscription: Record<string, unknown>
) {
  return buildSubscriptionSyncSnapshot(
    subscription,
    await getPlanPricesByStripePriceId(supabase)
  )
}

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    logWebhook("warn", "Missing Stripe signature header")
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripe = getStripeClient()
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    logWebhook("error", "Webhook signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  const supabase = getAdminClient()

  logWebhook("info", "Webhook event received", {
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
  })

  let claim: WebhookClaim

  try {
    claim = await claimWebhookEvent(supabase, event)
  } catch (error) {
    logWebhook("error", "Failed to claim Stripe event", {
      event_id: event.id,
      event_type: event.type,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Webhook claim failed" }, { status: 500 })
  }

  if (!claim.shouldProcess) {
    logWebhook("info", "Duplicate Stripe event ignored", {
      event_id: event.id,
      event_type: event.type,
      duplicate_reason: claim.reason,
    })
    return NextResponse.json({ received: true, duplicate: true })
  }

  if (claim.retrying) {
    logWebhook("info", "Retrying previously failed or stale Stripe event", {
      event_id: event.id,
      event_type: event.type,
    })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = getStripeObjectId(session.subscription)

        if (!subscriptionId) {
          throw new Error("Checkout session is missing subscription id")
        }

        const stripe = getStripeClient()
        const subscription = await retrieveSubscription(stripe, subscriptionId)
        const snapshot = await buildSnapshotForSubscription(supabase, subscription)
        const userId = await findUserIdForSubscription(
          supabase,
          snapshot,
          session.metadata?.supabase_user_id
        )

        if (!userId) {
          throw new Error(`No profile found for Stripe customer ${snapshot.stripeCustomerId}`)
        }

        if (session.metadata?.plan_id && session.metadata.plan_id !== snapshot.planId) {
          logWebhook("warn", "Checkout metadata plan did not match Stripe subscription price", {
            event_id: event.id,
            metadata_plan_id: session.metadata.plan_id,
            resolved_plan_id: snapshot.planId,
            stripe_price_id: snapshot.stripePriceId,
          })
        }

        await syncSubscriptionSnapshot(supabase, userId, snapshot)
        break
      }

      case "customer.subscription.updated": {
        const stripe = getStripeClient()
        const rawSubscription = event.data.object as unknown as Record<string, unknown>
        const subscriptionId = getStripeObjectId(rawSubscription)
        const subscription = subscriptionId
          ? await retrieveSubscription(stripe, subscriptionId)
          : rawSubscription
        const snapshot = await buildSnapshotForSubscription(supabase, subscription)
        const userId = await findUserIdForSubscription(supabase, snapshot)

        if (!userId) {
          throw new Error(`No profile found for Stripe customer ${snapshot.stripeCustomerId}`)
        }

        await syncSubscriptionSnapshot(supabase, userId, snapshot)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as unknown as Record<string, unknown>
        const subscriptionId = getStripeObjectId(subscription)
        const customerId = getStripeObjectId(subscription.customer)

        if (subscriptionId) {
          const { data: canceledSubscription, error: cancelBySubscriptionError } = await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId)
            .select("id")
            .maybeSingle()

          if (cancelBySubscriptionError) {
            throw new Error(`Failed to cancel subscription: ${cancelBySubscriptionError.message}`)
          }

          if (canceledSubscription) {
            break
          }
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()

        if (profileError) {
          throw new Error(`Failed to resolve cancellation profile: ${profileError.message}`)
        }

        if (!profile) {
          logWebhook("warn", "No local subscription or profile found for deleted Stripe subscription", {
            event_id: event.id,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
          })
          break
        }

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", profile.id)

        if (updateError) {
          throw new Error(`Failed to cancel subscription by profile: ${updateError.message}`)
        }
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as unknown as Record<string, unknown>
        const subscriptionId = getStripeObjectId(invoice.subscription)

        if (invoice.billing_reason === "subscription_create" || invoice.billing_reason === "subscription_cycle") {
          if (!subscriptionId) {
            throw new Error("Paid subscription invoice is missing subscription id")
          }

          const stripe = getStripeClient()
          const subscription = await retrieveSubscription(stripe, subscriptionId)
          const snapshot = await buildSnapshotForSubscription(supabase, subscription)
          const userId = await findUserIdForSubscription(supabase, snapshot)

          if (!userId) {
            throw new Error(`No profile found for Stripe customer ${snapshot.stripeCustomerId}`)
          }

          await syncSubscriptionSnapshot(supabase, userId, snapshot)
          const granted = await grantSubscriptionCreditsOnce(
            supabase,
            userId,
            snapshot,
            event.id,
            invoice.billing_reason === "subscription_create"
              ? "subscription_initial"
              : "subscription_renewal",
            getStripeObjectId(invoice.id)
          )

          if (!granted) {
            logWebhook("info", "Subscription credits already granted for period", {
              event_id: event.id,
              stripe_subscription_id: snapshot.stripeSubscriptionId,
              period_start: snapshot.currentPeriodStart,
            })
          }
        }
        break
      }

      default:
        logWebhook("info", "Unhandled Stripe event type", {
          event_id: event.id,
          event_type: event.type,
        })
        break
    }

    await supabase
      .from("stripe_webhook_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        error: null,
      })
      .eq("event_id", event.id)

    return NextResponse.json({ received: true })
  } catch (error) {
    await supabase
      .from("stripe_webhook_events")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      })
      .eq("event_id", event.id)

    logWebhook("error", "Webhook processing error", {
      event_id: event.id,
      event_type: event.type,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

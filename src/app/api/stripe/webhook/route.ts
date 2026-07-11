import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getStripeClient } from "@/lib/stripe"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { logError, logInfo, logWarn } from "@/lib/logger"
import {
  buildSubscriptionCreditGrantKey,
  buildSubscriptionSyncSnapshot,
  didScheduleSubscriptionCancellation,
  getInvoiceIdsForPaymentIntent,
  getInvoiceSubscriptionId,
  invoiceMatchesSubscriptionPeriod,
  type StripePlanPriceMapping,
  type SubscriptionSyncSnapshot,
} from "@/lib/stripe/subscription-sync"
import {
  claimWebhookEvent,
  finalizeWebhookEvent,
  WebhookLeaseLostError,
  type WebhookClaim,
} from "@/lib/stripe/webhook-lease"
import { recordServerProductEvent } from "@/lib/product-analytics/server"
import { normalizeProductAnalyticsPlanKey } from "@/lib/product-analytics/storage"
import { parseCheckoutAnalyticsMetadata } from "@/lib/stripe/checkout-analytics"
import { readRequestTextWithLimit, RequestBodyTooLargeError } from "@/lib/read-request-body"

const MAX_STRIPE_WEBHOOK_BYTES = 2 * 1024 * 1024

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

async function reverseSubscriptionCreditsOnce(
  supabase: AdminClient,
  stripeInvoiceId: string,
  eventId: string
) {
  const { data, error } = await supabase.rpc("reverse_subscription_credits_once", {
    p_stripe_invoice_id: stripeInvoiceId,
    p_stripe_event_id: eventId,
    p_description: "Subscription payment fully refunded",
  })

  if (error) {
    throw new Error(`Failed to reverse subscription credits: ${error.message}`)
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

async function resolveAttributedProjectId(
  supabase: AdminClient,
  userId: string,
  projectId: string | undefined,
) {
  if (!projectId) return undefined
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle()
  return typeof data?.id === "string" ? data.id : undefined
}

async function findLocalSubscriptionAnalyticsIdentity(
  supabase: AdminClient,
  subscriptionId: string,
) {
  if (!subscriptionId) return null
  const { data, error } = await supabase
    .from("subscriptions")
    .select("user_id, plans(name)")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle()
  if (error) {
    logWebhook("warn", "Failed to resolve subscription analytics identity", {
      stripe_subscription_id: subscriptionId,
      error: error.message,
    })
    return null
  }
  const joinedPlan = Array.isArray(data?.plans) ? data.plans[0] : data?.plans
  return data?.user_id && joinedPlan?.name
    ? { userId: data.user_id, planName: joinedPlan.name }
    : null
}

async function findUserSubscriptionAnalyticsIdentity(
  supabase: AdminClient,
  userId: string,
) {
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id, plans(name)")
    .eq("user_id", userId)
    .maybeSingle()
  const joinedPlan = Array.isArray(data?.plans) ? data.plans[0] : data?.plans
  return data?.user_id && joinedPlan?.name
    ? { userId: data.user_id, planName: joinedPlan.name }
    : null
}

function getCancellationReason(subscription: Record<string, unknown>) {
  const details = subscription.cancellation_details
  const reason = details && typeof details === "object" && "reason" in details
    ? details.reason
    : null
  if (reason === "cancellation_requested") return "requested" as const
  if (reason === "payment_failed") return "payment_failed" as const
  return "unknown" as const
}

export async function POST(request: Request) {
  let body: string
  try {
    body = await readRequestTextWithLimit(request, MAX_STRIPE_WEBHOOK_BYTES)
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 })
    }
    throw error
  }
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
        const attribution = parseCheckoutAnalyticsMetadata(session.metadata)
        const attributedProjectId = await resolveAttributedProjectId(
          supabase,
          userId,
          attribution.projectId,
        )
        await recordServerProductEvent({
          eventName: "checkout_completed",
          idempotencyKey: `stripe:checkout:${session.id}:completed`,
          userId,
          ...(attributedProjectId ? { projectId: attributedProjectId } : {}),
          ...(attribution.sessionId ? { sessionId: attribution.sessionId } : {}),
          planName: snapshot.planName,
          source: "stripe_webhook",
          properties: {
            checkoutSessionId: session.id,
            subscriptionId: snapshot.stripeSubscriptionId,
            planKey: normalizeProductAnalyticsPlanKey(snapshot.planName),
          },
        })
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
        const previousAttributes = event.data.previous_attributes as Record<string, unknown> | null
        if (didScheduleSubscriptionCancellation(snapshot, previousAttributes)) {
          await recordServerProductEvent({
            eventName: "subscription_cancel_requested",
            idempotencyKey: `stripe:${event.id}:subscription_cancel_requested`,
            userId,
            planName: snapshot.planName,
            source: "stripe_webhook",
            properties: {
              subscriptionId: snapshot.stripeSubscriptionId,
              planKey: normalizeProductAnalyticsPlanKey(snapshot.planName),
              cancelAtPeriodEnd: true,
            },
          })
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as unknown as Record<string, unknown>
        const subscriptionId = getStripeObjectId(subscription)
        const customerId = getStripeObjectId(subscription.customer)
        let deletedPlanName: string | null = null
        try {
          deletedPlanName = (await buildSnapshotForSubscription(supabase, subscription)).planName
        } catch (error) {
          logWebhook("warn", "Deleted subscription plan could not be resolved for analytics", {
            event_id: event.id,
            stripe_subscription_id: subscriptionId,
            error: error instanceof Error ? error.message : String(error),
          })
        }
        const analyticsIdentity = await findLocalSubscriptionAnalyticsIdentity(
          supabase,
          subscriptionId,
        )

        if (subscriptionId) {
          const { data: canceledSubscription, error: cancelBySubscriptionError } = await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId)
            .select("id, user_id")
            .maybeSingle()

          if (cancelBySubscriptionError) {
            throw new Error(`Failed to cancel subscription: ${cancelBySubscriptionError.message}`)
          }

          if (canceledSubscription) {
            const cancellationIdentity = analyticsIdentity ?? (
              canceledSubscription.user_id
                ? { userId: canceledSubscription.user_id, planName: deletedPlanName ?? "unknown" }
                : null
            )
            if (cancellationIdentity) {
              await recordServerProductEvent({
                eventName: "subscription_canceled",
                idempotencyKey: `stripe:${event.id}:subscription_canceled`,
                userId: cancellationIdentity.userId,
                planName: cancellationIdentity.planName,
                source: "stripe_webhook",
                properties: {
                  subscriptionId,
                  planKey: normalizeProductAnalyticsPlanKey(cancellationIdentity.planName),
                  cancellationReason: getCancellationReason(subscription),
                },
              })
            }
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

        const fallbackAnalyticsIdentity = analyticsIdentity ??
          await findUserSubscriptionAnalyticsIdentity(supabase, profile.id) ??
          { userId: profile.id, planName: deletedPlanName ?? "unknown" }

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
        if (fallbackAnalyticsIdentity) {
          await recordServerProductEvent({
            eventName: "subscription_canceled",
            idempotencyKey: `stripe:${event.id}:subscription_canceled`,
            userId: fallbackAnalyticsIdentity.userId,
            planName: fallbackAnalyticsIdentity.planName,
            source: "stripe_webhook",
            properties: {
              subscriptionId,
              planKey: normalizeProductAnalyticsPlanKey(fallbackAnalyticsIdentity.planName),
              cancellationReason: getCancellationReason(subscription),
            },
          })
        }
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as unknown as Record<string, unknown>
        const subscriptionId = getInvoiceSubscriptionId(invoice)

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

          if (!invoiceMatchesSubscriptionPeriod(invoice, snapshot)) {
            throw new Error("Paid invoice period does not match current Stripe subscription period")
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

      case "charge.refunded": {
        const charge = event.data.object
        if (charge.refunded && charge.amount_refunded === charge.amount) {
          const paymentIntentId = getStripeObjectId(charge.payment_intent)
          if (!paymentIntentId) {
            throw new Error("Fully refunded subscription charge is missing a PaymentIntent")
          }

          const stripe = getStripeClient()
          const invoicePayments = await stripe.invoicePayments.list({
            payment: { type: "payment_intent", payment_intent: paymentIntentId },
            status: "paid",
            limit: 2,
          })
          const stripeInvoiceIds = getInvoiceIdsForPaymentIntent(
            invoicePayments.data as unknown[],
            paymentIntentId
          )

          if (stripeInvoiceIds.length === 0) {
            logWebhook("info", "Fully refunded charge is not linked to an invoice", {
              event_id: event.id,
            })
            break
          }
          if (stripeInvoiceIds.length > 1) {
            throw new Error("Fully refunded charge maps to multiple paid invoices")
          }
          const stripeInvoiceId = stripeInvoiceIds[0]
          const invoice = await stripe.invoices.retrieve(stripeInvoiceId)
          if (!getInvoiceSubscriptionId(invoice as unknown as Record<string, unknown>)) {
            logWebhook("info", "Fully refunded invoice is not subscription-backed", {
              event_id: event.id,
              stripe_invoice_id: stripeInvoiceId,
            })
            break
          }

          const reversed = await reverseSubscriptionCreditsOnce(
            supabase,
            stripeInvoiceId,
            event.id
          )
          if (!reversed) {
            logWebhook("info", "Subscription refund credits already reversed", {
              event_id: event.id,
              stripe_invoice_id: stripeInvoiceId,
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

  } catch (error) {
    const statusWriteError = await finalizeWebhookEvent(supabase, claim.lease, {
      status: "failed",
      error,
    })

    if (statusWriteError) {
      logWebhook(
        statusWriteError instanceof WebhookLeaseLostError ? "warn" : "error",
        "Failed to persist webhook failure status",
        {
          event_id: event.id,
          event_type: event.type,
          error: statusWriteError.message,
        }
      )
    }

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

  // Handler side effects landed; only the durable status write remains. If it
  // fails, the row must stay "processing" (not "failed"): a false "failed" is
  // immediately reclaimable and would re-run every side effect, while
  // "processing" recovers through the normal stale-lease claim path.
  const processedWriteError = await finalizeWebhookEvent(supabase, claim.lease, {
    status: "processed",
  })

  if (processedWriteError) {
    logWebhook(
      processedWriteError instanceof WebhookLeaseLostError ? "warn" : "error",
      "Failed to persist webhook processed status",
      {
        event_id: event.id,
        event_type: event.type,
        error: processedWriteError.message,
      }
    )
    return NextResponse.json(
      { error: "Webhook finalization failed" },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

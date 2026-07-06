export type StripePlanPriceMapping = {
  id: string
  plan_id: string
  stripe_price_id: string
  interval_unit: string
  interval_count: number
  credits_multiplier?: number | null
  plans?:
    | {
        id?: string | null
        name: string
        credits_monthly: number
      }
    | Array<{
        id?: string | null
        name: string
        credits_monthly: number
      }>
    | null
}

export type SubscriptionSyncSnapshot = {
  stripeSubscriptionId: string
  stripeCustomerId: string
  status: string
  cancelAtPeriodEnd: boolean
  stripePriceId: string
  stripeSubscriptionItemId: string
  planId: string
  planPriceId: string
  planName: string
  creditsMonthly: number
  creditsForPeriod: number
  currentPeriodStart: string
  currentPeriodEnd: string
}

type StripeLikeSubscription = Record<string, unknown>
type StripeLikeSubscriptionItem = Record<string, unknown>

export class StripeSubscriptionSyncError extends Error {
  constructor(
    public readonly code:
      | "missing_subscription"
      | "missing_customer"
      | "missing_items"
      | "unmapped_price"
      | "ambiguous_plan_items"
      | "missing_period"
      | "missing_plan",
    message: string
  ) {
    super(`${code}: ${message}`)
    this.name = "StripeSubscriptionSyncError"
  }
}

export function buildSubscriptionSyncSnapshot(
  subscription: StripeLikeSubscription,
  planPricesByStripePriceId: Map<string, StripePlanPriceMapping>
): SubscriptionSyncSnapshot {
  const subscriptionId = getString(subscription.id)
  if (!subscriptionId) {
    throw new StripeSubscriptionSyncError("missing_subscription", "Stripe subscription id is required")
  }

  const customerId = getStringId(subscription.customer)
  if (!customerId) {
    throw new StripeSubscriptionSyncError("missing_customer", "Stripe customer id is required")
  }

  const items = getSubscriptionItems(subscription)
  if (items.length === 0) {
    throw new StripeSubscriptionSyncError("missing_items", "Stripe subscription has no items")
  }

  const mappedItems = items
    .map((item) => {
      const stripePriceId = getStripePriceId(item)
      return {
        item,
        stripePriceId,
        planPrice: stripePriceId ? planPricesByStripePriceId.get(stripePriceId) ?? null : null,
      }
    })
    .filter((entry) => entry.planPrice)

  if (mappedItems.length === 0) {
    throw new StripeSubscriptionSyncError("unmapped_price", "No subscription item price maps to an active plan")
  }

  if (mappedItems.length > 1) {
    throw new StripeSubscriptionSyncError("ambiguous_plan_items", "Multiple subscription item prices map to plans")
  }

  const mapped = mappedItems[0]
  const planPrice = mapped.planPrice as StripePlanPriceMapping
  const plan = getJoinedPlan(planPrice)
  const start = getUnixSeconds(mapped.item.current_period_start ?? subscription.current_period_start)
  const end = getUnixSeconds(mapped.item.current_period_end ?? subscription.current_period_end)

  if (!start || !end || start >= end) {
    throw new StripeSubscriptionSyncError("missing_period", "Subscription item period is required")
  }

  if (!plan) {
    throw new StripeSubscriptionSyncError("missing_plan", "Mapped plan price is missing its joined plan")
  }

  return {
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: customerId,
    status: getString(subscription.status) || "active",
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    stripePriceId: mapped.stripePriceId,
    stripeSubscriptionItemId: getString(mapped.item.id) || "",
    planId: planPrice.plan_id,
    planPriceId: planPrice.id,
    planName: plan.name,
    creditsMonthly: plan.credits_monthly,
    creditsForPeriod: plan.credits_monthly * getCreditMultiplier(planPrice),
    currentPeriodStart: new Date(start * 1000).toISOString(),
    currentPeriodEnd: new Date(end * 1000).toISOString(),
  }
}

export function buildSubscriptionCreditGrantKey(snapshot: SubscriptionSyncSnapshot): string {
  return `subscription_period:${snapshot.stripeSubscriptionId}:${snapshot.currentPeriodStart}`
}

export function getCreditMultiplier(planPrice: Pick<StripePlanPriceMapping, "credits_multiplier" | "interval_unit" | "interval_count">): number {
  if (typeof planPrice.credits_multiplier === "number" && Number.isFinite(planPrice.credits_multiplier)) {
    return Math.max(1, Math.floor(planPrice.credits_multiplier))
  }

  const intervalCount = Number.isFinite(planPrice.interval_count)
    ? Math.max(1, Math.floor(planPrice.interval_count))
    : 1

  if (planPrice.interval_unit === "year") {
    return intervalCount * 12
  }

  if (planPrice.interval_unit === "month") {
    return intervalCount
  }

  return 1
}

function getSubscriptionItems(subscription: StripeLikeSubscription): StripeLikeSubscriptionItem[] {
  const items = subscription.items
  if (!isRecord(items) || !Array.isArray(items.data)) {
    return []
  }

  return items.data.filter(isRecord)
}

function getStripePriceId(item: StripeLikeSubscriptionItem): string {
  const price = item.price
  if (typeof price === "string") {
    return price
  }

  if (isRecord(price)) {
    return getString(price.id)
  }

  const legacyPlan = item.plan
  if (isRecord(legacyPlan)) {
    return getString(legacyPlan.id)
  }

  return ""
}

function getJoinedPlan(planPrice: StripePlanPriceMapping): { name: string; credits_monthly: number } | null {
  const joined = planPrice.plans
  const plan = Array.isArray(joined) ? joined.find(isRecord) : joined

  if (!isRecord(plan)) {
    return null
  }

  const name = getString(plan.name)
  const creditsMonthly = plan.credits_monthly

  if (!name || typeof creditsMonthly !== "number" || !Number.isFinite(creditsMonthly)) {
    return null
  }

  return {
    name,
    credits_monthly: Math.max(0, Math.floor(creditsMonthly)),
  }
}

function getStringId(value: unknown): string {
  if (typeof value === "string") {
    return value
  }

  if (isRecord(value)) {
    return getString(value.id)
  }

  return ""
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function getUnixSeconds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null
  }

  return Math.floor(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

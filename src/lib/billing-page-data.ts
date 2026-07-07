// Display helpers for the billing page's plan grid.
//
// The Supabase clients are typed against the generated Database types, so the
// billing queries are compile-time typed end to end; these helpers only add
// the small display-side rules (active-price filtering, JSON feature-column
// narrowing, interval selection) on top of the real row shapes.

import type { Database } from "@/types/database"
import type { BillingInterval } from "@/lib/pricing-plans"

type PlanRow = Database["public"]["Tables"]["plans"]["Row"]

export type BillingPlanPrice = Database["public"]["Tables"]["plan_prices"]["Row"]

export type BillingSubscription = Pick<
  Database["public"]["Tables"]["subscriptions"]["Row"],
  "id" | "plan_id" | "plan_price_id" | "status" | "cancel_at_period_end" | "current_period_end"
>

/** A plan row with a display-ready feature list and active, sorted prices. */
export interface BillingPlan extends Omit<PlanRow, "features"> {
  features: string[]
  plan_prices: BillingPlanPrice[]
}

/** `features` is a JSON column; keep only string entries for display. */
function toFeatureList(features: PlanRow["features"]): string[] {
  return Array.isArray(features)
    ? features.filter((feature): feature is string => typeof feature === "string")
    : []
}

export function toBillingPlans(
  plans: Array<PlanRow & { plan_prices: BillingPlanPrice[] }> | null,
): BillingPlan[] {
  return (plans ?? []).map((plan) => ({
    ...plan,
    features: toFeatureList(plan.features),
    plan_prices: plan.plan_prices
      .filter((price) => price.is_active)
      .sort((left, right) => left.sort_order - right.sort_order),
  }))
}

export function isCheckoutReadyPlanPrice(price: BillingPlanPrice) {
  return Boolean(price.checkout_enabled && price.stripe_price_id)
}

export function isYearlyPrice(price: BillingPlanPrice) {
  return price.interval_unit === "year"
}

/** Picks the plan's price row for the page-level Monthly/Yearly toggle. */
export function getPriceForInterval(plan: BillingPlan, interval: BillingInterval): BillingPlanPrice | null {
  const prices = plan.plan_prices
  const match = prices.find((price) =>
    interval === "yearly"
      ? isYearlyPrice(price)
      : price.interval_unit === "month" && price.interval_count === 1
  )
  return match ?? prices.find(isCheckoutReadyPlanPrice) ?? prices[0] ?? null
}

/** Opens the plan grid on the interval the user is actually billed on. */
export function getInitialBillingInterval(
  plans: BillingPlan[],
  subscription: BillingSubscription | null,
): BillingInterval {
  const currentPrice = plans
    .flatMap((plan) => plan.plan_prices)
    .find((price) => price.id === subscription?.plan_price_id)

  return currentPrice && isYearlyPrice(currentPrice) ? "yearly" : "monthly"
}

import type { BillingInterval } from "@/lib/pricing-plans"

export interface BillingPlanPrice {
  id: string
  plan_id: string
  stripe_price_id: string | null
  unit_amount_cents: number
  interval_unit: string
  interval_count: number
  label: string
  savings_label: string | null
  checkout_enabled: boolean
  is_active: boolean
  sort_order: number
}

export interface BillingPlan {
  id: string
  name: string
  description: string | null
  price_monthly: number
  features: string[]
  plan_prices: BillingPlanPrice[]
}

export interface BillingSubscription {
  id: string
  plan_id: string | null
  plan_price_id: string | null
  status: string
  cancel_at_period_end: boolean | null
  current_period_end: string | null
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object")
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function booleanOrFalse(value: unknown): boolean {
  return value === true
}

export function normalizePlanPrices(value: unknown): BillingPlanPrice[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((price): price is UnknownRecord => isRecord(price))
    .filter((price) => typeof price.id === "string" && typeof price.unit_amount_cents === "number")
    .map((price) => ({
      id: price.id as string,
      plan_id: stringOrNull(price.plan_id) ?? "",
      stripe_price_id: stringOrNull(price.stripe_price_id),
      unit_amount_cents: numberOrZero(price.unit_amount_cents),
      interval_unit: stringOrNull(price.interval_unit) ?? "month",
      interval_count: numberOrZero(price.interval_count) || 1,
      label: stringOrNull(price.label) ?? "Monthly",
      savings_label: stringOrNull(price.savings_label),
      checkout_enabled: booleanOrFalse(price.checkout_enabled),
      is_active: price.is_active !== false,
      sort_order: numberOrZero(price.sort_order),
    }))
    .filter((price) => price.is_active)
    .sort((left, right) => left.sort_order - right.sort_order)
}

export function normalizeBillingPlans(value: unknown): BillingPlan[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((plan): plan is UnknownRecord => isRecord(plan))
    .filter((plan) => typeof plan.id === "string" && typeof plan.name === "string")
    .map((plan) => ({
      id: plan.id as string,
      name: plan.name as string,
      description: stringOrNull(plan.description),
      price_monthly: numberOrZero(plan.price_monthly),
      features: Array.isArray(plan.features)
        ? plan.features.filter((feature): feature is string => typeof feature === "string")
        : [],
      plan_prices: normalizePlanPrices(plan.plan_prices),
    }))
}

export function normalizeBillingSubscription(value: unknown): BillingSubscription | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null
  }

  return {
    id: value.id,
    plan_id: stringOrNull(value.plan_id),
    plan_price_id: stringOrNull(value.plan_price_id),
    status: stringOrNull(value.status) ?? "active",
    cancel_at_period_end: value.cancel_at_period_end === null ? null : booleanOrFalse(value.cancel_at_period_end),
    current_period_end: stringOrNull(value.current_period_end),
  }
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

export function getInitialBillingInterval(
  plans: BillingPlan[],
  subscription: BillingSubscription | null,
): BillingInterval {
  const currentPrice = plans
    .flatMap((plan) => plan.plan_prices)
    .find((price) => price.id === subscription?.plan_price_id)

  return currentPrice && isYearlyPrice(currentPrice) ? "yearly" : "monthly"
}

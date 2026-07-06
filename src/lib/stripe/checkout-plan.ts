type JoinedCheckoutPlan = {
  id?: string | null
  is_active?: boolean | null
  is_public?: boolean | null
  checkout_enabled?: boolean | null
}

export type CheckoutPlanPriceCandidate = {
  id?: string | null
  plan_id?: string | null
  stripe_price_id?: string | null
  is_active?: boolean | null
  checkout_enabled?: boolean | null
  plans?: JoinedCheckoutPlan | JoinedCheckoutPlan[] | null
}

export function normalizeJoinedCheckoutPlan(
  plans: CheckoutPlanPriceCandidate["plans"],
) {
  return Array.isArray(plans) ? plans[0] : plans
}

export function isCheckoutPlanPriceEligible(
  planPrice: CheckoutPlanPriceCandidate | null | undefined,
) {
  const joinedPlan = normalizeJoinedCheckoutPlan(planPrice?.plans)

  return Boolean(
    planPrice?.stripe_price_id &&
      planPrice.id &&
      planPrice.plan_id &&
      planPrice.is_active !== false &&
      planPrice.checkout_enabled !== false &&
      joinedPlan?.id &&
      joinedPlan.is_active !== false &&
      joinedPlan.is_public === true &&
      joinedPlan.checkout_enabled === true,
  )
}

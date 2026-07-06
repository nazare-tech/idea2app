import test from "node:test"
import assert from "node:assert/strict"

import {
  isCheckoutPlanPriceEligible,
  normalizeJoinedCheckoutPlan,
  type CheckoutPlanPriceCandidate,
} from "@/lib/stripe/checkout-plan"

function candidate(
  overrides: Partial<CheckoutPlanPriceCandidate> = {},
): CheckoutPlanPriceCandidate {
  return {
    id: "plan-price-1",
    plan_id: "plan-1",
    stripe_price_id: "price_123",
    is_active: true,
    checkout_enabled: true,
    plans: {
      id: "plan-1",
      is_active: true,
      is_public: true,
      checkout_enabled: true,
    },
    ...overrides,
  }
}

test("normalizeJoinedCheckoutPlan handles Supabase object and array join shapes", () => {
  const joinedPlan = {
    id: "plan-1",
    is_active: true,
    is_public: true,
    checkout_enabled: true,
  }

  assert.deepEqual(normalizeJoinedCheckoutPlan(joinedPlan), joinedPlan)
  assert.deepEqual(normalizeJoinedCheckoutPlan([joinedPlan]), joinedPlan)
})

test("isCheckoutPlanPriceEligible accepts an active public checkout-enabled plan price", () => {
  assert.equal(isCheckoutPlanPriceEligible(candidate()), true)
})

test("isCheckoutPlanPriceEligible rejects non-public plans", () => {
  assert.equal(
    isCheckoutPlanPriceEligible(candidate({
      plans: {
        id: "plan-1",
        is_active: true,
        is_public: false,
        checkout_enabled: true,
      },
    })),
    false,
  )
})

test("isCheckoutPlanPriceEligible rejects disabled plans and plan prices", () => {
  assert.equal(
    isCheckoutPlanPriceEligible(candidate({
      plans: {
        id: "plan-1",
        is_active: true,
        is_public: true,
        checkout_enabled: false,
      },
    })),
    false,
  )
  assert.equal(isCheckoutPlanPriceEligible(candidate({ checkout_enabled: false })), false)
})

test("isCheckoutPlanPriceEligible rejects missing Stripe prices", () => {
  assert.equal(isCheckoutPlanPriceEligible(candidate({ stripe_price_id: null })), false)
})

test("isCheckoutPlanPriceEligible rejects missing local plan price metadata ids", () => {
  assert.equal(isCheckoutPlanPriceEligible(candidate({ id: null })), false)
  assert.equal(isCheckoutPlanPriceEligible(candidate({ plan_id: null })), false)
})

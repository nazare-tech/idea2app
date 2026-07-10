import test from "node:test"
import assert from "node:assert/strict"

import {
  getBillingPlanCtaMode,
  parseStripeRedirectResponse,
} from "@/lib/stripe/billing-flow"

test("getBillingPlanCtaMode routes existing subscribers to subscription management", () => {
  assert.equal(
    getBillingPlanCtaMode({
      isFree: false,
      isCurrentPlan: false,
      hasSubscription: true,
      canCheckout: true,
    }),
    "manage",
  )
})

test("getBillingPlanCtaMode only offers checkout to eligible users without a subscription", () => {
  assert.equal(
    getBillingPlanCtaMode({
      isFree: false,
      isCurrentPlan: false,
      hasSubscription: false,
      canCheckout: true,
    }),
    "checkout",
  )
  assert.equal(
    getBillingPlanCtaMode({
      isFree: false,
      isCurrentPlan: false,
      hasSubscription: false,
      canCheckout: false,
    }),
    "unavailable",
  )
})

test("getBillingPlanCtaMode preserves current and free plan states", () => {
  assert.equal(
    getBillingPlanCtaMode({
      isFree: false,
      isCurrentPlan: true,
      hasSubscription: true,
      canCheckout: true,
    }),
    "current",
  )
  assert.equal(
    getBillingPlanCtaMode({
      isFree: true,
      isCurrentPlan: false,
      hasSubscription: false,
      canCheckout: false,
    }),
    "free",
  )
})

test("parseStripeRedirectResponse accepts hosted Checkout and Billing Portal URLs", () => {
  assert.deepEqual(
    parseStripeRedirectResponse(
      { url: "https://checkout.stripe.com/c/pay/test-session" },
      200,
      "Unable to start checkout.",
    ),
    { ok: true, url: "https://checkout.stripe.com/c/pay/test-session" },
  )
  assert.deepEqual(
    parseStripeRedirectResponse(
      { url: "https://billing.stripe.com/p/session/test-session" },
      200,
      "Unable to open billing portal.",
    ),
    { ok: true, url: "https://billing.stripe.com/p/session/test-session" },
  )
})

test("parseStripeRedirectResponse preserves safe API errors and rejects malformed redirects", () => {
  assert.deepEqual(
    parseStripeRedirectResponse(
      { error: "Use the billing portal to manage your existing subscription" },
      409,
      "Unable to start checkout.",
    ),
    { ok: false, error: "Use the billing portal to manage your existing subscription" },
  )
  assert.deepEqual(
    parseStripeRedirectResponse(
      { url: "https://example.com/not-stripe" },
      200,
      "Unable to start checkout.",
    ),
    { ok: false, error: "Unable to start checkout." },
  )
  assert.deepEqual(
    parseStripeRedirectResponse(null, 500, "Unable to start checkout."),
    { ok: false, error: "Unable to start checkout." },
  )
})

import assert from "node:assert/strict"
import test from "node:test"

import { buildCheckoutSessionIdempotencyKey } from "@/lib/stripe/checkout-idempotency"

const input = {
  userId: "user-1",
  planPriceId: "plan-price-1",
  stripePriceId: "price_1",
}

test("checkout idempotency key is stable for retries of one selection", () => {
  assert.equal(
    buildCheckoutSessionIdempotencyKey(input),
    buildCheckoutSessionIdempotencyKey(input)
  )
})

test("checkout idempotency key changes with the selected price", () => {
  assert.notEqual(
    buildCheckoutSessionIdempotencyKey(input),
    buildCheckoutSessionIdempotencyKey({ ...input, stripePriceId: "price_2" })
  )
})

test("checkout idempotency key follows the analytics metadata fingerprint", () => {
  const first = { ...input, analyticsFingerprint: '{"analytics_attribution_event_id":"click-1"}' }
  const second = { ...input, analyticsFingerprint: '{"analytics_attribution_event_id":"click-2"}' }
  // A new click (fresh attribution) must get a new key: Stripe rejects a
  // reused key when any request param differs.
  assert.notEqual(
    buildCheckoutSessionIdempotencyKey(first),
    buildCheckoutSessionIdempotencyKey(second)
  )
  // Identical retries of the same attempt still dedupe.
  assert.equal(
    buildCheckoutSessionIdempotencyKey(first),
    buildCheckoutSessionIdempotencyKey({ ...first })
  )
})

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

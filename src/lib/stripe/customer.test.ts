import test from "node:test"
import assert from "node:assert/strict"

import {
  buildStripeCustomerIdempotencyKey,
  getUsableStripeCustomerId,
} from "@/lib/stripe/customer"

function stripeFixture(result: unknown, error?: unknown) {
  let calls = 0
  const stripe = {
    customers: {
      async retrieve() {
        calls += 1
        if (error) throw error
        return result
      },
    },
  }

  return { stripe, getCalls: () => calls }
}

test("getUsableStripeCustomerId skips lookup when no customer is stored", async () => {
  const { stripe, getCalls } = stripeFixture({ id: "unused" })
  assert.equal(await getUsableStripeCustomerId(stripe as never, null, "user-1"), null)
  assert.equal(getCalls(), 0)
})

test("getUsableStripeCustomerId accepts only a customer owned by the user", async () => {
  const { stripe } = stripeFixture({
    id: "cus_live",
    deleted: false,
    metadata: { supabase_user_id: "user-1" },
  })
  assert.equal(
    await getUsableStripeCustomerId(stripe as never, "cus_live", "user-1"),
    "cus_live"
  )

  const missingMetadata = stripeFixture({ id: "cus_legacy", deleted: false, metadata: {} })
  assert.equal(
    await getUsableStripeCustomerId(missingMetadata.stripe as never, "cus_legacy", "user-1"),
    null
  )

  const wrongOwner = stripeFixture({
    id: "cus_other",
    deleted: false,
    metadata: { supabase_user_id: "user-2" },
  })
  assert.equal(
    await getUsableStripeCustomerId(wrongOwner.stripe as never, "cus_other", "user-1"),
    null
  )
})

test("getUsableStripeCustomerId rejects deleted and missing-mode customers", async () => {
  const deleted = stripeFixture({ id: "cus_deleted", deleted: true })
  assert.equal(await getUsableStripeCustomerId(deleted.stripe as never, "cus_deleted", "user-1"), null)

  const missing = stripeFixture(null, { code: "resource_missing" })
  assert.equal(await getUsableStripeCustomerId(missing.stripe as never, "cus_test", "user-1"), null)
})

test("getUsableStripeCustomerId preserves transient Stripe failures", async () => {
  const { stripe } = stripeFixture(null, { code: "api_connection_error" })
  await assert.rejects(getUsableStripeCustomerId(stripe as never, "cus_live", "user-1"))
})

test("buildStripeCustomerIdempotencyKey is scoped to user and observed customer", () => {
  assert.equal(
    buildStripeCustomerIdempotencyKey("user-1", "cus_test"),
    "makercompass:customer:user-1:cus_test"
  )
  assert.notEqual(
    buildStripeCustomerIdempotencyKey("user-1", null),
    buildStripeCustomerIdempotencyKey("user-2", null)
  )
})

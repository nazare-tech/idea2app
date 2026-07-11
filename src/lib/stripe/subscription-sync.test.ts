import test from "node:test"
import assert from "node:assert/strict"

import {
  buildSubscriptionCreditGrantKey,
  buildSubscriptionSyncSnapshot,
  getInvoiceSubscriptionId,
  invoiceMatchesSubscriptionPeriod,
  type StripePlanPriceMapping,
} from "@/lib/stripe/subscription-sync"

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    cancel_at_period_end: false,
    items: {
      data: [
        {
          id: "si_123",
          price: { id: "price_starter_monthly" },
          current_period_start: 1_777_593_600,
          current_period_end: 1_780_185_600,
        },
      ],
    },
    ...overrides,
  }
}

function planPrice(overrides: Partial<StripePlanPriceMapping> = {}): StripePlanPriceMapping {
  return {
    id: "plan-price-starter-monthly",
    plan_id: "plan-starter",
    stripe_price_id: "price_starter_monthly",
    interval_unit: "month",
    interval_count: 1,
    credits_multiplier: 1,
    plans: {
      id: "plan-starter",
      name: "Starter",
      credits_monthly: 100,
    },
    ...overrides,
  }
}

test("buildSubscriptionSyncSnapshot maps the subscription item price to the app plan price", () => {
  const snapshot = buildSubscriptionSyncSnapshot(
    subscription(),
    new Map([["price_starter_monthly", planPrice()]])
  )

  assert.deepEqual(snapshot, {
    stripeSubscriptionId: "sub_123",
    stripeCustomerId: "cus_123",
    status: "active",
    cancelAtPeriodEnd: false,
    stripePriceId: "price_starter_monthly",
    stripeSubscriptionItemId: "si_123",
    planId: "plan-starter",
    planPriceId: "plan-price-starter-monthly",
    planName: "Starter",
    creditsMonthly: 100,
    creditsForPeriod: 100,
    currentPeriodStart: "2026-05-01T00:00:00.000Z",
    currentPeriodEnd: "2026-05-31T00:00:00.000Z",
  })
})

test("buildSubscriptionSyncSnapshot selects the mapped plan item when add-ons are present", () => {
  const snapshot = buildSubscriptionSyncSnapshot(
    subscription({
      items: {
        data: [
          {
            id: "si_addon",
            price: { id: "price_unmapped_addon" },
            current_period_start: 1_777_593_600,
            current_period_end: 1_780_185_600,
          },
          {
            id: "si_plan",
            price: { id: "price_starter_annual" },
            current_period_start: 1_777_593_600,
            current_period_end: 1_809_129_600,
          },
        ],
      },
    }),
    new Map([
      [
        "price_starter_annual",
        planPrice({
          id: "plan-price-starter-annual",
          stripe_price_id: "price_starter_annual",
          interval_unit: "year",
          interval_count: 1,
          credits_multiplier: 12,
        }),
      ],
    ])
  )

  assert.equal(snapshot.stripeSubscriptionItemId, "si_plan")
  assert.equal(snapshot.currentPeriodEnd, "2027-05-01T00:00:00.000Z")
  assert.equal(snapshot.creditsForPeriod, 1200)
})

test("buildSubscriptionSyncSnapshot rejects subscriptions without a mapped plan price", () => {
  assert.throws(
    () => buildSubscriptionSyncSnapshot(subscription(), new Map()),
    /unmapped_price/
  )
})

test("buildSubscriptionSyncSnapshot rejects ambiguous mapped plan items", () => {
  assert.throws(
    () =>
      buildSubscriptionSyncSnapshot(
        subscription({
          items: {
            data: [
              {
                id: "si_starter",
                price: { id: "price_starter_monthly" },
                current_period_start: 1_777_593_600,
                current_period_end: 1_780_185_600,
              },
              {
                id: "si_pro",
                price: { id: "price_pro_monthly" },
                current_period_start: 1_777_593_600,
                current_period_end: 1_780_185_600,
              },
            ],
          },
        }),
        new Map([
          ["price_starter_monthly", planPrice()],
          [
            "price_pro_monthly",
            planPrice({
              id: "plan-price-pro-monthly",
              plan_id: "plan-pro",
              stripe_price_id: "price_pro_monthly",
              plans: {
                id: "plan-pro",
                name: "Pro",
                credits_monthly: 500,
              },
            }),
          ],
        ])
      ),
    /ambiguous_plan_items/
  )
})

test("buildSubscriptionCreditGrantKey is stable for duplicate period events", () => {
  const snapshot = buildSubscriptionSyncSnapshot(
    subscription(),
    new Map([["price_starter_monthly", planPrice()]])
  )

  assert.equal(
    buildSubscriptionCreditGrantKey(snapshot),
    "subscription_period:sub_123:2026-05-01T00:00:00.000Z"
  )
})

test("getInvoiceSubscriptionId supports current Clover invoice parent shape", () => {
  assert.equal(
    getInvoiceSubscriptionId({
      parent: {
        subscription_details: {
          subscription: "sub_current",
        },
      },
    }),
    "sub_current"
  )
})

test("getInvoiceSubscriptionId preserves legacy and expanded subscription shapes", () => {
  assert.equal(getInvoiceSubscriptionId({ subscription: "sub_legacy" }), "sub_legacy")
  assert.equal(getInvoiceSubscriptionId({ subscription: { id: "sub_expanded" } }), "sub_expanded")
  assert.equal(
    getInvoiceSubscriptionId({
      parent: { subscription_details: { subscription: { id: "sub_current_expanded" } } },
    }),
    "sub_current_expanded"
  )
  assert.equal(getInvoiceSubscriptionId({ parent: null }), "")
  assert.equal(getInvoiceSubscriptionId({ parent: { subscription_details: null } }), "")
})

test("invoiceMatchesSubscriptionPeriod rejects delayed invoices from an older period", () => {
  const snapshot = buildSubscriptionSyncSnapshot(
    subscription(),
    new Map([["price_starter_monthly", planPrice()]])
  )
  const invoice = (start: number, end: number, overrides: Record<string, unknown> = {}) => ({
    lines: {
      data: [
        {
          parent: {
            subscription_item_details: {
              proration: false,
              subscription: "sub_123",
              subscription_item: "si_123",
            },
          },
          pricing: {
            price_details: { price: "price_starter_monthly" },
          },
          period: { start, end },
          ...overrides,
        },
      ],
    },
  })

  assert.equal(
    invoiceMatchesSubscriptionPeriod(invoice(1_777_593_600, 1_780_185_600), snapshot),
    true
  )
  assert.equal(
    invoiceMatchesSubscriptionPeriod(invoice(1_775_174_400, 1_777_593_600), snapshot),
    false
  )
  assert.equal(invoiceMatchesSubscriptionPeriod({}, snapshot), false)
  assert.equal(
    invoiceMatchesSubscriptionPeriod(
      {
        lines: {
          data: [
            {
              subscription: "sub_123",
              subscription_item: "si_123",
              price: { id: "price_starter_monthly" },
              proration: false,
              period: { start: 1_777_593_600, end: 1_780_185_600 },
            },
          ],
        },
      },
      snapshot
    ),
    true
  )
  assert.equal(
    invoiceMatchesSubscriptionPeriod(
      invoice(1_777_593_600, 1_780_185_600, {
        parent: {
          subscription_item_details: {
            proration: true,
            subscription: "sub_123",
            subscription_item: "si_123",
          },
        },
      }),
      snapshot
    ),
    false
  )
})

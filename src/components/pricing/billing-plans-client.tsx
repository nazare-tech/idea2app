"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { BillingIntervalToggle } from "@/components/pricing/billing-interval-toggle"
import { PlanCard, planCtaClasses } from "@/components/pricing/plan-card"
import {
  formatUsdFromCents,
  getPlanDisplay,
  type BillingInterval,
} from "@/lib/pricing-plans"
import {
  getPriceForInterval,
  isCheckoutReadyPlanPrice,
  isYearlyPrice,
  type BillingPlan,
  type BillingSubscription,
} from "@/lib/billing-page-data"

interface BillingPlansClientProps {
  plans: BillingPlan[]
  subscription: BillingSubscription | null
  initialBillingInterval: BillingInterval
}

export function BillingPlansClient({
  plans,
  subscription,
  initialBillingInterval,
}: BillingPlansClientProps) {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(initialBillingInterval)

  const handleCheckout = async (planId: string, priceId: string) => {
    setCheckoutLoading(planId)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, priceId }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Checkout error:", error)
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">Available Plans</h2>
        <BillingIntervalToggle value={billingInterval} onChange={setBillingInterval} />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const display = getPlanDisplay(plan.name)
          const isFree = plan.price_monthly === 0
          // Free users have no subscription row; the Free card is their current plan.
          const isCurrentPlan = subscription ? subscription.plan_id === plan.id : isFree
          const highlighted = Boolean(display?.highlighted)
          const selectedPrice = isFree ? null : getPriceForInterval(plan, billingInterval)
          const canCheckout = Boolean(selectedPrice && isCheckoutReadyPlanPrice(selectedPrice))
          const yearlySelected = Boolean(selectedPrice && isYearlyPrice(selectedPrice))

          // Yearly prices display as a per-month equivalent, like the landing grid.
          const priceLabel = isFree
            ? "$0"
            : selectedPrice
              ? formatUsdFromCents(
                  yearlySelected
                    ? Math.round(selectedPrice.unit_amount_cents / 12 / 100) * 100
                    : selectedPrice.unit_amount_cents
                )
              : formatUsdFromCents(plan.price_monthly)
          const billNote = isFree
            ? "free forever"
            : yearlySelected && selectedPrice
              ? `billed annually as ${formatUsdFromCents(selectedPrice.unit_amount_cents)}`
              : "billed monthly"

          const fallbackFeatures = plan.features.filter(
            (feature) => !/\b(tokens?|credits?)\b/i.test(feature)
          )

          return (
            <PlanCard
              key={plan.id}
              name={plan.name}
              priceLabel={priceLabel}
              priceCaption="per month"
              billNote={billNote}
              includedLabel={display?.includedLabel ?? "What's included:"}
              features={display?.features ?? fallbackFeatures}
              highlighted={highlighted}
              badge={isCurrentPlan ? "Current Plan" : highlighted ? "Best Value" : null}
              corners="rounded"
              cta={
                isCurrentPlan ? (
                  <Button className={planCtaClasses(false)} disabled>
                    Current Plan
                  </Button>
                ) : isFree ? (
                  <Button className={planCtaClasses(false)} disabled>
                    Free Tier
                  </Button>
                ) : (
                  <Button
                    className={planCtaClasses(highlighted)}
                    onClick={() =>
                      selectedPrice?.stripe_price_id &&
                      handleCheckout(plan.id, selectedPrice.stripe_price_id)
                    }
                    disabled={!canCheckout || checkoutLoading !== null}
                  >
                    {checkoutLoading === plan.id ? (
                      <Spinner size="sm" />
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                )
              }
            />
          )
        })}
      </div>
    </section>
  )
}

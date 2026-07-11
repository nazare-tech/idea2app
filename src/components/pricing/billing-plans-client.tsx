"use client"

import { useEffect, useRef, useState } from "react"

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
import {
  getBillingPlanCtaMode,
  parseStripeRedirectResponse,
} from "@/lib/stripe/billing-flow"
import { useBillingPortal } from "@/hooks/use-billing-portal"
import {
  consumeUpgradeAttribution,
  flushProductEvents,
  getProductAnalyticsTabSessionId,
  getUpgradeAttribution,
  trackClientProductEvent,
} from "@/lib/product-analytics/client"

interface BillingPlansClientProps {
  plans: BillingPlan[]
  subscription: BillingSubscription | null
  canManageSubscription: boolean
  initialBillingInterval: BillingInterval
}

export function BillingPlansClient({
  plans,
  subscription,
  canManageSubscription,
  initialBillingInterval,
}: BillingPlansClientProps) {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(initialBillingInterval)
  const checkoutInFlightRef = useRef(false)
  const { loading: portalLoading, openBillingPortal } = useBillingPortal()

  useEffect(() => {
    const hasCheckoutOption = !subscription && plans.some((plan) =>
      plan.plan_prices.some((price) => isCheckoutReadyPlanPrice(price)),
    )
    if (hasCheckoutOption) {
      trackClientProductEvent("upgrade_cta_viewed", { surface: "billing" })
    }
  }, [plans, subscription])

  const handleCheckout = async (planId: string, priceId: string) => {
    if (checkoutInFlightRef.current) return

    checkoutInFlightRef.current = true
    setCheckoutError(null)
    setCheckoutLoading(planId)

    try {
      const billingClickEventId = trackClientProductEvent("upgrade_cta_clicked", { surface: "billing" })
      // Read without consuming: a failed request must not lose the CTA
      // attribution for the user's retry click.
      const rememberedAttribution = getUpgradeAttribution()
      const attribution = rememberedAttribution.attributionEventId
        ? rememberedAttribution
        : {
            sourceSurface: "billing" as const,
            attributionEventId: billingClickEventId,
            projectId: undefined,
          }
      await flushProductEvents()
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          priceId,
          sourceSurface: attribution.sourceSurface,
          ...(attribution.projectId ? { projectId: attribution.projectId } : {}),
          ...(attribution.attributionEventId
            ? { attributionEventId: attribution.attributionEventId }
            : {}),
          analyticsSessionId: getProductAnalyticsTabSessionId(),
        }),
      })

      const data = await response.json().catch(() => null)
      const result = parseStripeRedirectResponse(
        data,
        response.status,
        "Unable to start checkout. Please try again.",
      )

      if (result.ok) {
        consumeUpgradeAttribution()
        window.location.assign(result.url)
        return
      }

      setCheckoutError(result.error)
    } catch (error) {
      console.error("Checkout error:", error)
      setCheckoutError("Unable to start checkout. Please try again.")
    } finally {
      checkoutInFlightRef.current = false
      setCheckoutLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    setCheckoutError(null)
    const result = await openBillingPortal()
    if (!result.ok) {
      setCheckoutError(result.error ?? "Unable to open billing portal.")
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
          const ctaMode = getBillingPlanCtaMode({
            isFree,
            isCurrentPlan,
            hasSubscription: Boolean(subscription),
            canManageSubscription,
            canCheckout,
          })
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
                ctaMode === "current" ? (
                  <Button className={planCtaClasses(false)} disabled>
                    Current Plan
                  </Button>
                ) : ctaMode === "free" ? (
                  <Button className={planCtaClasses(false)} disabled>
                    Free Tier
                  </Button>
                ) : ctaMode === "manage" ? (
                  <Button
                    className={planCtaClasses(highlighted)}
                    onClick={() => void handleManageSubscription()}
                    disabled={portalLoading || checkoutLoading !== null}
                  >
                    {portalLoading ? <Spinner size="sm" /> : "Manage plan"}
                  </Button>
                ) : ctaMode === "checkout" ? (
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
                ) : (
                  <Button className={planCtaClasses(false)} disabled>
                    Checkout unavailable
                  </Button>
                )
              }
            />
          )
        })}
      </div>
      {checkoutError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {checkoutError}
        </p>
      ) : null}
    </section>
  )
}

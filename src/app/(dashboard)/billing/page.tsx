"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { CreditCard, FolderKanban } from "lucide-react"
import { useBillingPortal } from "@/hooks/use-billing-portal"
import { AppPageHeader, AppPageShell } from "@/components/layout/app-page-shell"
import { PlanCard, planCtaClasses } from "@/components/pricing/plan-card"
import { BillingIntervalToggle } from "@/components/pricing/billing-interval-toggle"
import {
  formatUsdFromCents,
  getPlanDisplay,
  type BillingInterval,
} from "@/lib/pricing-plans"
import {
  getProjectAllowanceStatus,
  type ProjectAllowanceClient,
  type ProjectAllowanceStatus,
} from "@/lib/project-allowance"

interface Plan {
  id: string
  name: string
  description: string | null
  price_monthly: number
  features: string[]
  plan_prices: PlanPrice[]
}

interface PlanPrice {
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

interface Subscription {
  id: string
  plan_id: string | null
  plan_price_id: string | null
  status: string
  cancel_at_period_end: boolean | null
  current_period_end: string | null
}

function normalizePlanPrices(value: unknown): PlanPrice[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((price): price is PlanPrice => {
      return Boolean(
        price &&
          typeof price === "object" &&
          "id" in price &&
          typeof price.id === "string" &&
          "unit_amount_cents" in price &&
          typeof price.unit_amount_cents === "number"
      )
    })
    .filter((price) => price.is_active !== false)
    .sort((left, right) => left.sort_order - right.sort_order)
}

function isCheckoutReadyPlanPrice(price: PlanPrice) {
  return Boolean(price.checkout_enabled && price.stripe_price_id)
}

function isYearlyPrice(price: PlanPrice) {
  return price.interval_unit === "year"
}

/** Picks the plan's price row for the page-level Monthly/Yearly toggle. */
function getPriceForInterval(plan: Plan, interval: BillingInterval): PlanPrice | null {
  const prices = plan.plan_prices
  const match = prices.find((price) =>
    interval === "yearly"
      ? isYearlyPrice(price)
      : price.interval_unit === "month" && price.interval_count === 1
  )
  return match ?? prices.find(isCheckoutReadyPlanPrice) ?? prices[0] ?? null
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [projectAllowance, setProjectAllowance] = useState<ProjectAllowanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly")
  const { loading: billingPortalLoading, openBillingPortal } = useBillingPortal()

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Plans, subscription, and allowance are independent; fetch them in parallel.
      const [{ data: plansData }, { data: subData }, allowanceStatus] = await Promise.all([
        supabase
          .from("plans")
          .select("*, plan_prices(*)")
          .eq("is_active", true)
          .eq("is_public", true)
          .order("price_monthly", { ascending: true }),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle(),
        getProjectAllowanceStatus(supabase as unknown as ProjectAllowanceClient, user.id),
      ])

      const nextPlans: Plan[] = (plansData ?? []).map((p) => ({
        ...p,
        features: Array.isArray(p.features) ? (p.features as string[]) : [],
        plan_prices: normalizePlanPrices(p.plan_prices),
      }))
      setPlans(nextPlans)

      if (subData) {
        setSubscription(subData)

        // Open the page on the interval the user is actually billed on.
        const currentPrice = nextPlans
          .flatMap((plan) => plan.plan_prices)
          .find((price) => price.id === subData.plan_price_id)
        if (currentPrice && isYearlyPrice(currentPrice)) {
          setBillingInterval("yearly")
        }
      }

      setProjectAllowance(allowanceStatus)
      setLoading(false)
    }

    load()
  }, [])

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

  const currentPlan = subscription
    ? plans.find((plan) => plan.id === subscription.plan_id) ?? null
    : null
  const currentPlanPrice =
    currentPlan?.plan_prices.find((price) => price.id === subscription?.plan_price_id) ?? null
  const visibleProjectAllowance = projectAllowance
    ? projectAllowance.allowance === null
      ? "Unlimited projects"
      : `${projectAllowance.used} of ${projectAllowance.allowance} projects used`
    : "Project usage unavailable"
  const projectAllowanceDetail = projectAllowance?.allowance === null
    ? "Your current plan does not have a monthly project cap."
    : projectAllowance?.window.source === "lifetime"
      ? "Free plan allowance is lifetime-based."
      : "Your project allowance resets monthly."

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <AppPageShell contentClassName="max-w-[1180px]">
      <AppPageHeader
        eyebrow="Account"
        title="Billing"
        description="Manage your subscription and project allowance."
      />

      {/* Current Plan & Project Allowance */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="transition-colors duration-200 hover:border-text-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-secondary">
                <CreditCard className="h-5 w-5 text-text-primary" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Plan
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tracking-tight">
              {subscription ? currentPlan?.name || "Active" : "Free"}
            </p>
            {subscription?.cancel_at_period_end && (
              <Badge variant="warning" className="mt-2">Cancels at period end</Badge>
            )}
            {currentPlanPrice && (
              <p className="mt-1 text-sm text-muted-foreground">
                {currentPlanPrice.label} billing
              </p>
            )}
            {subscription && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  void openBillingPortal()
                }}
                disabled={billingPortalLoading}
              >
                {billingPortalLoading ? "Opening..." : "Manage Subscription"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="transition-colors duration-200 hover:border-text-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-secondary">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Project Allowance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tracking-tight text-text-primary">
              {visibleProjectAllowance}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {projectAllowanceDetail}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plans: same shared PlanCard + copy as the landing pricing grid */}
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

    </AppPageShell>
  )
}

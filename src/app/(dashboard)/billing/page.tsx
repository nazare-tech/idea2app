"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { formatPrice } from "@/lib/utils"
import { BASE_ACTION_TOKENS, TOKEN_VALUE_CENTS, estimateFullReportTokens } from "@/lib/token-economics"
import { Check, Coins, Zap, CreditCard, Crown } from "lucide-react"
import { useBillingPortal } from "@/hooks/use-billing-portal"
import { CreditBalance } from "@/components/ui/credit-balance"
import { AppPageHeader, AppPageShell } from "@/components/layout/app-page-shell"

interface Plan {
  id: string
  name: string
  description: string | null
  price_monthly: number
  credits_monthly: number
  features: string[]
  stripe_price_id: string | null
  is_active: boolean | null
  plan_prices?: PlanPrice[]
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
    .sort((left, right) => left.sort_order - right.sort_order)
}

function isCheckoutReadyPlanPrice(price: PlanPrice) {
  return Boolean(price.checkout_enabled && price.stripe_price_id)
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [selectedPriceByPlan, setSelectedPriceByPlan] = useState<Record<string, string>>({})
  const { loading: billingPortalLoading, openBillingPortal } = useBillingPortal()

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Get plans
      const { data: plansData } = await supabase
        .from("plans")
        .select("*, plan_prices(*)")
        .eq("is_active", true)
        .eq("is_public", true)
        .order("price_monthly", { ascending: true })

      if (plansData) {
        const nextSelectedPriceByPlan: Record<string, string> = {}
        const nextPlans = plansData.map((p) => {
          const prices = normalizePlanPrices(p.plan_prices)
          const defaultPrice = prices.find(isCheckoutReadyPlanPrice) ?? prices[0]

          if (defaultPrice) {
            nextSelectedPriceByPlan[p.id] = defaultPrice.id
          }

          return {
            ...p,
            features: Array.isArray(p.features) ? p.features as string[] : [],
            plan_prices: prices,
          }
        })

        setPlans(nextPlans)
        setSelectedPriceByPlan(nextSelectedPriceByPlan)
      }

      // Get subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (subData) {
        setSubscription(subData)
      }

      // Get credits
      const { data: creditsData } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", user.id)
        .single()

      if (creditsData) {
        setCredits(creditsData.balance)
      }

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

  const getSelectedPlanPrice = (plan: Plan) => {
    const prices = plan.plan_prices ?? []
    const selectedPriceId = selectedPriceByPlan[plan.id]
    return prices.find((price) => price.id === selectedPriceId) ?? prices.find(isCheckoutReadyPlanPrice) ?? prices[0] ?? null
  }

  const getCurrentPlanPrice = (plan: Plan) => {
    if (subscription?.plan_id !== plan.id || !subscription.plan_price_id) {
      return null
    }

    return plan.plan_prices?.find((price) => price.id === subscription.plan_price_id) ?? null
  }

  const getBillingPeriodLabel = (price: PlanPrice) => {
    if (price.interval_unit === "year" && price.interval_count === 1) {
      return "/year"
    }

    if (price.interval_unit === "month" && price.interval_count === 6) {
      return "/6 months"
    }

    return "/month"
  }

  const getMonthlyEquivalent = (price: PlanPrice) => {
    const months = price.interval_unit === "year" ? price.interval_count * 12 : price.interval_count
    if (months <= 1) {
      return null
    }

    return `${formatPrice(Math.round(price.unit_amount_cents / months))}/mo equivalent`
  }

  const getPlanIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "free":
        return Coins
      case "starter":
        return Zap
      case "pro":
        return CreditCard
      case "enterprise":
        return Crown
      default:
        return Coins
    }
  }

  const tokenValueLabel = formatPrice(TOKEN_VALUE_CENTS)
  const fullReportFast = estimateFullReportTokens("openai/gpt-5.4-mini")
  const fullReportBalanced = estimateFullReportTokens("anthropic/claude-sonnet-4-6")
  const fullReportThinking = estimateFullReportTokens("google/gemini-3.1-pro-preview")
  const currentPlan = subscription
    ? plans.find((plan) => plan.id === subscription.plan_id) ?? null
    : null
  const currentPlanPrice = currentPlan ? getCurrentPlanPrice(currentPlan) : null

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
        description="Manage your subscription and token balance."
      />

      {/* Current Plan & Credits */}
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
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Token Balance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tracking-tight">
              <CreditBalance
                credits={credits}
                className="text-2xl font-black tracking-tight"
                unlimitedClassName="text-primary"
              />
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Tokens are used for analyses and app generation (1 token = {tokenValueLabel})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">Available Plans</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.name)
            const isCurrentPlan = subscription?.plan_id === plan.id
            const isFree = plan.price_monthly === 0
            const isPro = plan.name.toLowerCase() === "pro"
            const prices = plan.plan_prices ?? []
            const selectedPrice = getCurrentPlanPrice(plan) ?? getSelectedPlanPrice(plan)
            const canCheckout = Boolean(selectedPrice && isCheckoutReadyPlanPrice(selectedPrice))

            return (
              <Card
                key={plan.id}
                className={`relative transition-[border-color,transform] duration-200 ease-out-expo hover:-translate-y-1 ${
                  isCurrentPlan
                    ? "border-primary"
                    : isPro
                    ? "border-primary/40 hover:border-primary"
                    : "hover:border-text-primary/20"
                }`}
              >
                {isPro && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Current Plan</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg border ${
                    isPro
                      ? "border-primary/30 bg-primary/5"
                      : "border-border-subtle bg-secondary"
                  }`}>
                    <Icon className={`h-6 w-6 ${isPro ? "text-primary" : "text-text-primary"}`} />
                  </div>
                  <CardTitle className="font-bold">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-2">
                    <span className={`text-3xl font-black tracking-tight ${isPro ? "text-primary" : ""}`}>
                      {isFree ? "Free" : formatPrice(selectedPrice?.unit_amount_cents ?? plan.price_monthly)}
                    </span>
                    {!isFree && selectedPrice && (
                      <span className="text-muted-foreground text-sm">{getBillingPeriodLabel(selectedPrice)}</span>
                    )}
                  </div>
                  {!isFree && selectedPrice && getMonthlyEquivalent(selectedPrice) && (
                    <p className="text-xs text-muted-foreground">
                      {getMonthlyEquivalent(selectedPrice)}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isFree && prices.length > 0 && (
                    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border-subtle bg-secondary p-1">
                      {prices.map((price) => {
                        const isSelected = selectedPrice?.id === price.id
                        const isReady = isCheckoutReadyPlanPrice(price)

                        return (
                          <button
                            key={price.id}
                            type="button"
                            onClick={() => {
                              setSelectedPriceByPlan((current) => ({
                                ...current,
                                [plan.id]: price.id,
                              }))
                            }}
                            className={`min-h-12 rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                              isSelected
                                ? "bg-white text-text-primary shadow-sm"
                                : "text-muted-foreground hover:bg-white/70 hover:text-text-primary"
                            }`}
                          >
                            <span className="block truncate">{price.label}</span>
                            {price.savings_label && (
                              <span className="block truncate text-[11px] text-primary">
                                {price.savings_label}
                              </span>
                            )}
                            {!isReady && (
                              <span className="block truncate text-[11px] text-muted-foreground">
                                Soon
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-secondary">
                          <Check className="h-3 w-3 text-emerald-400" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : isFree ? (
                    <Button variant="outline" className="w-full" disabled>
                      Free Tier
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
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
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Token Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage</CardTitle>
          <CardDescription>Base token costs by action (before model multiplier)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Chat Message", action: "chat" },
              { name: "Competitive Analysis", action: "competitive-analysis" },
              { name: "Gap Analysis", action: "gap-analysis" },
              { name: "Product Plan", action: "prd" },
              { name: "Technical Spec", action: "tech-spec" },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-white p-3.5 transition-colors duration-200 hover:border-text-primary/20 hover:bg-secondary/40"
              >
                <span className="text-sm font-medium">{item.name}</span>
                <Badge variant="outline" className="font-mono text-xs">{BASE_ACTION_TOKENS[item.action as keyof typeof BASE_ACTION_TOKENS]} tokens</Badge>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border-subtle bg-white p-4 text-sm text-muted-foreground">
            <p>Model multiplier examples (full report = Market Research + Product Plan + First Version Plan + Tech Spec):</p>
            <ul className="mt-2 space-y-1">
              <li>Fast model: ~{fullReportFast} tokens</li>
              <li>Balanced model: ~{fullReportBalanced} tokens</li>
              <li>Thinking model: ~{fullReportThinking} tokens</li>
            </ul>
            <p className="mt-2">Token value is configurable via <code>TOKEN_VALUE_CENTS</code> / <code>NEXT_PUBLIC_TOKEN_VALUE_CENTS</code> (current: {tokenValueLabel}).</p>
          </div>
        </CardContent>
      </Card>
    </AppPageShell>
  )
}

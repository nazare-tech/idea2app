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
}

interface Subscription {
  id: string
  plan_id: string | null
  status: string
  cancel_at_period_end: boolean | null
  current_period_end: string | null
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
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
        .select("*")
        .eq("is_active", true)
        .eq("is_public", true)
        .order("price_monthly", { ascending: true })

      if (plansData) {
        setPlans(plansData.map((p) => ({
          ...p,
          features: Array.isArray(p.features) ? p.features as string[] : [],
        })))
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
              {subscription
                ? plans.find((p) => p.id === subscription.plan_id)?.name || "Active"
                : "Free"}
            </p>
            {subscription?.cancel_at_period_end && (
              <Badge variant="warning" className="mt-2">Cancels at period end</Badge>
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
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.name)
            const isCurrentPlan = subscription?.plan_id === plan.id
            const isFree = plan.price_monthly === 0
            const isPro = plan.name.toLowerCase() === "pro"

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
                      {isFree ? "Free" : formatPrice(plan.price_monthly)}
                    </span>
                    {!isFree && (
                      <span className="text-muted-foreground text-sm">/month</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
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
                        plan.stripe_price_id &&
                        handleCheckout(plan.id, plan.stripe_price_id)
                      }
                      disabled={!plan.stripe_price_id || checkoutLoading !== null}
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
              { name: "PRD Document", action: "prd" },
              { name: "Technical Spec", action: "tech-spec" },
              { name: "Static Website", action: "app-static" },
              { name: "Dynamic Website", action: "app-dynamic" },
              { name: "Single Page App", action: "app-spa" },
              { name: "Progressive Web App", action: "app-pwa" },
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
            <p>Model multiplier examples (full report = Competitive + PRD + MVP + Tech Spec):</p>
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

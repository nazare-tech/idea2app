"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { formatPrice } from "@/lib/utils"
import { Check, Coins, Zap, CreditCard, Crown } from "lucide-react"

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

  const handleManageSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Portal error:", error)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and credits
        </p>
      </div>

      {/* Current Plan & Credits */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="group hover:border-[rgba(0,212,255,0.2)] transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00d4ff]/20 to-[#7c3aed]/20 border border-[rgba(0,212,255,0.15)] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.1)]">
                <CreditCard className="h-5 w-5 text-[#00d4ff]" />
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
                onClick={handleManageSubscription}
              >
                Manage Subscription
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="group hover:border-[rgba(124,58,237,0.2)] transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7c3aed]/20 to-[#f472b6]/20 border border-[rgba(124,58,237,0.15)] flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                <Coins className="h-5 w-5 text-[#a78bfa]" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Credit Balance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tracking-tight">
              {credits >= 999999 ? (
                <span className="gradient-text">Unlimited</span>
              ) : credits.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Credits are used for analyses and app generation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.filter((p) => p.name !== "Internal Dev").map((plan) => {
            const Icon = getPlanIcon(plan.name)
            const isCurrentPlan = subscription?.plan_id === plan.id
            const isFree = plan.price_monthly === 0
            const isPro = plan.name.toLowerCase() === "pro"

            return (
              <Card
                key={plan.id}
                className={`relative group transition-all duration-300 hover:-translate-y-1 ${
                  isCurrentPlan
                    ? "border-[rgba(0,212,255,0.4)] shadow-[0_0_25px_rgba(0,212,255,0.15)]"
                    : isPro
                    ? "border-[rgba(124,58,237,0.3)] shadow-[0_0_25px_rgba(124,58,237,0.1)] hover:shadow-[0_0_35px_rgba(124,58,237,0.2)]"
                    : "hover:border-[rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(0,212,255,0.08)]"
                }`}
              >
                {isPro && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-[#7c3aed] to-[#f472b6] text-white border-0 shadow-[0_0_15px_rgba(124,58,237,0.3)]">Most Popular</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white border-0 shadow-[0_0_15px_rgba(0,212,255,0.3)]">Current Plan</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 border shadow-lg ${
                    isPro
                      ? "bg-gradient-to-br from-[#7c3aed]/20 to-[#f472b6]/20 border-[rgba(124,58,237,0.2)] shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                      : "bg-gradient-to-br from-[#00d4ff]/20 to-[#7c3aed]/20 border-[rgba(0,212,255,0.15)] shadow-[0_0_15px_rgba(0,212,255,0.1)]"
                  }`}>
                    <Icon className={`h-6 w-6 ${isPro ? "text-[#a78bfa]" : "text-[#00d4ff]"}`} />
                  </div>
                  <CardTitle className="font-bold">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-2">
                    <span className={`text-3xl font-black tracking-tight ${isPro ? "gradient-text" : ""}`}>
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
                        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
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
      </div>

      {/* Credit Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Usage</CardTitle>
          <CardDescription>How credits are consumed for each action</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Chat Message", credits: 1 },
              { name: "Competitive Analysis", credits: 5 },
              { name: "Gap Analysis", credits: 5 },
              { name: "PRD Document", credits: 10 },
              { name: "Technical Spec", credits: 10 },
              { name: "Static Website", credits: 50 },
              { name: "Dynamic Website", credits: 100 },
              { name: "Single Page App", credits: 150 },
              { name: "Progressive Web App", credits: 200 },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(0,212,255,0.15)] hover:bg-[rgba(0,212,255,0.03)] transition-all duration-200"
              >
                <span className="text-sm font-medium">{item.name}</span>
                <Badge variant="outline" className="font-mono text-xs">{item.credits} credits</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and credits
        </p>
      </div>

      {/* Current Plan & Credits */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credit Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {credits >= 999999 ? "Unlimited" : credits.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Credits are used for analyses and app generation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.filter((p) => p.name !== "Internal Dev").map((plan) => {
            const Icon = getPlanIcon(plan.name)
            const isCurrentPlan = subscription?.plan_id === plan.id
            const isFree = plan.price_monthly === 0

            return (
              <Card
                key={plan.id}
                className={`relative ${isCurrentPlan ? "border-primary" : ""}`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Current Plan</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {isFree ? "Free" : formatPrice(plan.price_monthly)}
                    </span>
                    {!isFree && (
                      <span className="text-muted-foreground text-sm">/month</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
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
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
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
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <span className="text-sm">{item.name}</span>
                <Badge variant="outline">{item.credits} credits</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

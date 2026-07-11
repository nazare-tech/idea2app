import { redirect } from "next/navigation"
import { CreditCard, FolderKanban } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppPageHeader, AppPageShell } from "@/components/layout/app-page-shell"
import { BillingPlansClient } from "@/components/pricing/billing-plans-client"
import { ManageSubscriptionButton } from "@/components/pricing/manage-subscription-button"
import { getInitialBillingInterval, toBillingPlans } from "@/lib/billing-page-data"
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  getProjectAllowanceStatus,
} from "@/lib/project-allowance"
import { getCurrentUser } from "@/lib/supabase/current-user"

export default async function BillingPage() {
  const { user, supabase } = await getCurrentUser()

  if (!user) {
    redirect("/auth")
  }

  const [{ data: plansData }, { data: subscriptionData }, projectAllowance] = await Promise.all([
    supabase
      .from("plans")
      .select("*, plan_prices(*)")
      .eq("is_active", true)
      .eq("is_public", true)
      .order("price_monthly", { ascending: true }),
    supabase
      .from("subscriptions")
      .select("id, plan_id, plan_price_id, stripe_subscription_id, status, cancel_at_period_end, current_period_end, created_at")
      .eq("user_id", user.id)
      .in("status", [...ACTIVE_SUBSCRIPTION_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getProjectAllowanceStatus(supabase, user.id),
  ])

  const plans = toBillingPlans(plansData)
  const subscription = subscriptionData
  const canManageSubscription = Boolean(subscription?.stripe_subscription_id)
  const currentPlan = subscription
    ? plans.find((plan) => plan.id === subscription.plan_id) ?? null
    : null
  const currentPlanPrice =
    currentPlan?.plan_prices.find((price) => price.id === subscription?.plan_price_id) ?? null
  // Remaining (not used) reads correctly through plan changes: upgrades and
  // renewals only ever increase what's left, so the number never looks wrong.
  const visibleProjectAllowance = projectAllowance
    ? projectAllowance.allowance === null
      ? "Unlimited projects"
      : `${projectAllowance.remaining} of ${projectAllowance.allowance} projects left`
    : "Project usage unavailable"
  const allowanceResetDate = projectAllowance?.window.end
    ? new Date(projectAllowance.window.end).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null
  const projectAllowanceDetail = projectAllowance?.allowance === null
    ? "Your current plan does not have a monthly project cap."
    : projectAllowance?.window.source === "lifetime"
      ? "Free plan projects are a lifetime allowance."
      : allowanceResetDate
        ? `Your allowance resets on ${allowanceResetDate}.`
        : "Your project allowance resets monthly."

  return (
    <AppPageShell contentClassName="max-w-[1180px]">
      <AppPageHeader
        eyebrow="Account"
        title="Billing"
        description="Manage your subscription and project allowance."
      />

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
            <p className="text-2xl font-extrabold tracking-tight">
              {subscription ? currentPlan?.name || projectAllowance.planName || "Active" : "Free"}
            </p>
            {subscription?.cancel_at_period_end && (
              <Badge variant="warning" className="mt-2">Cancels at period end</Badge>
            )}
            {currentPlanPrice && (
              <p className="mt-1 text-sm text-muted-foreground">
                {currentPlanPrice.label} billing
              </p>
            )}
            {canManageSubscription && <ManageSubscriptionButton />}
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
            <p className="text-2xl font-extrabold tracking-tight text-text-primary">
              {visibleProjectAllowance}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {projectAllowanceDetail}
            </p>
          </CardContent>
        </Card>
      </div>

      <BillingPlansClient
        plans={plans}
        subscription={subscription}
        canManageSubscription={canManageSubscription}
        initialBillingInterval={getInitialBillingInterval(plans, subscription)}
      />
    </AppPageShell>
  )
}

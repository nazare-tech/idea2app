"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState, type ComponentType } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { uiStylePresets } from "@/lib/ui-style-presets"
import { Bell, CreditCard, KeyRound, Lock, Shield, Settings, User } from "lucide-react"
import { SettingsMessage } from "@/components/settings/settings-message"
import { SettingsSectionCard } from "@/components/settings/settings-section-card"
import { useBillingPortal } from "@/hooks/use-billing-portal"
import { StackedTabNav, type StackedTabNavItem } from "@/components/layout/stacked-tab-nav"

type MessageState = { type: "success" | "error"; text: string }
type SettingsTab = "profile" | "settings" | "subscriptions"

interface SubscriptionRecord {
  plan_id: string | null
  status: string | null
  cancel_at_period_end: boolean | null
  current_period_end: string | null
}

interface TabConfig {
  value: SettingsTab
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}

const settingsTabs: TabConfig[] = [
  {
    value: "profile",
    label: "Profile",
    description: "Manage your account information",
    icon: User,
  },
  {
    value: "settings",
    label: "Settings",
    description: "Configure account preferences",
    icon: Settings,
  },
  {
    value: "subscriptions",
    label: "Subscriptions",
    description: "Manage plan and billing",
    icon: CreditCard,
  },
]

const Mail = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-mail h-3 w-3"
  >
    <rect width="20" height="16" x="2" y="4" rx="2" ry="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
)

export default function SettingsPage() {
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<MessageState | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<MessageState | null>(null)
  const [subscriptionMessage, setSubscriptionMessage] = useState<MessageState | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null)
  const [subscriptionPlanName, setSubscriptionPlanName] = useState("")
  const { loading: subscriptionLoading, openBillingPortal } = useBillingPortal()

  const searchParams = useSearchParams()

  const tabParam = searchParams.get("tab")
  const activeTab: SettingsTab =
    tabParam === "settings" || tabParam === "subscriptions" || tabParam === "profile"
      ? tabParam
      : "profile"
  const isInternalDevPlan = subscriptionPlanName.toLowerCase() === "internal dev"

  const getTabHref = (tab: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    return `/preferences?${params.toString()}`
  }

  const preferenceNavItems: StackedTabNavItem[] = settingsTabs.map((tab) => ({
    key: tab.value,
    label: tab.label,
    icon: tab.icon,
    href: getTabHref(tab.value),
  }))

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setEmail(user.email || "")

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      const { data: subscriptionRecord } = await supabase
        .from("subscriptions")
        .select("plan_id, status, cancel_at_period_end, current_period_end")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle()

      if (subscriptionRecord) {
        setSubscription(subscriptionRecord)

        if (subscriptionRecord.plan_id) {
          const { data: planData } = await supabase
            .from("plans")
            .select("name")
            .eq("id", subscriptionRecord.plan_id)
            .maybeSingle()

          if (planData?.name) {
            setSubscriptionPlanName(planData.name)
          }
        }
      }

      if (profile) {
        setFullName(profile.full_name || "")
        setUsername(profile.username || "")
      }

      setLoading(false)
    }

    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setProfileMessage(null)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        setProfileMessage({ type: "error", text: error.message })
      } else {
        setProfileMessage({ type: "success", text: "Profile updated successfully" })
      }
    } catch {
      setProfileMessage({ type: "error", text: "Failed to update profile" })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password must be at least 6 characters." })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match." })
      return
    }

    setPasswordSaving(true)
    setPasswordMessage(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setPasswordMessage({ type: "error", text: error.message })
      } else {
        setPasswordMessage({ type: "success", text: "Password changed successfully" })
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch {
      setPasswordMessage({ type: "error", text: "Failed to update password" })
    } finally {
      setPasswordSaving(false)
    }
  }

  const formatRenewalDate = (value: string | null) => {
    if (!value) return "Not set"

    return new Date(value).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white text-text-primary">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1440px] flex-col px-4 py-6 sm:px-8 lg:px-[56px] lg:py-8">
        <div className="grid min-h-[calc(100vh-4rem-3rem)] flex-1 items-stretch gap-6 lg:grid-cols-[280px_1fr]">
          <StackedTabNav
            items={preferenceNavItems}
            activeKey={activeTab}
            className="w-full self-stretch lg:w-[280px]"
          />

          <section className="space-y-5">
            {activeTab === "profile" && (
              <Card className={`${uiStylePresets.settingsSurface} overflow-hidden`}>
                {isInternalDevPlan && (
                  <div className="bg-[#FFF9E7] px-6 py-5">
                    <div className="ui-row-gap-3">
                      <div className={uiStylePresets.settingsIconBadge}>
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-[16px]">Developer Account</CardTitle>
                        <CardDescription>Internal project allowance enabled for testing and development.</CardDescription>
                      </div>
                    </div>
                  </div>
                )}

                <div className={isInternalDevPlan ? "border-t border-border-subtle" : undefined}>
                  <div className="space-y-4 px-6 py-5">
                    <div className="ui-row-gap-3">
                      <div className={uiStylePresets.settingsIconBadge}>
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-[16px]">Profile</CardTitle>
                        <CardDescription>Update your personal information</CardDescription>
                      </div>
                    </div>

                    {profileMessage && (
                      <SettingsMessage tone={profileMessage.type}>
                        {profileMessage.text}
                      </SettingsMessage>
                    )}

                    <div className="ui-stack-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="ui-row-gap-2">
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          disabled
                          className="opacity-60"
                        />
                        <Badge variant="outline" className="gap-1">
                          <Mail />
                          Verified
                        </Badge>
                      </div>
                    </div>

                    <div className="ui-stack-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                      />
                    </div>

                    <div className="ui-stack-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a username"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <>
                            <Spinner size="sm" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle px-6 py-5">
                    <div className="space-y-4">
                      <div className="ui-row-gap-3">
                        <div className={uiStylePresets.settingsIconBadge}>
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-[16px]">Change Password</CardTitle>
                          <CardDescription>Set a new password for your account</CardDescription>
                        </div>
                      </div>

                      {passwordMessage && (
                        <SettingsMessage tone={passwordMessage.type}>
                          {passwordMessage.text}
                        </SettingsMessage>
                      )}

                      <div className="ui-stack-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                        />
                      </div>

                      <div className="ui-stack-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat the new password"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handlePasswordChange} disabled={passwordSaving}>
                          {passwordSaving ? (
                            <>
                              <Spinner size="sm" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <KeyRound className="ui-icon-16" />
                              Change Password
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

          {activeTab === "settings" && (
            <SettingsSectionCard
              icon={Settings}
              title="Settings"
              description="Configure account and app behavior"
            >
                <div className="rounded-xl border border-border-subtle bg-white p-4 text-sm text-text-secondary">
                  Additional account-level settings and preferences can be added here.
                </div>
                <div className="rounded-xl border border-border-subtle bg-white p-4 space-y-3">
                  <div className="ui-row-gap-2 text-text-primary">
                    <Bell className="ui-icon-16" />
                    <span>Notifications</span>
                  </div>
                  <p className={uiStylePresets.mutedTextSm}>
                    Notification preferences are not yet configurable in this build.
                  </p>
                </div>
            </SettingsSectionCard>
          )}

          {activeTab === "subscriptions" && (
            <SettingsSectionCard
              icon={CreditCard}
              title="Manage Subscriptions"
              description="View and update your current plan"
            >
                {subscriptionMessage && (
                  <SettingsMessage tone={subscriptionMessage.type}>
                    {subscriptionMessage.text}
                  </SettingsMessage>
                )}

                {subscription ? (
                  <div className={uiStylePresets.settingsInfoCard}>
                    <div>
                      <p className={uiStylePresets.mutedTextSm}>Current plan</p>
                      <p className="text-lg font-bold">
                        {subscriptionPlanName || subscription.plan_id || "Active subscription"}
                      </p>
                    </div>
                    <div className="ui-stack-2 text-sm">
                      <p>
                        <span className={uiStylePresets.mutedTextSimple}>Status:</span> {subscription.status || "active"}
                      </p>
                      {subscription.cancel_at_period_end && (
                        <p className="text-[#ff3b30]">Cancels at period end</p>
                      )}
                      <p>
                        <span className={uiStylePresets.mutedTextSimple}>Next renewal:</span> {" "}
                        {formatRenewalDate(subscription.current_period_end)}
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        setSubscriptionMessage(null)
                        const result = await openBillingPortal()
                        if (!result.ok && result.error) {
                          setSubscriptionMessage({ type: "error", text: result.error })
                        }
                      }}
                      disabled={subscriptionLoading}
                    >
                      {subscriptionLoading ? (
                        <>
                          <Spinner size="sm" />
                          Opening Billing Portal...
                        </>
                      ) : (
                        "Open Billing Portal"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className={uiStylePresets.settingsInfoCard}>
                    <p className={uiStylePresets.mutedTextSm}>
                      No active subscription found. You currently appear to be on the free tier.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link href="/billing" className="inline-flex">
                        <Button variant="outline" className="border-border-subtle text-text-primary">
                          View Plans
                        </Button>
                      </Link>
                      <Button
                        onClick={async () => {
                          setSubscriptionMessage(null)
                          const result = await openBillingPortal()
                          if (!result.ok && result.error) {
                            setSubscriptionMessage({ type: "error", text: result.error })
                          }
                        }}
                        variant="secondary"
                        disabled={subscriptionLoading}
                      >
                        {subscriptionLoading ? (
                          <>
                            <Spinner size="sm" />
                            Opening Billing Portal...
                          </>
                        ) : (
                          "Manage in Billing Portal"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
            </SettingsSectionCard>
          )}
          </section>
        </div>
      </main>
    </div>
  )
}

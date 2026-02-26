"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState, type ComponentType } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Bell, CreditCard, KeyRound, Lock, Shield, Settings, User } from "lucide-react"

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
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<MessageState | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<MessageState | null>(null)
  const [subscriptionMessage, setSubscriptionMessage] = useState<MessageState | null>(null)
  const [isDev, setIsDev] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null)
  const [subscriptionPlanName, setSubscriptionPlanName] = useState("")

  const searchParams = useSearchParams()

  const tabParam = searchParams.get("tab")
  const activeTab: SettingsTab =
    tabParam === "settings" || tabParam === "subscriptions" || tabParam === "profile"
      ? tabParam
      : "profile"

  const getTabHref = (tab: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    return `/settings?${params.toString()}`
  }

  const renderMessage = (message: MessageState | null) => {
    if (!message) return null

    return (
      <div
        className={`p-3 rounded-xl text-sm border ${
          message.type === "success"
            ? "bg-[rgba(52,211,153,0.08)] border-[rgba(52,211,153,0.2)] text-emerald-400"
            : "bg-[rgba(255,59,92,0.08)] border-[rgba(255,59,92,0.2)] text-[#ff6b8a]"
        }`}
      >
        {message.text}
      </div>
    )
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setEmail(user.email || "")
      setIsDev(user.email === "nazarework@gmail.com")

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

  const handleManageSubscription = async () => {
    setSubscriptionLoading(true)
    setSubscriptionMessage(null)

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      })
      const data = await response.json()

      if (data?.url) {
        window.location.href = data.url
        return
      }

      setSubscriptionMessage({ type: "error", text: data?.error || "Unable to open billing portal." })
    } catch {
      setSubscriptionMessage({ type: "error", text: "Unable to open billing portal." })
    } finally {
      setSubscriptionLoading(false)
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
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value

            return (
              <Link
                key={tab.value}
                href={getTabHref(tab.value)}
                className={`group flex flex-col gap-0.5 rounded-xl border px-3 py-3 transition ${
                  isActive
                    ? "border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.08)] text-[#00d4ff]"
                    : "border-transparent text-muted-foreground hover:border-[rgba(255,255,255,0.08)] hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground">{tab.description}</span>
              </Link>
            )
          })}
        </div>

        <div className="space-y-6">
          {activeTab === "profile" && (
            <>
              {isDev && (
                <Card className="border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.05)] shadow-[0_0_20px_rgba(251,191,36,0.08)]">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <CardTitle className="text-amber-400">Developer Account</CardTitle>
                        <CardDescription>Unlimited credits enabled for testing and development.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00d4ff]/20 to-[#7c3aed]/20 border border-[rgba(0,212,255,0.15)] flex items-center justify-center">
                      <User className="h-5 w-5 text-[#00d4ff]" />
                    </div>
                    <div>
                      <CardTitle>Profile</CardTitle>
                      <CardDescription>Update your personal information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderMessage(profileMessage)}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center gap-2">
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

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="space-y-2">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7c3aed]/20 to-[#00d4ff]/20 border border-[rgba(124,58,237,0.15)] flex items-center justify-center">
                      <Lock className="h-5 w-5 text-[#7c3aed]" />
                    </div>
                    <div>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>Set a new password for your account</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderMessage(passwordMessage)}

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>

                  <div className="space-y-2">
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
                          <KeyRound className="h-4 w-4" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "settings" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00d4ff]/20 to-[#7c3aed]/20 border border-[rgba(0,212,255,0.15)] flex items-center justify-center">
                    <Settings className="h-5 w-5 text-[#00d4ff]" />
                  </div>
                  <div>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>Configure account and app behavior</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-dashed border-[rgba(255,255,255,0.15)] p-4 text-sm text-muted-foreground">
                  Additional account-level settings and preferences can be added here.
                </div>
                <div className="rounded-xl border border-dashed border-[rgba(0,212,255,0.2)] p-4 space-y-3">
                  <div className="flex items-center gap-2 text-foreground">
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Notification preferences are not yet configurable in this build.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "subscriptions" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7c3aed]/20 to-[#00d4ff]/20 border border-[rgba(124,58,237,0.15)] flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-[#a78bfa]" />
                  </div>
                  <div>
                    <CardTitle>Manage Subscriptions</CardTitle>
                    <CardDescription>View and update your current plan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderMessage(subscriptionMessage)}

                {subscription ? (
                  <div className="space-y-4 rounded-xl border border-[rgba(255,255,255,0.08)] p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current plan</p>
                      <p className="text-lg font-bold">
                        {subscriptionPlanName || subscription.plan_id || "Active subscription"}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-muted-foreground">Status:</span> {subscription.status || "active"}
                      </p>
                      {subscription.cancel_at_period_end && (
                        <p className="text-[#ffb020]">Cancels at period end</p>
                      )}
                      <p>
                        <span className="text-muted-foreground">Next renewal:</span> {" "}
                        {formatRenewalDate(subscription.current_period_end)}
                      </p>
                    </div>
                    <Button onClick={handleManageSubscription} disabled={subscriptionLoading}>
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
                  <div className="space-y-4 rounded-xl border border-[rgba(255,255,255,0.08)] p-4">
                    <p className="text-sm text-muted-foreground">
                      No active subscription found. You currently appear to be on the free tier.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link href="/billing" className="inline-flex">
                        <Button variant="outline">View Plans</Button>
                      </Link>
                      <Button
                        onClick={handleManageSubscription}
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

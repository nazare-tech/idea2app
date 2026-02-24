"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { User, Mail, Shield } from "lucide-react"

export default function SettingsPage() {
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isDev, setIsDev] = useState(false)

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
    setMessage(null)

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
        setMessage({ type: "error", text: error.message })
      } else {
        setMessage({ type: "success", text: "Profile updated successfully" })
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update profile" })
    } finally {
      setSaving(false)
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
    <div className="max-w-2xl mx-auto px-8 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {isDev && (
        <Card className="border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.05)] shadow-[0_0_20px_rgba(251,191,36,0.08)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-amber-400">Developer Account</CardTitle>
                <CardDescription>
                  Unlimited credits enabled for testing and development.
                </CardDescription>
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
          {message && (
            <div
              className={`p-3 rounded-xl text-sm border ${
                message.type === "success"
                  ? "bg-[rgba(52,211,153,0.08)] border-[rgba(52,211,153,0.2)] text-emerald-400"
                  : "bg-[rgba(255,59,92,0.08)] border-[rgba(255,59,92,0.2)] text-[#ff6b8a]"
              }`}
            >
              {message.text}
            </div>
          )}

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
              <Badge variant="outline">
                <Mail className="h-3 w-3 mr-1" />
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
    </div>
  )
}

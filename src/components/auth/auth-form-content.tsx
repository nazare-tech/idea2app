"use client"

import Image from "next/image"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Check } from "lucide-react"
import { uiStylePresets } from "@/lib/ui-style-presets"
import { AuthField } from "@/components/auth/auth-field"
import { AuthPasswordField } from "@/components/auth/auth-password-field"
import { sanitizeInternalRedirect } from "@/lib/safe-redirect"

export type AuthMode = "signin" | "signup"

const modeLabels: Record<
  AuthMode,
  {
    title: string
    subtitle: string
    submit: string
    loading: string
    alternateLine: string
    alternateAction: string
  }
> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to continue to Maker Compass.",
    submit: "Sign in",
    loading: "Signing in...",
    alternateLine: "Don't have an account?",
    alternateAction: "Create account",
  },
  signup: {
    title: "Create account",
    subtitle: "Join Maker Compass and start building.",
    submit: "Create account",
    loading: "Creating account...",
    alternateLine: "Already have an account?",
    alternateAction: "Sign in",
  },
}

interface AuthFormContentProps {
  initialMode: AuthMode
  redirectTo?: string
  /**
   * Called after a successful credential sign-in.
   * Caller is responsible for navigation and router.refresh()
   * so server components re-read the updated session.
   */
  onSuccess: () => void
  onModeChange?: (mode: AuthMode) => void
}

export function AuthFormContent({
  initialMode,
  redirectTo = "/projects",
  onSuccess,
  onModeChange,
}: AuthFormContentProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const copy = modeLabels[mode]
  const safeRedirectTo = sanitizeInternalRedirect(redirectTo)

  const buildCallbackUrl = () => {
    const callbackUrl = new URL("/callback", window.location.origin)
    callbackUrl.searchParams.set("next", safeRedirectTo)
    return callbackUrl.toString()
  }

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError(null)
    onModeChange?.(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)

    // Client-side validation before loading state
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); return }
        onSuccess()
        return
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: buildCallbackUrl(),
        },
      })

      if (error) { setError(error.message); return }
      setSuccess(true)
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildCallbackUrl(),
        },
      })
      if (error) setError(error.message)
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
          <Check className="h-6 w-6 text-success" />
        </div>
        <p className="text-xl font-semibold">Check your email</p>
        <p className="mt-2 ui-text-sm-muted">
          We&apos;ve sent a confirmation link to <strong>{email}</strong>.
          Open it to verify your account.
        </p>
        <button
          type="button"
          onClick={() => { setSuccess(false); switchMode("signin") }}
          className={`mt-4 ${uiStylePresets.authLinkUnderline}`}
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <CardHeader className="ui-stack-2 ui-px-8 pt-8">
        <CardTitle className="text-2xl tracking-[-0.02em]">{copy.title}</CardTitle>
        <p className="ui-text-sm-muted">{copy.subtitle}</p>
      </CardHeader>

      <div className="ui-px-8">
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className={uiStylePresets.authSocialButton}
        >
          <Image src="/google-logo.svg" alt="Google" width={16} height={16} className="h-4 w-4" />
          Continue with Google
        </button>

        <div className="mt-5 flex items-center gap-4 text-xs text-text-secondary">
          <span className={uiStylePresets.authDividerLine} />
          <span>OR</span>
          <span className={uiStylePresets.authDividerLine} />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 ui-px-8 pt-3">
          {error && <p className={uiStylePresets.authErrorPill}>{error}</p>}

          {mode === "signup" && (
            <AuthField
              id="fullName"
              label="Full name"
              placeholder="John Doe"
              value={fullName}
              onChange={setFullName}
              disabled={loading}
            />
          )}

          <AuthField
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
            disabled={loading}
          />

          <AuthPasswordField
            id="password"
            label="Password"
            placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
            value={password}
            onChange={setPassword}
            minLength={6}
            disabled={loading}
          />

          {mode === "signup" && (
            <AuthPasswordField
              id="confirmPassword"
              label="Confirm password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              minLength={6}
              disabled={loading}
            />
          )}

          <Button
            type="submit"
            className={uiStylePresets.authDestructiveButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                {copy.loading}
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </CardContent>
      </form>

      <CardFooter className="ui-px-8 pb-8 pt-2">
        <p className="w-full text-center ui-text-sm-muted">
          {copy.alternateLine}{" "}
          <button
            type="button"
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className={uiStylePresets.authLinkUnderline}
          >
            {copy.alternateAction}
          </button>
        </p>
      </CardFooter>
    </div>
  )
}

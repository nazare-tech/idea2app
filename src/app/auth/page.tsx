"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Check, Eye, EyeOff, Lightbulb } from "lucide-react"
import { uiStylePresets } from "@/lib/ui-style-presets"

type AuthMode = "signin" | "signup"

const modeLabels: Record<
  AuthMode,
  {
    title: string
    subtitle: string
    submit: string
    loading: string
    alternateLine: string
    alternateAction: string
    alternateHref: string
  }
> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to continue to Idea2App.",
    submit: "Sign in",
    loading: "Signing in...",
    alternateLine: "Don’t have an account?",
    alternateAction: "Create account",
    alternateHref: "/auth?mode=signup",
  },
  signup: {
    title: "Create account",
    subtitle: "Join Idea2App and start building.",
    submit: "Create account",
    loading: "Creating account...",
    alternateLine: "Already have an account?",
    alternateAction: "Sign in",
    alternateHref: "/auth?mode=signin",
  },
}

function AuthScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirect = searchParams.get("redirect") || "/dashboard"
  const queryError = searchParams.get("error")
  const queryMessage = searchParams.get("message")

  const defaultMode = useMemo<AuthMode>(() => {
    const rawMode = searchParams.get("mode")
    return rawMode === "signup" ? "signup" : "signin"
  }, [searchParams])

  const mode = defaultMode
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(queryError || queryMessage)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const copy = modeLabels[mode]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
          return
        }

        router.push(redirect)
        router.refresh()
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/callback?next=${redirect}`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

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
          redirectTo: `${window.location.origin}/callback?next=${redirect}`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <section className="flex min-h-screen w-full flex-col">
          <AuthHeader />
          <main className="flex min-h-screen w-full items-center justify-center px-6">
            <Card className={`${uiStylePresets.authCardCompact} p-8 text-center`}>
              <CardHeader>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <CardTitle className="text-2xl">Check your email</CardTitle>
                <p className="ui-text-sm-muted">
                  We&apos;ve sent a confirmation link to <strong>{email}</strong>.
                  Open it to verify your account.
                </p>
              </CardHeader>
              <CardFooter className="pb-2 pt-2">
                <Link
                  href={`/auth?mode=signin&redirect=${encodeURIComponent(redirect)}`}
                  className={uiStylePresets.authLinkUnderline}
                >
                  Continue to sign in
                </Link>
              </CardFooter>
            </Card>
          </main>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="flex min-h-screen w-full flex-col">
        <main className="flex min-h-screen w-full overflow-hidden lg:flex-row-reverse">
          <aside className="hidden h-screen w-full max-w-[560px] bg-sidebar-bg px-14 py-14 text-sidebar-foreground lg:flex">
            <div className="flex h-full flex-col justify-between">
              <div>
                <h1 className="text-5xl ui-font-semibold leading-tight tracking-[-0.06em]">
                  Ship your next product faster.
                </h1>
                <p className="mt-6 max-w-sm text-sm leading-relaxed text-gray-400">
                  Create your Idea2App account to manage prompts, builds, and releases from
                  one workspace.
                </p>
              </div>
              <p className={uiStylePresets.authFormMeta}>Trusted by 3,000+ teams</p>
            </div>
          </aside>

          <div className="flex w-full flex-1">
            <div className="w-full lg:h-full lg:flex lg:flex-col">
              <header className="h-[104px] w-full ui-px-6 py-5">
                <Link href="/" className="inline-flex h-full items-center gap-3">
                  <div className={uiStylePresets.authIconCircle}>
                    <Lightbulb className="ui-icon-16" />
                  </div>
                  <span className="text-lg ui-font-semibold tracking-[0.05em]">Idea2App</span>
                </Link>
              </header>

              <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
                <Card className={uiStylePresets.authCardContainer}>
                  <CardHeader className="ui-stack-2 ui-px-8 pt-8">
                    <CardTitle className="text-3xl tracking-[-0.02em]">{copy.title}</CardTitle>
                    <p className="ui-text-sm-muted">{copy.subtitle}</p>
                  </CardHeader>

                  <div className="ui-px-8">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={loading}
                      className={uiStylePresets.authSocialButton}
                    >
                      <img src="/google-logo.svg" alt="Google" className="h-4 w-4" />
                      Continue with Google
                    </button>

                    <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className={uiStylePresets.authDividerLine} />
                      <span>OR</span>
                      <span className={uiStylePresets.authDividerLine} />
                    </div>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-5 ui-px-8 pt-3">
                      {error && <p className={uiStylePresets.authErrorPill}>{error}</p>}

                      {mode === "signup" && (
                        <FormField
                          id="fullName"
                          label="Full name"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={setFullName}
                          disabled={loading}
                        />
                      )}

                      <FormField
                        id="email"
                        type="email"
                        label="Email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={setEmail}
                        disabled={loading}
                      />

                      <PasswordField
                        id="password"
                        label="Password"
                        placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
                        value={password}
                        onChange={setPassword}
                        minLength={6}
                        disabled={loading}
                        showPassword={showPassword}
                        onToggleShow={() => setShowPassword((prev) => !prev)}
                      />

                      {mode === "signup" && (
                        <PasswordField
                          id="confirmPassword"
                          label="Confirm password"
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          minLength={6}
                          disabled={loading}
                          showPassword={showConfirmPassword}
                          onToggleShow={() => setShowConfirmPassword((prev) => !prev)}
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
                      <Link href={copy.alternateHref} className={uiStylePresets.authLinkUnderline}>
                        {copy.alternateAction}
                      </Link>
                    </p>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </section>
    </div>
  )
}

function AuthHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between ui-px-4 md:px-8 lg:px-12 xl:px-16">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Lightbulb className="ui-icon-16" />
          </div>
          <span className="text-base ui-font-semibold tracking-[0.05em]">Idea2App</span>
        </Link>
      </div>
    </header>
  )
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled,
  minLength,
  showPassword,
  onToggleShow,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  minLength?: number
  showPassword: boolean
  onToggleShow: () => void
}) {
  return (
    <div className="ui-stack-2">
      <Label htmlFor={id} className={uiStylePresets.authFieldLabel}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          disabled={disabled}
          minLength={minLength}
          className={uiStylePresets.authFieldInput}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function FormField({
  id,
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  disabled,
  minLength,
}: {
  id: string
  type?: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  minLength?: number
}) {
  return (
    <div className="ui-stack-2">
      <Label htmlFor={id} className={uiStylePresets.authFieldLabel}>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        disabled={disabled}
        minLength={minLength}
        className={uiStylePresets.authFieldInput}
      />
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Spinner size="lg" />
        </div>
      }
    >
      <AuthScreen />
    </Suspense>
  )
}

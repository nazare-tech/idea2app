"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ArrowRight, Lightbulb, Eye, EyeOff } from "lucide-react"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/dashboard"
  const queryError = searchParams.get("error")
  const queryMessage = searchParams.get("message")
  const [error, setError] = useState<string | null>(queryError || queryMessage)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
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
    } catch {
      setError("An unexpected error occurred")
      } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // Placeholder for future Google OAuth wiring.
    return
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 pb-6 md:px-8 lg:px-12 xl:px-16">
        <AuthHeader />
        <main className="flex flex-1 items-center gap-8 rounded-xl border border-border bg-white lg:flex-row lg:justify-center lg:rounded-none lg:border-0 lg:bg-transparent">
          <aside className="hidden min-h-[620px] w-full max-w-[520px] bg-foreground px-12 py-14 text-background lg:block">
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">
                  PRODUCTIVITY PLATFORM
                </p>
                <h1 className="mt-6 max-w-sm text-5xl font-semibold leading-tight tracking-[-0.06em]">
                  Build and ship faster.
                </h1>
              </div>
              <p className="text-sm leading-relaxed text-gray-400">
                Collaborate with your team, run AI analyses, and launch production-ready
                ideas from one workspace.
              </p>
            </div>
          </aside>

          <div className="flex w-full justify-center px-0 py-8 md:px-4 lg:px-12">
            <Card className="w-full max-w-[460px] border-[#E0E0E0] bg-card">
              <CardHeader className="space-y-2 px-8 pt-8">
                <CardTitle className="text-4xl tracking-[-0.02em]">Welcome back</CardTitle>
                <CardDescription>Sign in to continue to Idea2App.</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-5 px-8 pt-3">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-[#E0E0E0]" />
                    <span>OR</span>
                    <span className="h-px flex-1 bg-[#E0E0E0]" />
                  </div>

                  {error && (
                    <p className="rounded-lg border border-[#FDECEA] bg-[#FDECEA] px-3 py-2 text-sm text-[#B42318]">
                      {error}
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[13px] text-muted-foreground">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      autoFocus
                      className="h-12 bg-[#FFFFFF] border-[#E0E0E0] text-[#0A0A0A] placeholder:text-[#999999] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-[13px] text-muted-foreground">
                        Password
                      </Label>
                      <Link
                        href="/forgot-password"
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Forgot?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-12 bg-[#FFFFFF] border-[#E0E0E0] text-[#0A0A0A] placeholder:text-[#999999] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-3 my-auto flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full bg-[#0A0A0A] text-white hover:bg-[#0A0A0A]/90"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" />
                        Signing in...
                      </>
                    ) : (
                      "Log in"
                    )}
                  </Button>
                </CardContent>
              </form>

              <CardFooter className="px-8 pb-8 pt-2">
                <p className="w-full text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-semibold text-primary hover:underline">
                    Create account
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </div>
        </main>
      </section>
    </div>
  )
}

function AuthHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 md:px-8 lg:px-12 xl:px-16">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Lightbulb className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold tracking-[0.05em]">Idea2App</span>
        </Link>
      </div>
    </header>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

"use client"

import { Suspense, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { uiStylePresets } from "@/lib/ui-style-presets"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { AuthFormContent, type AuthMode } from "@/components/auth/auth-form-content"
import { getSafeAuthRedirect } from "@/lib/safe-redirect"

function AuthScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirect = getSafeAuthRedirect(searchParams)
  const queryError = searchParams.get("error")
  const queryMessage = searchParams.get("message")

  const defaultMode = useMemo<AuthMode>(() => {
    const rawMode = searchParams.get("mode")
    return rawMode === "signup" ? "signup" : "signin"
  }, [searchParams])

  const externalError = queryError || queryMessage || null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="flex min-h-screen w-full flex-col">
        <main className="flex min-h-screen w-full overflow-y-auto lg:flex-row-reverse lg:overflow-hidden">
          <aside className="hidden h-screen w-full max-w-[560px] bg-sidebar-bg px-14 py-14 text-sidebar-foreground lg:flex">
            <div className="flex h-full flex-col justify-between">
              <div>
                <h1 className="text-5xl ui-font-semibold leading-tight tracking-[-0.06em]">
                  Ship your next product faster.
                </h1>
                <p className="mt-6 max-w-sm text-sm leading-relaxed text-gray-400">
                  Create your Maker Compass account to manage prompts, builds, and releases from
                  one workspace.
                </p>
              </div>
              <p className={uiStylePresets.authFormMeta}>Trusted by 3,000+ teams</p>
            </div>
          </aside>

          <div className="flex w-full flex-1">
            <div className="w-full lg:h-full lg:flex lg:flex-col">
              <header className="h-[88px] w-full ui-px-6 py-5 sm:h-[104px]">
                <BrandWordmark
                  className="h-full"
                  logoClassName={uiStylePresets.authIconCircle}
                  labelClassName="text-lg"
                />
              </header>

              <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4 pb-8 sm:px-6">
                {externalError && (
                  <p className={uiStylePresets.authErrorPill}>{externalError}</p>
                )}
                <Card className={uiStylePresets.authCardContainer}>
                  <AuthFormContent
                    initialMode={defaultMode}
                    redirectTo={redirect}
                    onSuccess={() => {
                      router.push(redirect)
                      router.refresh()
                    }}
                    onModeChange={(mode) => {
                      router.replace(`/auth?mode=${mode}&redirect=${encodeURIComponent(redirect)}`, { scroll: false })
                    }}
                  />
                </Card>
              </div>
            </div>
          </div>
        </main>
      </section>
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

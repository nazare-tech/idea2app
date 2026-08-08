import type { ReactNode } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { unstable_cache } from "next/cache"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LandingIdeaCapture } from "@/components/landing/landing-idea-capture"
import { WaitlistForm } from "@/components/landing/waitlist-form"
import { createServiceClient } from "@/lib/supabase/service"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { isWaitlistMode } from "@/lib/waitlist"
import { ArrowRight } from "@/components/icons/brand-icons"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { AuthModal } from "@/components/auth/auth-modal"
import { HeroBuildMap } from "@/components/landing/hero-build-map"
import { HeroDotField } from "@/components/landing/hero-dot-field"
import { TestimonialBand } from "@/components/landing/testimonial-band"
import { ToolLogoMarquee } from "@/components/landing/tool-logo-marquee"
import { FeatureScrollytelling } from "@/components/landing/feature-scrollytelling"
import { PricingSection } from "@/components/landing/pricing-section"
import { FaqSection } from "@/components/landing/faq-section"
import { CompassMark } from "@/components/landing/compass-mark"
import { SiteFooter } from "@/components/landing/site-footer"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

const handoffTools = [
  { name: "Cursor", src: "/logos/cursor.svg" },
  { name: "Claude Code", src: "/logos/claudecode.svg" },
  { name: "Codex", src: "/logos/openai.png" },
  { name: "GitHub Copilot", src: "/logos/githubcopilot.svg" },
  { name: "Windsurf", src: "/logos/windsurf.svg" },
  { name: "Cline", src: "/logos/cline.svg" },
  { name: "Zed", src: "/logos/zedindustries.svg" },
  { name: "Warp", src: "/logos/warp.svg" },
  { name: "Devin", src: "/logos/devin.png" },
  { name: "Lovable", src: "/logos/lovable.svg" },
  { name: "v0", src: "/logos/v0.svg" },
  { name: "Bolt", src: "/logos/bolt.png" },
  { name: "Replit", src: "/logos/replit.svg" },
  { name: "Sourcegraph", src: "/logos/sourcegraph.png" },
  { name: "Tabnine", src: "/logos/tabnine.png" },
  { name: "Gemini", src: "/logos/googlegemini.svg" },
  { name: "JetBrains", src: "/logos/jetbrains.svg" },
]

const container = "mx-auto w-full max-w-[1320px] px-4 sm:px-8 lg:px-14"

function SectionCard({ children, dotSeed }: { children: ReactNode; dotSeed: number }) {
  return (
    <section className="relative isolate py-8 md:py-10">
      <HeroDotField seed={dotSeed} />
      <div className={`${container} relative z-10`}>{children}</div>
    </section>
  )
}

/**
 * Fetches the current registered user count from the profiles table.
 *
 * Cached for 60s so the highest-traffic page skips a per-request DB round
 * trip; waitlist gating already fails open, so brief staleness is fine.
 */
const getUserCount = unstable_cache(
  async (): Promise<number> => {
    try {
      const supabase = createServiceClient()
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
      if (error) return 0
      return count ?? 0
    } catch {
      return 0
    }
  },
  ["landing-user-count"],
  { revalidate: 60 }
)

async function getIsAuthenticated(): Promise<boolean> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return Boolean(user)
  } catch {
    return false
  }
}

export default async function LandingPage() {
  const [userCount, isAuthenticated] = await Promise.all([
    getUserCount(),
    getIsAuthenticated(),
  ])
  if (isAuthenticated) {
    redirect("/projects")
  }

  const waitlistMode = isWaitlistMode(userCount)

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div>
        <header className="sticky top-0 z-50 border-b border-border-subtle bg-white/95 backdrop-blur-sm">
        {/* Landing-only header inset: content aligns with the 1320px box edges
            (1368 - 2x24 padding = 1320), wider than the hero text container.
            The dashboard header is a separate component and keeps its padding. */}
        <div className="mx-auto flex min-h-16 w-full max-w-[1368px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 md:flex-nowrap md:py-0">
          <BrandWordmark href="/" logoSize={36} logoClassName="rounded-sm" labelClassName="text-lg font-semibold tracking-[0.01em]" />

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) => (
              <a key={item.label} href={item.href} className="text-sm font-medium text-text-primary hover:text-text-secondary">
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Sign In is always visible — existing users still need to log in */}
            <Link href="/?modal=auth&mode=signin" scroll={false}>
              <Button variant="outline" className="h-10 px-4 rounded-md border-border-subtle bg-white text-text-primary sm:h-11 sm:px-6">
                Sign In
              </Button>
            </Link>

            {waitlistMode ? (
              <a href="#waitlist">
                <Button className="h-10 px-4 rounded-md bg-primary text-primary-foreground sm:h-11 sm:px-6">Join Waitlist</Button>
              </a>
            ) : (
              <Link href="/?modal=auth&mode=signup" scroll={false}>
                <Button className="h-10 px-4 rounded-md bg-primary text-primary-foreground sm:h-11 sm:px-6">Get Started</Button>
              </Link>
            )}
          </div>
        </div>
        </header>

      <section className="relative isolate overflow-clip">
        <HeroDotField seed={633} />
        {/* No min-h: the build map below sizes itself, so the hero copy sits at
            its natural height instead of reserving a band for the artwork. */}
        <div
          className={`${container} relative z-10 flex flex-col items-center justify-start`}
          // Design clamps rather than breakpoint steps: the top pad tracks
          // viewport height, so short laptop screens keep more of the build map
          // above the fold.
          style={{ paddingTop: "clamp(48px, 7svh, 92px)", paddingBottom: "clamp(24px, 3vw, 40px)" }}
        >
          <h1 data-dot-field-protect className="hero-enter-fade font-display mx-auto flex max-w-[980px] flex-col gap-1 text-center text-[2.75rem] font-semibold leading-[1.005] tracking-[-0.064em] text-text-primary sm:text-[3.5rem] lg:text-[4.25rem]">
            <span>Build your startup idea</span>
            <span>
              this weekend, not <span className="italic text-primary">someday.</span>
            </span>
          </h1>

          <p data-dot-field-protect className="hero-enter-fade mx-auto mt-6 max-w-[698px] text-center text-base font-light leading-[1.3] text-text-secondary [animation-delay:120ms] sm:text-[20px]">
            Get market research, a PRD, design mockups, and comprehensive prompts to convert your ideas into a
            working app in minutes.
          </p>

          <div className="hero-enter-up mt-10 flex w-full justify-center [animation-delay:240ms] lg:mt-14">
            {/* Protect marker width matches the widest CTA variant (652px idea box) */}
            <div data-dot-field-protect className="flex w-full max-w-[652px] justify-center">
              {waitlistMode ? <WaitlistForm showSecondary /> : <LandingIdeaCapture isAuthenticated={isAuthenticated} />}
            </div>
          </div>

          {waitlistMode && (
            <p className="mx-auto mt-5 max-w-[520px] text-center text-sm leading-6 text-text-secondary">
              Early access is full. Leave your email for the next batch.
            </p>
          )}
        </div>

        {/* Build map closing the hero: one idea in, four artifacts and a prompt
            out. `hero-reel-arc.tsx` is the previous artwork, kept unreferenced
            on disk so it can be restored without recovering its assets. */}
        <div className="relative z-10">
          <HeroBuildMap />
        </div>
      </section>

      {/* Trust bar: what Maker Compass hands off to, since there's no customer logo wall yet */}
      <SectionCard dotSeed={967}>
        <section aria-label="Where Maker Compass hands off" className="py-3 text-center">
          <p className="mx-auto max-w-[620px] text-[15px] leading-[1.25] text-text-secondary">
            High quality prompts that you can use with your favorite AI coding tool.
          </p>
          <ToolLogoMarquee tools={handoffTools} />
        </section>
      </SectionCard>

      {/* Feature walkthrough: sticky card stage + pinned copy, scroll-driven.
          Owns its own <section id="features"> and the fixed compass rail. */}
      <FeatureScrollytelling />

      <SectionCard dotSeed={1499}>
        <TestimonialBand />
      </SectionCard>

      <SectionCard dotSeed={2039}>
        <PricingSection waitlistMode={waitlistMode} />
      </SectionCard>

      <SectionCard dotSeed={2609}>
        <FaqSection />
      </SectionCard>

      {/* Bottom CTA */}
      <section className="relative isolate border-t border-border-subtle py-16 md:py-20">
        <HeroDotField seed={3181} />
        <div className={`${container} relative z-10 text-center`}>
          <CompassMark />
          <h2 className="mx-auto max-w-[860px] text-[2rem] leading-[0.96] tracking-[-0.06em] font-semibold sm:text-[3rem] lg:text-[4rem]">
            {waitlistMode ? "Secure your spot before it fills up." : "Turn your next idea into a build plan."}
          </h2>
          <p className="mx-auto mt-6 max-w-[760px] text-xl text-text-secondary">
            {waitlistMode
              ? "Join the waitlist and be first to know when the next batch of spots opens."
              : "Get early access and turn your next idea into research, plans, and mockups you can actually execute."}
          </p>
          {!waitlistMode && (
            <p className="mx-auto mt-4 max-w-[640px] font-mono text-[0.75rem] font-medium uppercase tracking-[0.18em] text-text-muted">
              One intake. Four planning artifacts. Three mockup directions.
            </p>
          )}
          <div className="mt-8 flex justify-center">
            {waitlistMode ? (
              <WaitlistForm />
            ) : (
              <Link href="/?modal=auth&mode=signup" scroll={false} className="inline-block">
                <Button className="h-14 px-8 rounded-md text-base font-semibold bg-primary text-white">
                  Turn my idea into a plan
                  <ArrowRight className="ml-2 ui-icon-16" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="relative isolate">
        <HeroDotField seed={3761} />
        <div className="relative z-10">
          <SiteFooter />
        </div>
      </div>

        <Suspense>
          <AuthModal />
        </Suspense>
      </div>
    </div>
  )
}

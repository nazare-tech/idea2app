import type { ReactNode } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { InspirationProjectsSection } from "@/components/projects/inspiration-projects-section"
import { LandingIdeaCapture } from "@/components/landing/landing-idea-capture"
import { WaitlistForm } from "@/components/landing/waitlist-form"
import { uiStylePresets } from "@/lib/ui-style-presets"
import { PRICING_CARD_TOKENS, TOKEN_VALUE_CENTS, estimateFullReportTokens } from "@/lib/token-economics"
import { formatPrice } from "@/lib/utils"
import { createServiceClient } from "@/lib/supabase/service"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { isWaitlistMode, WAITLIST_LIMIT } from "@/lib/waitlist"
import { ArrowRight, CloudUpload, GitBranch, ListChecks, Rocket, ScanSearch, FileText } from "lucide-react"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { AuthModal } from "@/components/auth/auth-modal"
import { BuildMap } from "@/components/landing/build-map"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
]

const featureCards = [
  {
    icon: ScanSearch,
    title: "Research, Fast",
    description: "Get competitor context and market signals quickly so you can make sharper product decisions.",
  },
  {
    icon: FileText,
    title: "MVP Plan + PRD",
    description: "Turn rough ideas into actionable docs with priorities, acceptance criteria, and clear scope.",
  },
  {
    icon: Rocket,
    title: "Actionable Mockups",
    description: "Generate real UI directions you can compare, discuss, and iterate before writing production code.",
  },
  {
    icon: GitBranch,
    title: "Technical Blueprint",
    description: "Map architecture, data flow, and implementation tradeoffs before committing engineering time.",
  },
  {
    icon: ListChecks,
    title: "Execution Checklist",
    description: "Break work into clear milestones so your team knows exactly what to build next.",
  },
  {
    icon: CloudUpload,
    title: "Ship When Ready",
    description: "Move from planning to launch in one workspace instead of jumping between disconnected tools.",
  },
]

const steps = [
  {
    number: "01",
    body: "Describe what you want to build\nShare your idea, target users, and constraints in plain language.",
  },
  {
    number: "02",
    body: "Generate research + product direction\nGet focused analysis, key assumptions, and where your idea can stand out.",
  },
  {
    number: "03",
    body: "Create your MVP plan + mockups\nProduce actionable docs and compare design directions before implementation.",
  },
  {
    number: "04",
    body: "Build and iterate\nShip faster with a clear plan, then refine with feedback as you learn from users.",
  },
]

const tokenUsdLabel = formatPrice(TOKEN_VALUE_CENTS)
const fullReportTokensFast = estimateFullReportTokens("openai/gpt-5.4-mini")
const fullReportTokensBalanced = estimateFullReportTokens("anthropic/claude-sonnet-4-6")
const fullReportTokensThinking = estimateFullReportTokens("google/gemini-3.1-pro-preview")

const plans = [
  {
    name: "Free",
    price: "$0/mo",
    points: [
      `${PRICING_CARD_TOKENS.free} tokens included`,
      `~${Math.floor(PRICING_CARD_TOKENS.free / fullReportTokensFast)} full report (fast model)`,
      "Community support",
    ],
    tone: "light",
    cta: "Choose Free",
    ctaClasses: "h-11 border border-text-primary bg-white text-text-primary hover:bg-muted",
  },
  {
    name: "Starter",
    price: "$29/mo",
    points: [
      `${PRICING_CARD_TOKENS.starter} tokens monthly`,
      `~${Math.floor(PRICING_CARD_TOKENS.starter / fullReportTokensBalanced)} full reports (balanced)`,
      "PRD + tech spec export",
    ],
    tone: "light",
    cta: "Start Starter",
    ctaClasses: "h-11 border border-text-primary bg-white text-text-primary hover:bg-muted",
  },
  {
    name: "Pro",
    price: "$79/mo",
    points: [
      `${PRICING_CARD_TOKENS.pro} tokens monthly`,
      `~${Math.floor(PRICING_CARD_TOKENS.pro / fullReportTokensThinking)} full reports (thinking)`,
      "App generation + priority support",
    ],
    tone: "dark",
    cta: "Go Pro",
    ctaClasses: "h-11 bg-primary text-primary-foreground hover:bg-primary/90",
  },
  {
    name: "Enterprise",
    price: "Custom",
    points: ["Custom token pools", "Dedicated VPC", "SSO + RBAC", "Custom integrations"],
    tone: "light",
    cta: "Talk to Sales",
    ctaClasses: "h-11 border border-text-primary bg-white text-text-primary hover:bg-muted",
  },
]

const container = "mx-auto w-full max-w-[1320px] px-6 sm:px-8 lg:px-14"

function SectionCard({ children }: { children: ReactNode }) {
  return <section className={`${container} py-8 md:py-10`}>{children}</section>
}

/** Fetches the current registered user count from the profiles table. */
async function getUserCount(): Promise<number> {
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
}

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
  const waitlistMode = isWaitlistMode(userCount)

  return (
    <div className="min-h-screen bg-white text-text-primary">
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-white/95 backdrop-blur-sm">
        <div className={`${container} ui-row-between h-16`}>
          <BrandWordmark href="/" logoSize={36} logoClassName="rounded-sm" labelClassName="text-lg font-semibold tracking-[0.01em]" />

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) => (
              <a key={item.label} href={item.href} className="text-sm font-medium text-text-primary hover:text-text-secondary">
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden ui-row-gap-3 md:flex">
            {/* Sign In is always visible — existing users still need to log in */}
            <Link href="/?modal=auth&mode=signin" scroll={false}>
              <Button variant="outline" className="h-10 px-6 border-border-subtle bg-white text-text-primary">
                Sign In
              </Button>
            </Link>

            {waitlistMode ? (
              <a href="#waitlist">
                <Button className="h-10 px-6 bg-primary text-primary-foreground">Join Waitlist</Button>
              </a>
            ) : (
              <Link href="/?modal=auth&mode=signup" scroll={false}>
                <Button className="h-10 px-6 bg-primary text-primary-foreground">Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <SectionCard>
        <div className="flex items-center justify-center pt-10 pb-8 md:pt-14">
          <div className="inline-flex items-center rounded-full border border-border-subtle px-4 py-2 text-xs font-medium tracking-[0.16em] text-text-secondary">
            {waitlistMode
              ? `${WAITLIST_LIMIT} early-access spots filled — join the waitlist`
              : "Lean-in Workflow For Builders"}
          </div>
        </div>

        <h1 className="max-w-[980px] mx-auto text-center text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.06em] font-semibold">
          Build your startup idea this weekend — not &ldquo;someday.&rdquo;
        </h1>

        <p className="mx-auto mt-6 max-w-[780px] text-center text-[20px] leading-relaxed text-text-secondary">
          Turn one idea into research, MVP plan, and actionable mockups in minutes. No fluff. No &ldquo;where do I start?&rdquo; spiral.
        </p>

        {/* Hero CTA — waitlist input or sign-up buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:gap-4">
          {waitlistMode ? (
            <WaitlistForm showSecondary />
          ) : (
            <>
              <LandingIdeaCapture isAuthenticated={isAuthenticated} />
              <Link href="#features">
                <Button variant="outline" className="h-14 px-7 border-border-subtle text-base font-semibold bg-white text-text-primary">
                  See How It Works
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="mx-auto mt-12 grid w-full max-w-[780px] gap-4 sm:grid-cols-3">
          <div className="flex h-[112px] flex-col items-center justify-center border border-text-primary bg-text-primary text-white p-4">
            <p className="text-[36px] font-semibold leading-none tracking-[-0.06em]">3x</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#F0F0F0]">Design Directions</p>
          </div>
          <div className={uiStylePresets.landingStatCard}>
            <p className="text-[36px] font-semibold leading-none tracking-[-0.06em]">MVP</p>
            <p className={uiStylePresets.landingFeaturePill}>Ready Plan</p>
          </div>
          <div className={uiStylePresets.landingStatCard}>
            <p className="text-[36px] font-semibold leading-none tracking-[-0.06em]">Fast</p>
            <p className={uiStylePresets.landingFeaturePill}>First Drafts</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <BuildMap />
      </SectionCard>

      <SectionCard>
        <section id="features" className="py-3">
          <p className="ui-kicker-label">Features</p>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.35rem)] leading-[0.98] tracking-[-0.06em] font-semibold">
            From idea to momentum — without the usual excuses
          </h2>

          <div className="mt-8 border border-border-subtle bg-[#F8FAFC] p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Signature Feature</p>
            <h3 className="mt-3 text-[clamp(1.4rem,2.4vw,2rem)] leading-tight tracking-[-0.03em] font-semibold">
              One idea. Three design directions. Instant clarity.
            </h3>
            <p className="mt-3 max-w-[860px] text-sm leading-relaxed text-text-secondary">
              Generate multiple mockup directions for the same core screen, compare them side-by-side, and pick the direction you want to build first.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((item) => (
              <article key={item.title} className="border border-border-subtle bg-white p-6 md:p-7">
                <div className="flex h-10 w-10 items-center justify-center bg-text-primary text-white">
                  <item.icon className="h-[18px] w-[18px]" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">{item.title}</h3>
                <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </SectionCard>

      <SectionCard>
        <InspirationProjectsSection />
      </SectionCard>

      <SectionCard>
        <section id="how-it-works" className="py-3">
          <p className="ui-kicker-label">How It Works</p>
          <h2 className="mt-4 max-w-[760px] text-[clamp(2rem,4vw,3.35rem)] leading-[0.98] tracking-[-0.06em] font-semibold">
            Your first version, broken into clear steps
          </h2>

          <div className="mt-8 space-y-4">
            {steps.map((step) => (
              <div key={step.number} className="grid grid-cols-[auto,1fr] gap-5 border border-border-subtle p-5 md:p-6">
                <p className="text-[36px] leading-none font-semibold tracking-[-0.06em] text-primary">{step.number}</p>
                <p className="whitespace-pre-line text-[16px] leading-7 text-text-primary">{step.body}</p>
              </div>
            ))}
          </div>
        </section>
      </SectionCard>

      <SectionCard>
        <section id="pricing" className="py-3">
          <p className="ui-kicker-label">Pricing</p>
          <h2 className="mt-4 max-w-[840px] text-[clamp(2rem,4vw,3.35rem)] leading-[0.98] tracking-[-0.06em] font-semibold">
            Plans For Builders At Every Stage
          </h2>
          <p className="mt-4 max-w-[760px] text-sm text-text-secondary">
            1 token = {tokenUsdLabel}. Full report estimate: fast {fullReportTokensFast} tokens, balanced {fullReportTokensBalanced} tokens, thinking {fullReportTokensThinking} tokens.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const isDark = plan.tone === "dark"
              return (
                <article
                  key={plan.name}
                  className={`flex min-h-full flex-col border p-7 ${
                    isDark
                      ? "border-text-primary bg-text-primary text-white"
                      : "border-border-subtle bg-white text-text-primary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-[26px] font-semibold tracking-[-0.02em]">{plan.name}</h3>
                    {isDark && (
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white">
                        Best Value
                      </span>
                    )}
                  </div>

                  <p className={`mt-2 text-4xl font-semibold tracking-[-0.05em] ${isDark ? "text-primary" : "text-text-primary"}`}>
                    {plan.price}
                  </p>

                  <div className="mt-8 mb-6 space-y-3 border-b border-[rgba(0,0,0,0.08)] pb-6 dark:border-white/20">
                    {plan.points.map((point) => (
                      <p key={point} className={`text-sm ${isDark ? "text-text-muted" : "text-text-secondary"}`}>
                        {point}
                      </p>
                    ))}
                  </div>

                  <div className="mt-auto">
                    <Button className={`w-full ${plan.ctaClasses}`}>{plan.cta}</Button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </SectionCard>

      {/* Bottom CTA */}
      <section className="border-t border-border-subtle py-16 md:py-20">
        <div className={`${container} text-center`}>
          <h2 className="mx-auto max-w-[860px] text-[clamp(2rem,4.6vw,4rem)] leading-[0.96] tracking-[-0.06em] font-semibold">
            {waitlistMode ? "Secure your spot before it fills up." : "Stop waiting. Start building."}
          </h2>
          <p className="mx-auto mt-6 max-w-[760px] text-xl text-text-secondary">
            {waitlistMode
              ? "Join the waitlist and be first to know when the next batch of spots opens."
              : "Get early access and turn your next idea into research, plans, and mockups you can actually execute."}
          </p>
          <div className="mt-8 flex justify-center">
            {waitlistMode ? (
              <WaitlistForm />
            ) : (
              <Link href="/?modal=auth&mode=signup" scroll={false} className="inline-block">
                <Button className="h-14 px-8 text-base font-semibold bg-primary text-white">
                  Get Started
                  <ArrowRight className="ml-2 ui-icon-16" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className={`${container} ui-row-between h-[88px] flex-wrap gap-5 text-sm`}>
          <span className="font-mono text-[11px] tracking-[0.05em] text-text-muted">(c) 2026 Idea2App. All rights reserved.</span>
          <div className="flex items-center gap-5 font-mono text-[11px] tracking-[0.05em] text-text-muted">
            <a href="#" className={uiStylePresets.subtleLinkHover}>Terms</a>
            <a href="#" className={uiStylePresets.subtleLinkHover}>Privacy</a>
            <a href="#" className={uiStylePresets.subtleLinkHover}>Contact</a>
          </div>
        </div>
      </footer>

      <Suspense>
        <AuthModal />
      </Suspense>
    </div>
  )
}

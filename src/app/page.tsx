import type { ReactNode } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LandingIdeaCapture } from "@/components/landing/landing-idea-capture"
import { WaitlistForm } from "@/components/landing/waitlist-form"
import { PRICING_CARD_TOKENS, TOKEN_VALUE_CENTS, estimateFullReportTokens } from "@/lib/token-economics"
import { formatPrice } from "@/lib/utils"
import { createServiceClient } from "@/lib/supabase/service"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { isWaitlistMode, WAITLIST_LIMIT } from "@/lib/waitlist"
import { ArrowRight } from "lucide-react"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { AuthModal } from "@/components/auth/auth-modal"
import { BuildMap } from "@/components/landing/build-map"
import { TestimonialBand } from "@/components/landing/testimonial-band"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
]

const productOutputs = [
  {
    eyebrow: "Research",
    title: "Know the market before you commit a sprint.",
    description:
      "Maker Compass maps competitors, pricing, positioning, gaps, and first wedges so your idea starts with context instead of guesswork.",
    artifacts: ["Competitive scan", "Audience segments", "Differentiation wedges"],
  },
  {
    eyebrow: "Product",
    title: "Turn the idea into a buildable plan.",
    description:
      "Generate the PRD, MVP scope, acceptance criteria, mockup directions, and technical blueprint your coding agent needs to start cleanly.",
    artifacts: ["PRD", "MVP plan", "Mockups", "Technical spec"],
  },
]

const workflowSignals = [
  "One intake becomes every core artifact.",
  "Docs stay tied to the same project context.",
  "Output is written for builders, not slide decks.",
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

const container = "mx-auto w-full max-w-[1320px] px-4 sm:px-8 lg:px-14"

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
    <div className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-white/95 backdrop-blur-sm">
        <div className={`${container} flex min-h-16 flex-wrap items-center justify-between gap-3 py-3 md:flex-nowrap md:py-0`}>
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

      <SectionCard>
        <div className="flex items-center justify-center pt-8 pb-6 md:pt-14 md:pb-8">
          <div className="inline-flex items-center rounded-full border border-border-subtle px-4 py-2 font-mono text-[0.6875rem] font-medium tracking-[0.18em] text-text-secondary">
            {waitlistMode
              ? `${WAITLIST_LIMIT} early-access spots filled. Join the waitlist.`
              : "Lean-in Workflow For Builders"}
          </div>
        </div>

        <h1 className="font-display max-w-[980px] mx-auto text-center text-[2.75rem] leading-[0.95] tracking-[-0.06em] font-semibold sm:text-[3.5rem] lg:text-[4.5rem]">
          Build your startup idea this weekend, not &ldquo;someday.&rdquo;
        </h1>

        <p className="mx-auto mt-6 max-w-[780px] text-center text-base leading-relaxed text-text-secondary sm:text-[20px]">
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
                <Button variant="outline" className="h-14 px-7 rounded-none border-border-subtle text-base font-semibold bg-white text-text-primary">
                  See How It Works
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="mx-auto mt-12 max-w-[860px] border-y border-border-subtle py-5">
          <p className="text-center text-sm leading-relaxed text-text-secondary">
            One focused intake becomes market research, product direction, mockups, technical choices, and the next build step.
          </p>
        </div>
      </SectionCard>

      <SectionCard>
        <BuildMap />
      </SectionCard>

      <SectionCard>
        <TestimonialBand />
      </SectionCard>

      <SectionCard>
        <section id="features" className="py-3">
          <p className="ui-kicker-label">Features</p>
          <h2 className="mt-4 text-[2rem] leading-[0.98] tracking-[-0.06em] font-semibold sm:text-[2.65rem] lg:text-[3.35rem]">
            From idea to momentum, without the usual excuses
          </h2>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            {productOutputs.map((item) => (
              <article key={item.eyebrow} className="rounded-none border border-border-subtle bg-white p-6 md:p-8">
                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
                  {item.eyebrow}
                </p>
                  <h3 className="mt-4 max-w-[620px] text-[1.45rem] font-semibold leading-tight tracking-[-0.04em] sm:text-[1.85rem] lg:text-[2.25rem]">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-[680px] text-[15px] leading-relaxed text-text-secondary">
                  {item.description}
                </p>
                <div className="mt-7 flex flex-wrap gap-2">
                  {item.artifacts.map((artifact) => (
                    <span
                      key={artifact}
                      className="border border-border-subtle bg-[#F5F0EB] px-3 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-text-secondary"
                    >
                      {artifact}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-0 border border-border-subtle bg-text-primary text-white md:grid-cols-3">
            {workflowSignals.map((signal) => (
              <div key={signal} className="border-b border-white/15 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                <p className="text-[15px] font-medium leading-relaxed">{signal}</p>
              </div>
            ))}
          </div>
        </section>
      </SectionCard>

      <SectionCard>
        <section id="how-it-works" className="py-3">
          <p className="ui-kicker-label">How It Works</p>
          <h2 className="mt-4 max-w-[760px] text-[2rem] leading-[0.98] tracking-[-0.06em] font-semibold sm:text-[2.65rem] lg:text-[3.35rem]">
            Your first version, broken into clear steps
          </h2>

          <div className="mt-8 space-y-4">
            {steps.map((step) => (
              <div key={step.number} className="grid grid-cols-[auto,1fr] gap-4 border border-border-subtle p-4 sm:gap-5 md:p-6">
                <p className="text-[30px] leading-none font-semibold tracking-[-0.06em] text-primary sm:text-[36px]">{step.number}</p>
                <p className="whitespace-pre-line text-[16px] leading-7 text-text-primary">{step.body}</p>
              </div>
            ))}
          </div>
        </section>
      </SectionCard>

      <SectionCard>
        <section id="pricing" className="py-3">
          <p className="ui-kicker-label">Pricing</p>
          <h2 className="mt-4 max-w-[840px] text-[2rem] leading-[0.98] tracking-[-0.06em] font-semibold sm:text-[2.65rem] lg:text-[3.35rem]">
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
                  className={`flex min-h-full flex-col rounded-none border p-7 ${
                    isDark
                      ? "border-text-primary bg-text-primary text-white"
                      : "border-border-subtle bg-white text-text-primary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-[26px] font-semibold tracking-[-0.02em]">{plan.name}</h3>
                    {isDark && (
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-white">
                        Best Value
                      </span>
                    )}
                  </div>

                  <p className={`mt-2 text-4xl font-semibold tracking-[-0.05em] ${isDark ? "text-primary" : "text-text-primary"}`}>
                    {plan.price}
                  </p>

                  <div className="mt-8 mb-6 space-y-3 border-b border-border-subtle pb-6 dark:border-white/20">
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
          <h2 className="mx-auto max-w-[860px] text-[2rem] leading-[0.96] tracking-[-0.06em] font-semibold sm:text-[3rem] lg:text-[4rem]">
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
                <Button className="h-14 px-8 rounded-none text-base font-semibold bg-primary text-white">
                  Get Started
                  <ArrowRight className="ml-2 ui-icon-16" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-border-subtle bg-[#F5F0EB]">
        <div className={`${container} flex min-h-[88px] items-center text-sm`}>
          <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-text-muted">© 2026 Maker Compass. All rights reserved.</span>
        </div>
      </footer>

      <Suspense>
        <AuthModal />
      </Suspense>
    </div>
  )
}

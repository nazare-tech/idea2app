import type { ReactNode } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LandingIdeaCapture } from "@/components/landing/landing-idea-capture"
import { WaitlistForm } from "@/components/landing/waitlist-form"
import { createServiceClient } from "@/lib/supabase/service"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { isWaitlistMode } from "@/lib/waitlist"
import { ArrowRight, Check, ImageIcon } from "lucide-react"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { AuthModal } from "@/components/auth/auth-modal"
import { HeroArtwork } from "@/components/landing/hero-artwork"
import { TestimonialBand } from "@/components/landing/testimonial-band"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
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

const featureSections = [
  {
    eyebrow: "01 / Market Research",
    title: "Know the market before you commit a sprint.",
    description:
      "Maker Compass maps competitors, pricing, positioning, gaps, and first wedges so your idea starts with context instead of guesswork.",
    bullets: [
      { label: "Competitive scan", body: "Direct and indirect competitors, mapped with pricing and positioning." },
      { label: "Audience segments", body: "Who to build for first, and how they talk about the problem." },
      { label: "Differentiation wedges", body: "Where the open lane is for your specific idea." },
    ],
    visualLabel: "Market research screenshot",
  },
  {
    eyebrow: "02 / Product Plan",
    title: "Turn the idea into a buildable plan.",
    description:
      "Get exactly three user personas, user stories, grouped requirements, and a release plan your coding agent can build from without a translation step.",
    bullets: [
      { label: "Three user personas", body: "Grounded in the research, not guessed at." },
      { label: "User stories and requirements", body: "Grouped and ready for a coding agent to scope." },
      { label: "Release plan", body: "What ships first, and what waits for later." },
    ],
    visualLabel: "Product plan screenshot",
  },
  {
    eyebrow: "03 / First Version Plan",
    title: "Scope the first release like a builder, not a committee.",
    description:
      "Narrow the first release into a realistic build sequence with must-have features, validation steps, and guardrails, so scope creep never gets a foothold.",
    bullets: [
      { label: "Build sequence", body: "A realistic order of operations for the first release." },
      { label: "Validation plan", body: "How you will know the first version actually works." },
      { label: "Scope guardrails", body: "What is explicitly out, so scope creep does not sneak back in." },
    ],
    visualLabel: "First version plan screenshot",
  },
  {
    eyebrow: "04 / Design Mockups",
    title: "See three directions before you write UI code.",
    description:
      "Compare three UI directions for the same core screens side by side, then hand off the one you pick instead of guessing at layout mid-build.",
    bullets: [
      { label: "Three UI directions", body: "Same core screens, three different visual takes." },
      { label: "Side by side comparison", body: "Pick a direction without re-briefing a designer." },
      { label: "Ready to hand off", body: "The chosen direction becomes the build reference." },
    ],
    visualLabel: "Design mockups screenshot",
  },
]

const plans = [
  {
    name: "Free",
    price: "$0/mo",
    points: [
      "1 lifetime project",
      "Bundled research, product plan, first-version plan, and mockups",
      "Community support",
    ],
    tone: "light",
    cta: "Choose Free",
    ctaClasses: "h-11 border border-text-primary bg-white text-text-primary hover:bg-muted",
  },
  {
    name: "Starter",
    price: "$19/mo",
    points: [
      "3 projects/mo",
      "Bundled planning docs for each new project",
      "6-month and annual savings available",
      "Product plan + tech spec export",
    ],
    tone: "light",
    cta: "Start Starter",
    ctaClasses: "h-11 border border-text-primary bg-white text-text-primary hover:bg-muted",
  },
  {
    name: "Pro",
    price: "$49/mo",
    points: [
      "10 projects/mo",
      "Bundled planning docs for heavier build cycles",
      "6-month and annual savings available",
      "App generation + priority support",
    ],
    tone: "dark",
    cta: "Go Pro",
    ctaClasses: "h-11 bg-primary text-primary-foreground hover:bg-primary/90",
  },
]

const container = "mx-auto w-full max-w-[1320px] px-4 sm:px-8 lg:px-14"

function SectionCard({ children }: { children: ReactNode }) {
  return <section className={`${container} py-8 md:py-10`}>{children}</section>
}

/** Awaiting a real screenshot/video from the user; keeps layout proportions stable until then. */
function FeatureVisualPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center border border-dashed border-border-strong bg-[#F5F0EB] md:aspect-auto md:h-full md:min-h-[280px]">
      <div className="flex flex-col items-center gap-2 px-6 text-center">
        <ImageIcon className="h-6 w-6 text-text-muted" aria-hidden="true" />
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-text-muted">{label}</p>
      </div>
    </div>
  )
}

/** Purely informational, not interactive: grayscale at rest and stays that way, no hover state. */
function ToolLogo({ name, src }: { name: string; src: string }) {
  return (
    <div className="flex h-[92px] w-[152px] shrink-0 flex-col items-center justify-center gap-3 border border-border-subtle bg-white px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${name} logo`}
        className="h-8 w-auto max-w-[96px] object-contain grayscale opacity-60"
      />
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-text-muted">{name}</span>
    </div>
  )
}

/** Duplicates the row once so a -50% translate loops seamlessly. Runs continuously; honors prefers-reduced-motion only. */
function ToolLogoMarquee({ tools }: { tools: { name: string; src: string }[] }) {
  return (
    <div className="landing-logo-marquee mt-4">
      <div className="landing-logo-marquee__track">
        {[...tools, ...tools].map((tool, index) => (
          <ToolLogo key={`${tool.name}-${index}`} name={tool.name} src={tool.src} />
        ))}
      </div>
    </div>
  )
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
  if (isAuthenticated) {
    redirect("/projects")
  }

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

      <section className="relative isolate overflow-hidden">
        <HeroArtwork />
        <div className={`${container} relative z-10 flex min-h-[620px] flex-col items-center justify-center py-16 md:min-h-[680px] lg:min-h-[720px] lg:py-20`}>
          <h1 className="font-display mx-auto flex max-w-[980px] flex-col text-center text-[2.75rem] font-semibold leading-[0.95] tracking-[-0.06em] text-text-primary sm:text-[3.5rem] lg:text-[4.5rem]">
            <span>Build your startup idea this</span>
            <span>weekend, not &ldquo;someday.&rdquo;</span>
          </h1>

          <div className="mt-10 flex w-full justify-center lg:mt-12">
            {waitlistMode ? <WaitlistForm showSecondary /> : <LandingIdeaCapture isAuthenticated={isAuthenticated} />}
          </div>

          {waitlistMode && (
            <p className="mx-auto mt-5 max-w-[520px] text-center text-sm leading-6 text-text-secondary">
              Early access is full. Leave your email for the next batch.
            </p>
          )}

          <p className="mx-auto mt-8 max-w-[560px] text-center text-base leading-relaxed text-text-secondary sm:text-[20px]">
            Turn one idea into market research, a product plan, design mockups, and a first-version build plan in minutes.
            No fluff. No &ldquo;where do I start?&rdquo; spiral.
          </p>
        </div>
      </section>

      {/* Trust bar: what Maker Compass hands off to, since there's no customer logo wall yet */}
      <SectionCard>
        <section aria-label="Where Maker Compass hands off" className="py-3 text-center">
          <h2 className="mx-auto max-w-[760px] text-[1.75rem] leading-[1.05] tracking-[-0.05em] font-semibold sm:text-[2.25rem]">
            Built to hand off clean, not create more busywork.
          </h2>
          <p className="mx-auto mt-4 max-w-[620px] text-[15px] leading-relaxed text-text-secondary">
            Maker Compass front-loads the research and planning. When a project is ready, the output is structured
            for the coding agent you already reach for, not another tool to learn.
          </p>
          <p className="mt-8 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
            Hands off to
          </p>
          <ToolLogoMarquee tools={handoffTools} />
        </section>
      </SectionCard>

      <SectionCard>
        <section id="features" className="py-3">
          <h2 className="max-w-[760px] text-[2rem] leading-[0.98] tracking-[-0.06em] font-semibold sm:text-[2.65rem] lg:text-[3.35rem]">
            From idea to momentum, without the usual excuses
          </h2>

          <div className="mt-10 space-y-10">
            {featureSections.map((section, index) => {
              const imageOnRight = index % 2 === 0
              return (
                <article
                  key={section.eyebrow}
                  className="grid items-stretch gap-6 border border-border-subtle bg-white md:grid-cols-2 md:gap-0"
                >
                  <div
                    className={`p-6 md:p-10 ${imageOnRight ? "md:order-1" : "md:order-2"}`}
                  >
                    <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
                      {section.eyebrow}
                    </p>
                    <h3 className="mt-4 text-[1.45rem] font-semibold leading-tight tracking-[-0.04em] sm:text-[1.85rem]">
                      {section.title}
                    </h3>
                    <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-text-secondary">
                      {section.description}
                    </p>
                    <ul className="mt-7 space-y-3">
                      {section.bullets.map((bullet) => (
                        <li key={bullet.label} className="flex items-start gap-3">
                          <Check className="mt-1 h-4 w-4 shrink-0 text-text-primary" aria-hidden="true" />
                          <p className="text-[15px] leading-relaxed text-text-secondary">
                            <span className="font-semibold text-text-primary">{bullet.label}.</span> {bullet.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={imageOnRight ? "md:order-2" : "md:order-1"}>
                    <FeatureVisualPlaceholder label={section.visualLabel} />
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </SectionCard>

      <SectionCard>
        <TestimonialBand />
      </SectionCard>

      <SectionCard>
        <section id="pricing" className="py-3">
          <h2 className="max-w-[840px] text-[2rem] leading-[0.98] tracking-[-0.06em] font-semibold sm:text-[2.65rem] lg:text-[3.35rem]">
            Choose by monthly project capacity
          </h2>
          <p className="mt-4 max-w-[760px] text-sm text-text-secondary">
            Each new project starts with bundled onboarding docs, so you can compare plans by project capacity first.
            Token details stay in billing for extra manual generation paths.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
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
                <Button className="h-14 px-8 rounded-none text-base font-semibold bg-primary text-white">
                  Turn my idea into a plan
                  <ArrowRight className="ml-2 ui-icon-16" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-border-subtle bg-[#F5F0EB]">
        <div className={`${container} grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]`}>
          <div>
            <BrandWordmark href="/" logoSize={32} logoClassName="rounded-sm" labelClassName="text-base font-semibold tracking-[0.01em]" />
            <p className="mt-4 max-w-[320px] text-sm leading-relaxed text-text-secondary">
              Turn a one-line idea into research, a product plan, mockups, and a first-version build plan you can hand to a coding agent.
            </p>
          </div>

          <div>
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">Product</p>
            <ul className="mt-4 space-y-3 text-sm">
              {navLinks.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-text-secondary hover:text-text-primary">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">Account</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/?modal=auth&mode=signin" scroll={false} className="text-text-secondary hover:text-text-primary">
                  Sign In
                </Link>
              </li>
              <li>
                {waitlistMode ? (
                  <a href="#waitlist" className="text-text-secondary hover:text-text-primary">
                    Join Waitlist
                  </a>
                ) : (
                  <Link href="/?modal=auth&mode=signup" scroll={false} className="text-text-secondary hover:text-text-primary">
                    Get Started
                  </Link>
                )}
              </li>
            </ul>
          </div>
        </div>
        <div className={`${container} flex min-h-[64px] items-center border-t border-border-subtle text-sm`}>
          <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-text-muted">© 2026 Maker Compass. All rights reserved.</span>
        </div>
      </footer>

      <Suspense>
        <AuthModal />
      </Suspense>
    </div>
  )
}

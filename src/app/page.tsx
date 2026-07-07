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
import { ArrowRight } from "lucide-react"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { AuthModal } from "@/components/auth/auth-modal"
import { HeroArtwork } from "@/components/landing/hero-artwork"
import { TestimonialBand } from "@/components/landing/testimonial-band"
import { ToolLogoMarquee } from "@/components/landing/tool-logo-marquee"
import { FeatureProductPreview } from "@/components/landing/feature-product-preview"
import { FeatureCard } from "@/components/landing/feature-card"
import { PricingSection } from "@/components/landing/pricing-section"
import { FaqSection } from "@/components/landing/faq-section"
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

interface FeatureSection {
  eyebrow: string
  title: string
  description: string
  bullets: { label: string; body: string }[]
    /** Workspace nav item captured as the section's product visual */
  navKey: string
  /** Subsection shown in its active state */
  activeSectionId: string
}

const featureSections: FeatureSection[] = [
  {
    eyebrow: "01 / Market Research",
    title: "Know the market before you build.",
    description: "Competitors, pricing, positioning, and open gaps, mapped before you commit a sprint.",
    bullets: [
      { label: "Competitive scan", body: "Direct and indirect competitors, mapped with pricing and positioning." },
      { label: "Audience segments", body: "Who to build for first, and how they talk about the problem." },
      { label: "Differentiation wedges", body: "Where the open lane is for your specific idea." },
    ],
    // Static capture generated from the workspace preview route.
    // Feature Comparison is the showcase section until live competitor search
    // is fixed; switch activeSectionId to "market-research-direct-competitors"
    // and re-export the sample data once competitor profiles generate again.
    navKey: "market-research",
    activeSectionId: "market-research-feature-matrix",
  },
  {
    eyebrow: "02 / Product Plan",
    title: "Turn the idea into a buildable plan.",
    description: "Personas, user stories, and grouped requirements your coding agent can build from.",
    bullets: [
      { label: "Three user personas", body: "Grounded in the research, not guessed at." },
      { label: "User stories and requirements", body: "Grouped and ready for a coding agent to scope." },
      { label: "Release plan", body: "What ships first, and what waits for later." },
    ],
    navKey: "prd",
    activeSectionId: "prd-user-personas",
  },
  {
    eyebrow: "03 / First Version Plan",
    title: "Scope the first release like a builder.",
    description: "A realistic build sequence with validation steps and guardrails against scope creep.",
    bullets: [
      { label: "Build sequence", body: "A realistic order of operations for the first release." },
      { label: "Validation plan", body: "How you will know the first version actually works." },
      { label: "Scope guardrails", body: "What is explicitly out, so scope creep does not sneak back in." },
    ],
    navKey: "mvp",
    activeSectionId: "mvp-validation-plan",
  },
  {
    eyebrow: "04 / Design Mockups",
    title: "Three UI directions, side by side.",
    description: "Compare three takes on the same core screens, then hand off the one you pick.",
    bullets: [
      { label: "Three UI directions", body: "Same core screens, three different visual takes." },
      { label: "Side by side comparison", body: "Pick a direction without re-briefing a designer." },
      { label: "Ready to hand off", body: "The chosen direction becomes the build reference." },
    ],
    navKey: "mockups",
    activeSectionId: "mockups-concept-1",
  },
  {
    eyebrow: "05 / AI Prompts",
    title: "A brief your coding agent can run with.",
    description: "A recommended build tool, guardrails, and a ready-to-paste first prompt.",
    bullets: [
      { label: "Recommended build tool", body: "A concrete pick with the reasoning and starting cost." },
      { label: "Next prompt", body: "A first prompt built from your plans, ready to paste." },
      { label: "Guardrails and build sequence", body: "Constraints and an order of work that keep the agent on track." },
    ],
    navKey: "ai-prompts",
    activeSectionId: "ai-prompts-recommended-build-tool",
  },
]

const container = "mx-auto w-full max-w-[1320px] px-4 sm:px-8 lg:px-14"

function SectionCard({ children }: { children: ReactNode }) {
  return <section className={`${container} py-8 md:py-10`}>{children}</section>
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

      {/* overflow-x-clip keeps the 1920px artwork from causing a horizontal scrollbar
          while letting the sticky notes stay visible below the hero boundary */}
      <section className="relative isolate overflow-x-clip">
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
            {featureSections.map((section, index) => (
              <FeatureCard
                key={section.eyebrow}
                eyebrow={section.eyebrow}
                title={section.title}
                description={section.description}
                bullets={section.bullets}
                imageOnRight={index % 2 === 0}
              >
                {/* Static workspace capture generated from the exported sample project. */}
                <FeatureProductPreview navKey={section.navKey} activeSectionId={section.activeSectionId} />
              </FeatureCard>
            ))}
          </div>
        </section>
      </SectionCard>

      <SectionCard>
        <TestimonialBand />
      </SectionCard>

      <SectionCard>
        <PricingSection waitlistMode={waitlistMode} />
      </SectionCard>

      <SectionCard>
        <FaqSection />
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
                <Button className="h-14 px-8 rounded-md text-base font-semibold bg-primary text-white">
                  Turn my idea into a plan
                  <ArrowRight className="ml-2 ui-icon-16" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />

      <Suspense>
        <AuthModal />
      </Suspense>
    </div>
  )
}

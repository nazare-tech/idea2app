"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Yearly billing discount shown on the landing page (marketing copy only). */
const YEARLY_DISCOUNT_PERCENT = 15

type Billing = "monthly" | "yearly"

interface PricingPlan {
  name: string
  /** Base monthly price in dollars; null renders as free. */
  monthlyPrice: number | null
  /** Label above the feature rows, e.g. "Everything in Free plus:". */
  includedLabel: string
  features: string[]
  cta: string
  /** Pro gets the warm-paper highlight treatment from the design. */
  highlighted?: boolean
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    monthlyPrice: null,
    includedLabel: "What's included:",
    features: [
      "1 lifetime project",
      "Bundled research, product plan, first-version plan, and mockups",
      "Competitive scan with audience segments",
      "Ready-to-paste AI prompts",
      "Community support",
    ],
    cta: "Choose Free",
  },
  {
    name: "Starter",
    monthlyPrice: 19,
    includedLabel: "Everything in Free plus:",
    features: [
      "5 projects/mo",
      "Bundled planning docs for each new project",
      "Three design mockup directions per project",
      "Product plan + tech spec export",
      "Recommended build tool + first prompt",
      "Email support",
    ],
    cta: "Start Starter",
  },
  {
    name: "Pro",
    monthlyPrice: 49,
    includedLabel: "Everything in Starter plus:",
    features: [
      "10 projects/mo",
      "Bundled planning docs for heavier build cycles",
      "Deeper research with the thinking model",
      "Priority generation queue",
      "Priority support",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
]

interface PricingSectionProps {
  /** When the early-access cap is reached, CTAs point at the waitlist instead of signup. */
  waitlistMode: boolean
}

export function PricingSection({ waitlistMode }: PricingSectionProps) {
  const [billing, setBilling] = useState<Billing>("monthly")
  const yearly = billing === "yearly"

  // Yearly billing shows a discounted per-month price, rounded to whole dollars.
  const perMonth = (monthly: number) =>
    yearly ? Math.round(monthly * (1 - YEARLY_DISCOUNT_PERCENT / 100)) : monthly

  const segmentClasses = (active: boolean) =>
    `h-9 rounded-full px-[18px] text-[13px] font-semibold transition-colors ${
      active
        ? "border border-border-strong bg-white text-text-primary"
        : "border border-transparent text-text-muted"
    }`

  return (
    <section id="pricing" className="py-3">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="text-[2rem] leading-[0.98] tracking-[-0.06em] font-semibold sm:text-[2.65rem] lg:text-[3.35rem]">
          Pricing
        </h2>
        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-full bg-muted p-1">
            <button type="button" onClick={() => setBilling("monthly")} className={segmentClasses(!yearly)}>
              Monthly
            </button>
            <button type="button" onClick={() => setBilling("yearly")} className={segmentClasses(yearly)}>
              Yearly
            </button>
          </div>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
            Save {YEARLY_DISCOUNT_PERCENT}% with yearly billing
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {pricingPlans.map((plan) => {
          const highlighted = Boolean(plan.highlighted)
          const monthly = plan.monthlyPrice
          const price = monthly === null ? 0 : perMonth(monthly)
          const billNote =
            monthly === null
              ? "free forever"
              : yearly
                ? `billed annually as $${price * 12}`
                : "billed monthly"

          return (
            <article
              key={plan.name}
              className={`flex min-h-full flex-col rounded-none border p-7 text-text-primary ${
                highlighted ? "border-border-strong bg-muted" : "border-border-subtle bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-[26px] font-semibold tracking-[-0.02em]">{plan.name}</h3>
                {highlighted && (
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-border-strong bg-white px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-text-primary">
                    Best Value
                  </span>
                )}
              </div>

              <p
                className={`mt-5 font-display text-[52px] font-bold leading-none tracking-[-0.05em] ${
                  highlighted ? "text-primary" : "text-text-primary"
                }`}
              >
                ${price}
              </p>
              <p className="mt-2 text-sm text-text-secondary">per month</p>
              <p className="mt-0.5 text-[13px] font-semibold text-text-primary">{billNote}</p>

              {waitlistMode ? (
                <a href="#waitlist" className="mt-6">
                  <Button
                    className={`h-11 w-full rounded-md text-sm font-semibold ${
                      highlighted
                        ? "bg-primary text-white hover:bg-primary/90"
                        : "border border-text-primary bg-white text-text-primary hover:bg-muted"
                    }`}
                  >
                    Join Waitlist
                  </Button>
                </a>
              ) : (
                <Link href="/?modal=auth&mode=signup" scroll={false} className="mt-6">
                  <Button
                    className={`h-11 w-full rounded-md text-sm font-semibold ${
                      highlighted
                        ? "bg-primary text-white hover:bg-primary/90"
                        : "border border-text-primary bg-white text-text-primary hover:bg-muted"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              )}

              <p className="mt-7 text-[15px] font-bold">{plan.includedLabel}</p>
              <div className="mt-1 flex flex-col">
                {plan.features.map((feature, index) => (
                  <div
                    key={feature}
                    className={`flex items-start gap-3 py-3 ${
                      index < plan.features.length - 1
                        ? highlighted
                          ? "border-b border-border-strong"
                          : "border-b border-border-subtle"
                        : ""
                    }`}
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-text-primary" aria-hidden="true" />
                    <span className="text-sm leading-normal text-text-secondary">{feature}</span>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

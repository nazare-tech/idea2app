"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { PlanCard, planCtaClasses } from "@/components/pricing/plan-card"
import { BillingIntervalToggle } from "@/components/pricing/billing-interval-toggle"
import {
  PLAN_DISPLAYS,
  yearlyMonthlyPriceUsd,
  type BillingInterval,
} from "@/lib/pricing-plans"

interface PricingSectionProps {
  /** When the early-access cap is reached, CTAs point at the waitlist instead of signup. */
  waitlistMode: boolean
}

export function PricingSection({ waitlistMode }: PricingSectionProps) {
  const [billing, setBilling] = useState<BillingInterval>("monthly")
  const yearly = billing === "yearly"

  return (
    <section id="pricing" className="py-3">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="text-[2rem] leading-[0.98] tracking-[-0.06em] font-semibold sm:text-[2.65rem] lg:text-[3.35rem]">
          Pricing
        </h2>
        <BillingIntervalToggle value={billing} onChange={setBilling} />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {PLAN_DISPLAYS.map((plan) => {
          const highlighted = Boolean(plan.highlighted)
          const monthly = plan.monthlyPriceUsd
          // Yearly billing shows a discounted per-month price, rounded to whole dollars.
          const price = monthly === null ? 0 : yearly ? yearlyMonthlyPriceUsd(monthly) : monthly
          const billNote =
            monthly === null
              ? "free forever"
              : yearly
                ? `billed annually as $${price * 12}`
                : "billed monthly"

          const ctaButton = (
            <Button className={planCtaClasses(highlighted)}>
              {waitlistMode ? "Join Waitlist" : plan.signupCta}
            </Button>
          )

          return (
            <PlanCard
              key={plan.name}
              name={plan.name}
              priceLabel={`$${price}`}
              priceCaption="per month"
              billNote={billNote}
              includedLabel={plan.includedLabel}
              features={plan.features}
              highlighted={highlighted}
              badge={highlighted ? "Best Value" : null}
              corners="sharp"
              cta={
                waitlistMode ? (
                  <a href="#waitlist" className="block">
                    {ctaButton}
                  </a>
                ) : (
                  <Link href="/?modal=auth&mode=signup" scroll={false} className="block">
                    {ctaButton}
                  </Link>
                )
              }
            />
          )
        })}
      </div>
    </section>
  )
}

/**
 * Single source of truth for customer-facing plan display copy.
 *
 * Both the landing page pricing grid and the billing page "Available Plans"
 * render from this config through the shared <PlanCard> component, so a copy
 * change here updates both surfaces at once.
 *
 * Division of authority:
 * - This file owns marketing copy: feature lists, included labels, highlight
 *   treatment, CTA labels, and the static landing prices.
 * - The database (`plans` + `plan_prices`) owns checkout truth: plan ids,
 *   Stripe price ids, and the actual charged amounts shown on /billing.
 */

/** Yearly billing discount shown across pricing surfaces. */
export const YEARLY_DISCOUNT_PERCENT = 15

export type BillingInterval = "monthly" | "yearly"

export interface PlanDisplay {
  /** Customer-facing plan name; must match `plans.name` for billing lookup. */
  name: string
  /** Base monthly price in dollars; null renders as free. */
  monthlyPriceUsd: number | null
  /** Label above the feature rows, e.g. "Everything in Free plus:". */
  includedLabel: string
  features: string[]
  /** CTA label used on the public landing page. */
  signupCta: string
  /** Highlighted plan gets the warm-paper treatment and the Best Value badge. */
  highlighted?: boolean
}

export const PLAN_DISPLAYS: PlanDisplay[] = [
  {
    name: "Free",
    monthlyPriceUsd: null,
    includedLabel: "What's included:",
    features: [
      "1 lifetime project",
      "Bundled research, product plan, first-version plan, and mockups",
      "Competitive scan with audience segments",
      "Ready-to-paste AI prompts",
      "Community support",
    ],
    signupCta: "Choose Free",
  },
  {
    name: "Starter",
    monthlyPriceUsd: 19,
    includedLabel: "Everything in Free plus:",
    features: [
      "5 projects/mo",
      "Good AI models for research and generation",
      "Bundled planning docs for each new project",
      "Three design mockup directions per project",
      "Product plan + tech spec export",
      "Recommended build tool + first prompt",
      "Email support",
    ],
    signupCta: "Start Starter",
  },
  {
    name: "Pro",
    monthlyPriceUsd: 49,
    includedLabel: "Everything in Starter plus:",
    features: [
      "10 projects/mo",
      "Best AI models for research and generation",
      "Bundled planning docs for heavier build cycles",
      "Deeper research with the thinking model",
      "Priority generation queue",
      "Priority support",
    ],
    signupCta: "Go Pro",
    highlighted: true,
  },
]

/** Case-insensitive lookup so DB plan rows map onto shared display copy. */
export function getPlanDisplay(planName: string): PlanDisplay | null {
  const normalized = planName.trim().toLowerCase()
  return PLAN_DISPLAYS.find((plan) => plan.name.toLowerCase() === normalized) ?? null
}

/** Discounted whole-dollar monthly price under yearly billing. */
export function yearlyMonthlyPriceUsd(monthlyPriceUsd: number): number {
  return Math.round(monthlyPriceUsd * (1 - YEARLY_DISCOUNT_PERCENT / 100))
}

/** Formats cents as USD, dropping ".00" so $19.00 renders as $19. */
export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

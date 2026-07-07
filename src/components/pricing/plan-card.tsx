import type { ReactNode } from "react"
import { Check } from "lucide-react"

/**
 * Shared plan card used by the landing pricing grid and the billing page.
 *
 * The card is purely presentational: callers own the price math and the CTA
 * (signup link on landing, checkout button on billing). Corners follow the
 * design idiom: sharp on landing surfaces, gently rounded inside /(dashboard).
 */
interface PlanCardProps {
  name: string
  /** Big price line, e.g. "$19" or "$0". */
  priceLabel: string
  /** Caption under the price, e.g. "per month". */
  priceCaption: string
  /** Billing note, e.g. "billed annually as $192" or "free forever". */
  billNote: string
  /** Label above the feature rows, e.g. "Everything in Free plus:". */
  includedLabel: string
  features: string[]
  /** Warm-paper highlight treatment (Pro on both surfaces). */
  highlighted?: boolean
  /** Corner pill badge, e.g. "Best Value" or "Current Plan". */
  badge?: string | null
  corners?: "sharp" | "rounded"
  /** CTA area rendered between the price block and the feature list. */
  cta: ReactNode
}

/** Shared CTA button classes so both surfaces keep identical button styling. */
export function planCtaClasses(highlighted: boolean): string {
  return `h-11 w-full rounded-md text-sm font-semibold ${
    highlighted
      ? "bg-primary text-white hover:bg-primary/90"
      : "border border-text-primary bg-white text-text-primary hover:bg-muted"
  }`
}

export function PlanCard({
  name,
  priceLabel,
  priceCaption,
  billNote,
  includedLabel,
  features,
  highlighted = false,
  badge,
  corners = "sharp",
  cta,
}: PlanCardProps) {
  return (
    <article
      className={`flex min-h-full flex-col border p-7 text-text-primary ${
        corners === "rounded" ? "rounded-lg" : "rounded-none"
      } ${highlighted ? "border-border-strong bg-muted" : "border-border-subtle bg-white"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-[26px] font-semibold tracking-[-0.02em]">{name}</h3>
        {badge && (
          <span className="shrink-0 whitespace-nowrap rounded-full border border-border-strong bg-white px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-text-primary">
            {badge}
          </span>
        )}
      </div>

      <p
        className={`mt-5 font-display text-[52px] font-bold leading-none tracking-[-0.05em] ${
          highlighted ? "text-primary" : "text-text-primary"
        }`}
      >
        {priceLabel}
      </p>
      <p className="mt-2 text-sm text-text-secondary">{priceCaption}</p>
      <p className="mt-0.5 text-[13px] font-semibold text-text-primary">{billNote}</p>

      <div className="mt-6">{cta}</div>

      <p className="mt-7 text-[15px] font-bold">{includedLabel}</p>
      <div className="mt-1 flex flex-col">
        {features.map((feature, index) => (
          <div
            key={feature}
            className={`flex items-start gap-3 py-3 ${
              index < features.length - 1
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
}

"use client"

import { YEARLY_DISCOUNT_PERCENT, type BillingInterval } from "@/lib/pricing-plans"

/**
 * Shared Monthly/Yearly segmented pill used by the landing pricing grid and
 * the billing page, with the yearly-savings caption underneath.
 */
interface BillingIntervalToggleProps {
  value: BillingInterval
  onChange: (value: BillingInterval) => void
}

export function BillingIntervalToggle({ value, onChange }: BillingIntervalToggleProps) {
  const segmentClasses = (active: boolean) =>
    `h-9 rounded-full px-[18px] text-[13px] font-semibold transition-colors ${
      active
        ? "border border-border-strong bg-white text-text-primary"
        : "border border-transparent text-text-muted"
    }`

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="inline-flex items-center gap-0.5 rounded-full bg-muted p-1">
        <button type="button" onClick={() => onChange("monthly")} className={segmentClasses(value === "monthly")}>
          Monthly
        </button>
        <button type="button" onClick={() => onChange("yearly")} className={segmentClasses(value === "yearly")}>
          Yearly
        </button>
      </div>
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
        Save {YEARLY_DISCOUNT_PERCENT}% with yearly billing
      </span>
    </div>
  )
}

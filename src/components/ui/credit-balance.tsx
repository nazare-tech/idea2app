"use client"

import { cn } from "@/lib/utils"
import { formatCreditsValue } from "@/lib/credits"

interface CreditBalanceProps {
  credits: number
  compact?: boolean
  className?: string
  unlimitedClassName?: string
}

export function CreditBalance({
  credits,
  compact = false,
  className,
  unlimitedClassName,
}: CreditBalanceProps) {
  const label = formatCreditsValue(credits, { compact })
  const isUnlimited = label === "Unlimited" || label === "∞"

  if (isUnlimited) {
    return <span className={cn(unlimitedClassName, className)}>{label}</span>
  }

  return <span className={className}>{label}</span>
}

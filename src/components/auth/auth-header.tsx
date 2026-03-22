"use client"

import { cn } from "@/lib/utils"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { uiStylePresets } from "@/lib/ui-style-presets"

interface AuthHeaderProps {
  variant?: "bar" | "stacked"
  className?: string
  logoClassName?: string
}

export function AuthHeader({
  variant = "bar",
  className,
  logoClassName = uiStylePresets.authTopIconBadge,
}: AuthHeaderProps) {
  if (variant === "stacked") {
    return (
      <header className={cn("mt-10", className)}>
        <div className="mt-6">
          <BrandWordmark logoClassName={logoClassName} />
        </div>
      </header>
    )
  }

  return (
    <header className={cn("border-b border-border bg-card", className)}>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between ui-px-4 md:px-8 lg:px-12 xl:px-16">
        <BrandWordmark logoClassName={logoClassName} />
      </div>
    </header>
  )
}

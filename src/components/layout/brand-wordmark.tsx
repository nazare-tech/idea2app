"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { HeaderLogo } from "@/components/layout/header-logo"

interface BrandWordmarkProps {
  href?: string
  className?: string
  label?: string
  labelClassName?: string
  logoSize?: number
  logoClassName?: string
}

export function BrandWordmark({
  href = "/",
  className,
  label = "Idea2App",
  labelClassName,
  logoSize = 32,
  logoClassName,
}: BrandWordmarkProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <HeaderLogo href={href} size={logoSize} className={logoClassName} linked={false} />
      <span className={cn("text-base ui-font-semibold tracking-[0.05em]", labelClassName)}>
        {label}
      </span>
    </Link>
  )
}

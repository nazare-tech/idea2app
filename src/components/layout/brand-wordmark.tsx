"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { APP_HEADER_LOGO_SIZE, HeaderLogo } from "@/components/layout/header-logo"
import { APP_BRAND_NAME } from "@/lib/app-brand"

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
  label = APP_BRAND_NAME,
  labelClassName,
  logoSize = APP_HEADER_LOGO_SIZE,
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

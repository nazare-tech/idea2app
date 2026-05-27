"use client"

import type { MouseEventHandler } from "react"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { APP_HEADER_LOGO_SIZE } from "@/components/layout/header-logo"
import { cn } from "@/lib/utils"

interface HeaderBrandProps {
  href?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  className?: string
}

export function HeaderBrand({
  href = "/projects",
  onClick,
  className,
}: HeaderBrandProps) {
  return (
    <BrandWordmark
      href={href}
      onClick={onClick}
      logoSize={APP_HEADER_LOGO_SIZE}
      className={cn("min-w-0 gap-2", className)}
      labelClassName="truncate text-sm font-bold uppercase leading-5 tracking-normal text-text-secondary"
    />
  )
}

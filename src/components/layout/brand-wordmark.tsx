import type { MouseEventHandler } from "react"
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
  onClick?: MouseEventHandler<HTMLAnchorElement>
}

export function BrandWordmark({
  href = "/",
  className,
  label = APP_BRAND_NAME,
  labelClassName,
  logoSize = APP_HEADER_LOGO_SIZE,
  logoClassName,
  onClick,
}: BrandWordmarkProps) {
  return (
    <Link href={href} onClick={onClick} className={cn("inline-flex items-center gap-2.5", className)}>
      <HeaderLogo href={href} size={logoSize} className={logoClassName} linked={false} />
      <span className={cn("text-base ui-font-semibold tracking-[0.05em]", labelClassName)}>
        {label}
      </span>
    </Link>
  )
}

// App-header preset of the wordmark: compact, truncating, links to /projects.
export function HeaderBrand({
  href = "/projects",
  onClick,
  className,
}: {
  href?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  className?: string
}) {
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

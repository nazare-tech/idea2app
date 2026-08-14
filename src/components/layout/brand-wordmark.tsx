import type { MouseEventHandler } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { APP_HEADER_LOGO_SIZE, HeaderLogo } from "@/components/layout/header-logo"
import { APP_BRAND_NAME } from "@/lib/app-brand"

interface BrandWordmarkProps {
  href?: string
  logoSrc?: string
  className?: string
  label?: string
  labelClassName?: string
  logoSize?: number
  logoClassName?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
}

export function BrandWordmark({
  href = "/",
  logoSrc,
  className,
  label = APP_BRAND_NAME,
  labelClassName,
  logoSize = APP_HEADER_LOGO_SIZE,
  logoClassName,
  onClick,
}: BrandWordmarkProps) {
  return (
    <Link href={href} onClick={onClick} className={cn("inline-flex items-center gap-2.5", className)}>
      <HeaderLogo href={href} src={logoSrc} size={logoSize} className={logoClassName} linked={false} />
      {label === APP_BRAND_NAME ? (
        // Brand wordmark per the 2026-07-30 kit: set solid, `Maker` at weight
        // 800 against `Compass` at 500, tracking -0.045em. The weight break is
        // the ownable detail; screen readers still get "Maker Compass" whole.
        // Weight and tracking sit on the inner spans so caller `labelClassName`
        // (size, colour, truncation) cannot flatten the break via twMerge.
        <span aria-label={APP_BRAND_NAME} className={cn("text-base", labelClassName)}>
          <span aria-hidden="true" className="font-extrabold tracking-[-0.045em]">Maker</span>
          <span aria-hidden="true" className="font-medium tracking-[-0.045em]">Compass</span>
        </span>
      ) : (
        <span className={cn("text-base ui-font-semibold tracking-[0.05em]", labelClassName)}>
          {label}
        </span>
      )}
    </Link>
  )
}

// App-header preset of the wordmark: compact, truncating, links to /projects.
export function HeaderBrand({
  href = "/projects",
  logoSrc,
  onClick,
  className,
}: {
  href?: string
  logoSrc?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  className?: string
}) {
  return (
    <BrandWordmark
      href={href}
      logoSrc={logoSrc}
      onClick={onClick}
      logoSize={APP_HEADER_LOGO_SIZE}
      className={cn("min-w-0 gap-2", className)}
      // The old preset shouted MAKER COMPASS in uppercase chrome; the kit's
      // wordmark carries its own hierarchy, so the header now renders it as-is.
      labelClassName="truncate text-sm leading-5 text-text-secondary"
    />
  )
}

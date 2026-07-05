import Image from "next/image"
import Link from "next/link"
import { APP_BRAND_LOGO_ALT, APP_BRAND_LOGO_SRC } from "@/lib/app-brand"
import { cn } from "@/lib/utils"

export const APP_HEADER_LOGO_SIZE = 32

interface HeaderLogoProps {
  href?: string
  size?: number
  className?: string
  linked?: boolean
}

export function HeaderLogo({
  href = "/projects",
  size = APP_HEADER_LOGO_SIZE,
  className,
  linked = true,
}: HeaderLogoProps) {
  const content = (
    <Image
      src={APP_BRAND_LOGO_SRC}
      alt={APP_BRAND_LOGO_ALT}
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  )

  if (!linked) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md",
          className
        )}
        style={{ width: size, height: size }}
      >
        {content}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md",
        className
      )}
      style={{ width: size, height: size }}
    >
      {content}
    </Link>
  )
}

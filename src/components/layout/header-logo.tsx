"use client"

import Image from "next/image"
import Link from "next/link"
import { APP_BRAND_LOGO_ALT } from "@/lib/app-brand"
import { cn } from "@/lib/utils"

export const APP_HEADER_LOGO_SIZE = 32

/**
 * Shared header logo.
 * The source file includes a large white canvas, so we scale it inside an
 * overflow-hidden frame to crop out that padding and keep one consistent size.
 */
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
      src="/idea2app-logo.jpg"
      alt={APP_BRAND_LOGO_ALT}
      width={size}
      height={size}
      className="object-cover scale-[1.7]"
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

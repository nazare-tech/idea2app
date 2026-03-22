"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Shared header logo.
 * The source file includes a large white canvas, so we scale it inside an
 * overflow-hidden frame to crop out that padding and keep one consistent size.
 */
interface HeaderLogoProps {
  href?: string
  size?: number
  className?: string
}

export function HeaderLogo({
  href = "/projects",
  size = 24,
  className,
}: HeaderLogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/idea2app-logo.jpg"
        alt="Idea2App logo"
        width={size}
        height={size}
        className="object-cover scale-[1.7]"
        style={{ width: size, height: size }}
      />
    </Link>
  )
}

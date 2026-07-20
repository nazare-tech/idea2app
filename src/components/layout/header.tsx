"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { HeaderBrand } from "@/components/layout/brand-wordmark"
import { HeaderProfileMenu } from "@/components/layout/header-profile-menu"

interface HeaderProps {
  user?: {
    email?: string
    full_name?: string
    avatar_url?: string
  }
  pageTitle?: ReactNode
  children?: ReactNode
  rightContent?: ReactNode
  profileMenuTriggerId?: string
  className?: string
}

export function Header({
  user,
  pageTitle,
  children,
  rightContent,
  profileMenuTriggerId = "app-user-menu-trigger",
  className,
}: HeaderProps) {
  const brand = <HeaderBrand />

  return (
    <header className={cn("grid h-[var(--workspace-desktop-header-height)] shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border-strong bg-background px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]", className)}>
      <div className="flex min-w-0 items-center gap-4">
        {children ?? brand}
      </div>

      <div className="hidden min-w-0 items-center justify-center lg:flex">
        {typeof pageTitle === "string" ? (
          <span className="truncate text-sm font-semibold text-foreground">
            {pageTitle}
          </span>
        ) : (
          pageTitle
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 justify-self-end sm:gap-4">
        {rightContent}
        <HeaderProfileMenu user={user} triggerId={profileMenuTriggerId} />
      </div>
    </header>
  )
}

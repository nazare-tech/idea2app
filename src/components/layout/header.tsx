"use client"

import type { ReactNode } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { APP_HEADER_LOGO_SIZE } from "@/components/layout/header-logo"
import { uiStylePresets } from "@/lib/ui-style-presets"
import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { useAuthSignOut } from "@/hooks/use-auth-signout"
import { CreditBalance } from "@/components/ui/credit-balance"

interface HeaderProps {
  user?: {
    email?: string
    full_name?: string
    avatar_url?: string
  }
  pageTitle?: ReactNode
  children?: ReactNode
  rightContent?: ReactNode
  credits?: number
}

export function Header({ user, pageTitle, children, rightContent, credits }: HeaderProps) {
  const brand = (
    <BrandWordmark
      href="/projects"
      logoSize={APP_HEADER_LOGO_SIZE}
      className="min-w-0"
      labelClassName="truncate text-sm font-medium tracking-normal text-text-secondary"
    />
  )
  const handleSignOut = useAuthSignOut()

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0].toUpperCase() || "U"

  const profileLabel = user?.full_name
    ? (() => {
        const parts = user.full_name.trim().split(/\s+/)
        if (parts.length === 1) return parts[0]
        return `${parts[0]} ${parts[1]?.charAt(0).toUpperCase() || ""}.`
      })()
    : user?.email?.split("@")[0] || "User"

  return (
    <header className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border-subtle bg-background px-4 py-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:py-0">
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              id="app-user-menu-trigger"
              className={uiStylePresets.headerProfileTrigger}
            >
              <Avatar className="h-7 w-7 rounded-full">
                <AvatarImage src={user?.avatar_url} alt={user?.full_name || "User"} />
                <AvatarFallback className={uiStylePresets.authProfileAvatarFallback}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className={`${uiStylePresets.headerProfileLabel} hidden sm:inline`}>
                {profileLabel}
              </span>
              <ChevronDown className="ui-icon-16 text-text-secondary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            aria-labelledby="app-user-menu-trigger"
            className="w-[260px] border border-border-subtle bg-white p-2 text-text-primary"
            align="end"
          >
            {typeof credits === "number" && (
              <DropdownMenuItem className="cursor-default focus:bg-transparent focus:text-text-primary">
                <span className="text-sm ui-font-medium">
                  Credits: <CreditBalance credits={credits} compact />
                </span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link
                href="/preferences?tab=profile"
                className={uiStylePresets.headerOutlineTab}
              >
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/preferences?tab=settings"
                className={uiStylePresets.headerOutlineTab}
              >
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/preferences?tab=subscriptions"
                className={uiStylePresets.headerOutlineTab}
              >
                <span>Subscriptions</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className={uiStylePresets.headerLogoutItem}
            >
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

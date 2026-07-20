"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthSignOut } from "@/hooks/use-auth-signout"
import { uiStylePresets } from "@/lib/ui-style-presets"

interface HeaderProfileMenuProps {
  user?: {
    email?: string
    full_name?: string
    avatar_url?: string
  }
  triggerId?: string
}

function getUserInitials(user?: HeaderProfileMenuProps["user"]) {
  return user?.full_name
    ?.split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase() || user?.email?.[0].toUpperCase() || "U"
}

function getProfileLabel(user?: HeaderProfileMenuProps["user"]) {
  if (user?.full_name) {
    const parts = user.full_name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[1]?.charAt(0).toUpperCase() || ""}.`
  }

  return user?.email?.split("@")[0] || "User"
}

export function HeaderProfileMenu({
  user,
  triggerId = "app-user-menu-trigger",
}: HeaderProfileMenuProps) {
  const handleSignOut = useAuthSignOut()
  const initials = getUserInitials(user)
  const profileLabel = getProfileLabel(user)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          id={triggerId}
          aria-label={`Open profile menu for ${profileLabel}`}
          className="inline-flex h-10 items-center gap-1 rounded-full text-text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2"
        >
          <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-border-strong bg-white p-px">
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarImage src={user?.avatar_url} alt={user?.full_name || "User"} />
              <AvatarFallback className="bg-foreground text-[11px] font-bold text-background">
                {initials}
              </AvatarFallback>
            </Avatar>
          </span>
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        aria-labelledby={triggerId}
        className="w-[260px] border border-border-subtle bg-white p-2 text-text-primary"
        align="end"
      >
        <DropdownMenuItem asChild>
          <Link href="/preferences?tab=profile" className={uiStylePresets.headerOutlineTab}>
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/preferences?tab=settings" className={uiStylePresets.headerOutlineTab}>
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/preferences?tab=subscriptions" className={uiStylePresets.headerOutlineTab}>
            <span>Subscriptions</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className={uiStylePresets.headerLogoutItem}>
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

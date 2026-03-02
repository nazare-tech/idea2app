"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { uiStylePresets } from "@/lib/ui-style-presets"
import { useRouter } from "next/navigation"
import { ChevronDown, Plus } from "lucide-react"
import Link from "next/link"

interface HeaderProps {
  user?: {
    email?: string
    full_name?: string
    avatar_url?: string
  }
  children?: React.ReactNode
  rightContent?: React.ReactNode
}

export function Header({ user, children, rightContent }: HeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

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
    <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-xl px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {children || <h1 className="text-lg font-bold tracking-tight">Dashboard</h1>}
      </div>

        <div className="flex items-center gap-4">
          {rightContent}
          <Link href="/projects/new" prefetch={false}>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={uiStylePresets.headerProfileTrigger}
            >
              <Avatar className="h-7 w-7 rounded-full">
                <AvatarImage src={user?.avatar_url} alt={user?.full_name || "User"} />
                <AvatarFallback className={uiStylePresets.authProfileAvatarFallback}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className={uiStylePresets.headerProfileLabel}>
                {profileLabel}
              </span>
              <ChevronDown className="h-4 w-4 text-[#777777]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[260px] border border-[#E0E0E0] bg-white p-2 text-[#0A0A0A]"
            align="end"
            forceMount
          >
            <DropdownMenuItem asChild>
              <Link
                href="/settings?tab=profile"
                className={uiStylePresets.headerOutlineTab}
              >
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/settings?tab=settings"
                className={uiStylePresets.headerOutlineTab}
              >
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/settings?tab=subscriptions"
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

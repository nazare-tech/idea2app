// src/components/layout/project-header.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Pencil } from "lucide-react"
import { HeaderLogo, APP_HEADER_LOGO_SIZE } from "@/components/layout/header-logo"
import { useAuthSignOut } from "@/hooks/use-auth-signout"
import { CreditBalance } from "@/components/ui/credit-balance"
import { APP_BRAND_NAME } from "@/lib/app-brand"
import { uiStylePresets } from "@/lib/ui-style-presets"

interface ProjectHeaderProps {
  projectName: string
  isNameSet: boolean
  nameJustSet: boolean
  onStartRename: () => void
  onFinishRename: (name: string) => Promise<void>
  isSavingName: boolean
  user: {
    email?: string
    full_name?: string
    avatar_url?: string
  }
  credits: number
}

export function ProjectHeader({
  projectName,
  isNameSet,
  nameJustSet,
  onStartRename,
  onFinishRename,
  isSavingName,
  user,
  credits,
}: ProjectHeaderProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(projectName)
  const inputRef = useRef<HTMLInputElement>(null)
  const handleSignOut = useAuthSignOut()

  useEffect(() => {
    setDraft(projectName)
  }, [projectName])

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const finishEdit = async () => {
    const trimmed = draft.trim()
    setIsEditing(false)
    if (trimmed && trimmed !== projectName) {
      await onFinishRename(trimmed)
    } else {
      setDraft(projectName)
    }
  }

  const initials = user.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user.email?.[0].toUpperCase() || "U"

  const profileLabel = user.full_name
    ? (() => {
        const parts = user.full_name.trim().split(/\s+/)
        if (parts.length === 1) return parts[0]
        return `${parts[0]} ${parts[1]?.charAt(0).toUpperCase() || ""}.`
      })()
    : user.email?.split("@")[0] || "User"

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/40 bg-white px-6">
      {/* Left: Brand wordmark */}
      <Link href="/projects" className="flex items-center gap-3">
        <HeaderLogo size={APP_HEADER_LOGO_SIZE} linked={false} />
        <span className="text-sm font-medium text-text-secondary">
          {APP_BRAND_NAME}
        </span>
      </Link>

      {/* Center: Breadcrumb */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        <Link
          href="/projects"
          className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
        >
          Projects
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        {isEditing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void finishEdit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); void finishEdit() }
              if (e.key === "Escape") { setDraft(projectName); setIsEditing(false) }
            }}
            className="h-8 w-[min(22rem,40vw)] rounded-xl border border-border-strong bg-background px-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary/60 focus:bg-accent-primary-faint focus:ring-2 focus:ring-accent-primary-light"
            disabled={isSavingName}
          />
        ) : isNameSet ? (
          <button
            type="button"
            onClick={() => { setIsEditing(true); onStartRename() }}
            className="flex items-center gap-2 text-left"
          >
            <span
              className="text-sm font-semibold text-foreground"
              style={nameJustSet ? { animation: "projectNameFadeIn 0.7s ease forwards" } : undefined}
            >
              {projectName}
            </span>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ) : (
          <div className="flex items-center gap-2 cursor-default select-none">
            <span className="text-sm font-semibold text-muted-foreground">
              {projectName}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
              ✦ AI naming
            </span>
          </div>
        )}
      </div>

      {/* Right: User avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-full border border-border/60 bg-secondary/50 px-3 py-1.5"
          >
            <Avatar className="h-7 w-7 rounded-full">
              <AvatarImage src={user.avatar_url} alt={user.full_name || "User"} />
              <AvatarFallback className="bg-foreground text-[11px] font-bold text-background">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-[13px] font-medium text-foreground">
              {profileLabel}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[260px] border border-border-subtle bg-white p-2 text-text-primary"
          align="end"
        >
          {typeof credits === "number" && (
            <DropdownMenuItem className="cursor-default focus:bg-transparent focus:text-text-primary">
              <span className="text-sm font-medium">
                Credits: <CreditBalance credits={credits} compact />
              </span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => router.push("/preferences?tab=profile")}
            className={uiStylePresets.headerOutlineTab}
          >
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => router.push("/preferences?tab=settings")}
            className={uiStylePresets.headerOutlineTab}
          >
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => router.push("/preferences?tab=subscriptions")}
            className={uiStylePresets.headerOutlineTab}
          >
            <span>Subscriptions</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut} className={uiStylePresets.headerLogoutItem}>
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

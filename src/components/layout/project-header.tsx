// src/components/layout/project-header.tsx
"use client"

import { useState, useRef, useEffect, type MouseEvent } from "react"
import Link from "next/link"
import { ChevronLeft, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { HeaderBrand } from "@/components/layout/brand-wordmark"
import { Header } from "@/components/layout/header"
import { HeaderProfileMenu } from "@/components/layout/header-profile-menu"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

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
  /** Mobile chrome auto-hide state; the desktop header never hides. */
  mobileChromeHidden?: boolean
}

export function ProjectHeader({
  projectName,
  isNameSet,
  nameJustSet,
  onStartRename,
  onFinishRename,
  isSavingName,
  user,
  mobileChromeHidden = false,
}: ProjectHeaderProps) {
  const reduceMotion = useReducedMotion()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(projectName)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const navigateToProjects = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }

    event.preventDefault()
    window.location.assign("/projects")
  }

  const breadcrumb = (
    <div className="flex min-w-0 items-center justify-center gap-1">
      <Link
        href="/projects"
        onClick={navigateToProjects}
        className="text-base font-normal leading-5 text-text-secondary transition-colors hover:text-foreground"
      >
        Projects
      </Link>
      <span className="text-sm font-normal leading-5 text-muted-foreground">/</span>
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
          className="h-8 w-[min(24rem,40vw)] rounded-lg border border-border-strong bg-card px-2.5 text-base font-semibold leading-5 text-foreground outline-none focus:border-primary/60 focus:bg-accent-primary-faint focus:ring-2 focus:ring-accent-primary-light"
          disabled={isSavingName}
        />
      ) : isNameSet ? (
        <button
          type="button"
          onClick={() => { setIsEditing(true); onStartRename() }}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span
            className="max-w-[40vw] truncate text-base font-semibold leading-5 text-foreground"
            style={nameJustSet ? { animation: "projectNameFadeIn 0.7s ease forwards" } : undefined}
          >
            {projectName}
          </span>
          <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <div className="flex min-w-0 cursor-default select-none items-center gap-2">
          <span className="max-w-[40vw] truncate text-base font-semibold leading-5 text-muted-foreground">
            {projectName}
          </span>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile slim header (design: back, project name, profile — no overflow
          menu). Overlays the scroller so hiding it frees the full viewport. */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-30 flex h-[52px] items-center gap-1 border-b border-border-strong bg-background pl-1.5 pr-3 lg:hidden",
          !reduceMotion && "transition-transform duration-[280ms] ease-[var(--ease-out-expo)]",
          mobileChromeHidden ? "-translate-y-[110%]" : "translate-y-0",
        )}
      >
        <Link
          href="/projects"
          onClick={navigateToProjects}
          aria-label="Back to projects"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary"
        >
          <ChevronLeft aria-hidden="true" className="h-[22px] w-[22px]" />
        </Link>
        <span className="min-w-0 flex-1 truncate text-base font-semibold leading-5 text-foreground">
          {projectName}
        </span>
        <HeaderProfileMenu user={user} triggerId="project-user-menu-trigger-mobile" />
      </div>

      <Header
        user={user}
        pageTitle={breadcrumb}
        profileMenuTriggerId="project-user-menu-trigger"
        className="hidden lg:grid"
      >
        <HeaderBrand onClick={navigateToProjects} />
      </Header>
    </>
  )
}

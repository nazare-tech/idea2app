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
import { PROJECT_NAME_MAX_LENGTH, validateProjectName } from "@/lib/project-name"

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
  const [nameError, setNameError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const finishInFlightRef = useRef(false)

  useEffect(() => {
    setDraft(projectName)
  }, [projectName])

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const finishEdit = async () => {
    if (finishInFlightRef.current) return

    const validation = validateProjectName(draft)
    if (!validation.ok) {
      setNameError(validation.error)
      return
    }

    if (validation.name === projectName) {
      setDraft(projectName)
      setNameError(null)
      setIsEditing(false)
      return
    }

    setDraft(validation.name)
    setNameError(null)
    finishInFlightRef.current = true
    try {
      await onFinishRename(validation.name)
      setIsEditing(false)
    } catch {
      setNameError("Unable to rename project. Please try again.")
    } finally {
      finishInFlightRef.current = false
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
        <div className="relative">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (nameError) setNameError(null)
            }}
            onBlur={() => void finishEdit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); void finishEdit() }
              if (e.key === "Escape") {
                setDraft(projectName)
                setNameError(null)
                setIsEditing(false)
              }
            }}
            maxLength={PROJECT_NAME_MAX_LENGTH}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "project-header-name-error" : undefined}
            className="h-8 w-[min(24rem,40vw)] rounded-lg border border-border-strong bg-card px-2.5 text-base font-semibold leading-5 text-foreground outline-none focus:border-ring/60 focus:bg-ring-faint focus:ring-2 focus:ring-ring-soft"
            disabled={isSavingName}
          />
          {nameError && (
            <p
              id="project-header-name-error"
              role="alert"
              className="absolute left-0 top-full z-40 mt-1 whitespace-nowrap rounded-md border border-border-strong bg-card px-2 py-1 text-xs text-destructive shadow-sm"
            >
              {nameError}
            </p>
          )}
        </div>
      ) : isNameSet ? (
        <button
          type="button"
          onClick={() => { setNameError(null); setIsEditing(true); onStartRename() }}
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
          "absolute inset-x-0 top-0 z-30 flex h-[var(--workspace-mobile-header-height)] items-center gap-1 border-b border-border-strong bg-background pl-1.5 pr-3 lg:hidden",
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
        {/* px-2 keeps the truncation ellipsis clear of the back arrow and the
            profile avatar instead of running flush into them. */}
        <span className="min-w-0 flex-1 truncate px-2 text-base font-semibold leading-5 text-foreground">
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
        <HeaderBrand
          logoSrc="/maker-compass-mark-blue.svg"
          onClick={navigateToProjects}
        />
      </Header>
    </>
  )
}

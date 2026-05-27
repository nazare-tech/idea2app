// src/components/layout/project-header.tsx
"use client"

import { useState, useRef, useEffect, type MouseEvent } from "react"
import Link from "next/link"
import { Pencil } from "lucide-react"
import { HeaderBrand } from "@/components/layout/header-brand"
import { HeaderProfileMenu } from "@/components/layout/header-profile-menu"

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

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-border-strong bg-background px-6">
      <HeaderBrand onClick={navigateToProjects} />

      <div className="absolute left-1/2 hidden min-w-0 -translate-x-1/2 items-center justify-center gap-1 lg:flex">
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

      <HeaderProfileMenu user={user} credits={credits} triggerId="project-user-menu-trigger" />
    </header>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { MouseEvent } from "react"
import { UpgradeCtaLink } from "@/components/analytics/upgrade-cta-link"

interface DashboardProjectCardProps {
  id: string
  name: string
  description: string | null
  href: string
  createdAt: string | null
  updatedAt: string | null
  showDelete?: boolean
  canDelete?: boolean
}

function getProjectCardDescription(description: string | null) {
  const displayDescription = description?.replace(/^Business idea summary:\s*/i, "").trim()
  return displayDescription || "No project context captured yet."
}

export function DashboardProjectCard({
  id,
  name,
  description,
  href,
  createdAt,
  updatedAt,
  showDelete = false,
  canDelete = false,
}: DashboardProjectCardProps) {
  const router = useRouter()
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const displayDescription = useMemo(() => getProjectCardDescription(description), [description])
  const createdLabel = useMemo(() => {
    const timestamp = createdAt ?? updatedAt

    if (!timestamp) {
      return "Created: recently"
    }

    try {
      return `Created: ${formatDistanceToNow(new Date(timestamp))} ago`
    } catch {
      return "Created: recently"
    }
  }, [createdAt, updatedAt])

  useEffect(() => {
    if (!isOpening) return

    router.prefetch(href)
    void fetch(`/api/projects/${id}/workspace?docs=competitive`, {
      credentials: "same-origin",
    }).catch(() => {
      // Warm best-effort only
    })
  }, [href, id, isOpening, router])

  const handleDeletePrompt = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (isDeleting) return

    if (!canDelete) {
      setShowUpgradePrompt(true)
      return
    }

    setShowDeleteConfirmation(true)
  }

  const handleDelete = async () => {
    if (isDeleting) return

    let didDelete = false
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${id}`, { method: "DELETE" })

      if (!response.ok) {
        let message = "Unable to delete project"
        try {
          const result = await response.json()
          if (result?.error) message = result.error
        } catch {
          // Ignore parse errors
        }
        throw new Error(message)
      }

      didDelete = true
      setIsDeleted(true)
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to delete project")
    } finally {
      if (!didDelete) {
        setIsDeleting(false)
      }
    }
  }

  if (isDeleted) {
    return null
  }

  return (
    <div className="group relative">
      <Link
        href={href}
        onMouseEnter={() => setIsOpening(true)}
        onFocus={() => setIsOpening(true)}
        onClick={() => setIsOpening(true)}
        className="block h-full min-h-[188px] rounded-lg border border-border-strong bg-card p-[21px] transition-[background-color,border-color] duration-200 ease-out-expo hover:border-text-primary/20 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="space-y-2">
            <h2 className="truncate pr-10 text-[18px] font-bold leading-[1.2] text-text-primary">
              {name}
            </h2>
            <p className="min-h-[72px] overflow-hidden line-clamp-4 text-sm leading-[1.3] text-text-secondary">
              {displayDescription}
            </p>
          </div>
          <div className="flex justify-end">
            <p className="whitespace-nowrap text-sm leading-[1.3] text-text-secondary">
              {createdLabel}
            </p>
          </div>
        </div>
      </Link>

      {showDelete && (
        <button
          type="button"
          onClick={handleDeletePrompt}
          disabled={isDeleting}
          aria-label={`Delete ${name}`}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-destructive/90 text-white opacity-100 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
        >
          <Trash2 className="ui-icon-16" />
        </button>
      )}

      {showDeleteConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!isDeleting) {
              setShowDeleteConfirmation(false)
            }
          }}
        >
          <div
            className="w-full max-w-[560px] rounded-xl border border-border-strong bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[28px] leading-[1.1] font-bold tracking-[-1px] text-text-primary">
              Delete project?
            </h3>
            <p className="mt-4 ui-type-body text-text-secondary">
              You are about to permanently delete &quot;{name}&quot;. This action removes all
              environments, deployment history, and collaborator access. This cannot be
              undone.
            </p>
            <p className="mt-4 ui-type-caption ui-font-semibold text-destructive">
              Warning: deleting this project is permanent.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmation(false)}
                disabled={isDeleting}
                className="h-11 rounded-md border border-border-strong bg-white px-5 text-[13px] ui-font-semibold text-text-primary disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDelete()
                }}
                disabled={isDeleting}
                className="h-11 rounded-md bg-destructive px-5 text-[13px] ui-font-semibold text-destructive-foreground disabled:opacity-40"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgradePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowUpgradePrompt(false)}
        >
          <div
            className="w-full max-w-[560px] rounded-xl border border-border-strong bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[28px] leading-[1.1] font-bold tracking-[-1px] text-text-primary">
              Upgrade to delete projects
            </h3>
            <p className="mt-4 text-[14px] leading-[1.5] text-text-secondary">
              Project deletion is only available on paid plans. Upgrade your plan to remove old projects and manage your workspace more flexibly.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUpgradePrompt(false)}
                className="h-11 rounded-md border border-border-strong bg-white px-5 text-[13px] ui-font-semibold text-text-primary"
              >
                Not now
              </button>
              <UpgradeCtaLink
                surface="project_delete"
                projectId={id}
                className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-[13px] ui-font-semibold text-primary-foreground"
              >
                Upgrade plan
              </UpgradeCtaLink>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

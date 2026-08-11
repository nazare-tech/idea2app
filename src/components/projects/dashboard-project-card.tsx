"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { Ellipsis, Pencil, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { UpgradeCtaLink } from "@/components/analytics/upgrade-cta-link"
import { ProjectCardDetails } from "@/components/projects/dashboard-project-card-details"
import { ProjectCardThumbnail } from "@/components/projects/dashboard-project-thumbnail"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { validateProjectName } from "@/lib/project-name"
import { requestProjectRename } from "@/lib/project-rename-client"
import { getProjectUrl } from "@/lib/project-routing"

interface DashboardProjectCardProps {
  id: string
  name: string
  description: string | null
  href: string
  createdAt: string | null
  updatedAt: string | null
  thumbnailUrl: string | null
  thumbnailUnavailable?: boolean
  showActions?: boolean
  canDelete?: boolean
}

export function DashboardProjectCard({
  id,
  name,
  description,
  href,
  createdAt,
  updatedAt,
  thumbnailUrl,
  thumbnailUnavailable = false,
  showActions = false,
  canDelete = false,
}: DashboardProjectCardProps) {
  const router = useRouter()
  const [projectName, setProjectName] = useState(name)
  const [projectHref, setProjectHref] = useState(href)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [renameDraft, setRenameDraft] = useState(name)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const actionButtonRef = useRef<HTMLButtonElement>(null)
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
    setProjectName(name)
    setProjectHref(href)
  }, [href, name])

  useEffect(() => {
    if (!isOpening) return

    router.prefetch(projectHref)
    void fetch(`/api/projects/${id}/workspace?docs=competitive`, {
      credentials: "same-origin",
    }).catch(() => {
      // Warm best-effort only
    })
  }, [id, isOpening, projectHref, router])

  const handleDeletePrompt = () => {
    if (isDeleting) return

    setActionsOpen(false)
    if (!canDelete) {
      setShowUpgradePrompt(true)
      return
    }

    setShowDeleteConfirmation(true)
  }

  const handleRenamePrompt = () => {
    setActionsOpen(false)
    setRenameDraft(projectName)
    setRenameError(null)
    setShowRename(true)
  }

  const handleRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isRenaming) return

    const validation = validateProjectName(renameDraft)
    if (!validation.ok) {
      setRenameError(validation.error)
      return
    }

    if (validation.name === projectName) {
      setShowRename(false)
      return
    }

    setRenameDraft(validation.name)
    setRenameError(null)
    setIsRenaming(true)
    try {
      const persistedName = await requestProjectRename({
        projectId: id,
        draft: validation.name,
      })
      setProjectName(persistedName)
      setProjectHref(getProjectUrl({ id, name: persistedName }))
      setShowRename(false)
      router.refresh()
    } catch (error) {
      setRenameError(
        error instanceof Error
          ? error.message
          : "Unable to rename project. Please try again.",
      )
    } finally {
      setIsRenaming(false)
    }
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
    <div className="group relative h-full">
      <Link
        data-testid="dashboard-project-card"
        href={projectHref}
        onMouseEnter={() => setIsOpening(true)}
        onFocus={() => setIsOpening(true)}
        onClick={() => setIsOpening(true)}
        className="flex h-[500px] flex-col overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ProjectCardThumbnail
          thumbnailUrl={thumbnailUrl}
          unavailable={thumbnailUnavailable}
        />
        <ProjectCardDetails
          name={projectName}
          description={description}
          createdLabel={createdLabel}
          reserveTitleActionSpace={showActions}
        />
      </Link>

      {showActions && (
        <div className="pointer-events-none absolute bottom-0 right-0 z-10 h-[160.6px] py-5 pl-2">
          <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
            <DropdownMenuTrigger asChild>
              <button
                ref={actionButtonRef}
                type="button"
                data-testid="dashboard-project-card-actions"
                aria-label={`Project actions for ${projectName}`}
                className="pointer-events-auto -mt-[5px] inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Ellipsis aria-hidden="true" className="h-[18px] w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              collisionPadding={8}
              className="w-36"
              onCloseAutoFocus={(event) => {
                if (showRename || showDeleteConfirmation || showUpgradePrompt) {
                  event.preventDefault()
                }
              }}
            >
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  handleRenamePrompt()
                }}
              >
                <Pencil aria-hidden="true" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  handleDeletePrompt()
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Dialog.Root
        open={showRename}
        onOpenChange={(open) => {
          if (!isRenaming) {
            setShowRename(open)
            if (!open) setRenameError(null)
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-strong bg-white p-6 shadow-2xl focus:outline-none"
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              actionButtonRef.current?.focus()
            }}
          >
            <Dialog.Title className="text-[28px] font-bold leading-[1.1] tracking-[-1px] text-text-primary">
              Rename
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-[14px] leading-[1.5] text-text-secondary">
              Choose a clear name for this project.
            </Dialog.Description>
            <form className="mt-5" onSubmit={handleRename}>
              <label
                htmlFor={`project-rename-${id}`}
                className="block text-[13px] font-semibold text-text-primary"
              >
                Project name
              </label>
              <input
                id={`project-rename-${id}`}
                value={renameDraft}
                onChange={(event) => {
                  setRenameDraft(event.target.value)
                  if (renameError) setRenameError(null)
                }}
                aria-invalid={Boolean(renameError)}
                aria-describedby={renameError ? `project-rename-error-${id}` : undefined}
                disabled={isRenaming}
                className="mt-2 h-11 w-full rounded-md border border-border-strong bg-white px-3 text-[14px] text-text-primary outline-none focus:border-ring focus:ring-2 focus:ring-ring-soft disabled:opacity-60"
              />
              {renameError && (
                <p
                  id={`project-rename-error-${id}`}
                  role="alert"
                  className="mt-2 text-[13px] text-destructive"
                >
                  {renameError}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    disabled={isRenaming}
                    className="h-11 rounded-md border border-border-strong bg-white px-5 text-[13px] font-semibold text-text-primary disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isRenaming || renameDraft.trim().length === 0}
                  className="h-11 rounded-md bg-primary px-5 text-[13px] font-semibold text-primary-foreground disabled:opacity-40"
                >
                  {isRenaming ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={showDeleteConfirmation}
        onOpenChange={(open) => {
          if (!isDeleting) setShowDeleteConfirmation(open)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-strong bg-white p-6 shadow-2xl focus:outline-none"
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              actionButtonRef.current?.focus()
            }}
          >
            <Dialog.Title className="text-[28px] leading-[1.1] font-bold tracking-[-1px] text-text-primary">
              Delete project?
            </Dialog.Title>
            <Dialog.Description className="mt-4 ui-type-body text-text-secondary">
              You are about to permanently delete &quot;{projectName}&quot;. This action removes all
              environments, deployment history, and collaborator access. This cannot be
              undone.
            </Dialog.Description>
            <p className="mt-4 ui-type-caption ui-font-semibold text-destructive">
              Warning: deleting this project is permanent.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={isDeleting}
                  className="h-11 rounded-md border border-border-strong bg-white px-5 text-[13px] ui-font-semibold text-text-primary disabled:opacity-40"
                >
                  Cancel
                </button>
              </Dialog.Close>
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
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-strong bg-white p-6 shadow-2xl focus:outline-none"
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              actionButtonRef.current?.focus()
            }}
          >
            <Dialog.Title className="text-[28px] leading-[1.1] font-bold tracking-[-1px] text-text-primary">
              Upgrade to delete projects
            </Dialog.Title>
            <Dialog.Description className="mt-4 text-[14px] leading-[1.5] text-text-secondary">
              Project deletion is only available on paid plans. Upgrade your plan to remove old projects and manage your workspace more flexibly.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="h-11 rounded-md border border-border-strong bg-white px-5 text-[13px] ui-font-semibold text-text-primary"
                >
                  Not now
                </button>
              </Dialog.Close>
              <UpgradeCtaLink
                surface="project_delete"
                projectId={id}
                className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-[13px] ui-font-semibold text-primary-foreground"
              >
                Upgrade plan
              </UpgradeCtaLink>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"

const BILLING_PATH = "/billing"

interface ProjectLimitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  used: number
  planName: string
}

function buildCountLine(used: number, planName: string) {
  const projectWord = used === 1 ? "project" : "projects"
  return `You've created ${used} ${projectWord} on the ${planName} plan, which is your limit.`
}

/**
 * Controlled dialog shown when a user who is out of project allowance tries to
 * start a new project. Primary action routes to billing; the caller owns close
 * behavior via onOpenChange (dismiss in place, or route away for the /projects/new
 * gate).
 */
export function ProjectLimitDialog({ open, onOpenChange, used, planName }: ProjectLimitDialogProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    onOpenChange(false)
    router.push(BILLING_PATH)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border-subtle bg-card p-6 shadow-2xl focus:outline-none sm:p-8"
        >
          <Dialog.Close asChild>
            <button
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-text-secondary transition-colors hover:bg-secondary hover:text-foreground focus:outline-none"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Dialog.Close>

          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
            Project limit reached
          </p>
          <Dialog.Title className="mt-2 font-[family:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-text-primary">
            You&apos;ve used all your projects
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-relaxed text-text-secondary">
            {buildCountLine(used, planName)} Upgrade your plan to start another project.
          </Dialog.Description>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-md border-border-subtle bg-transparent px-[18px] text-[13px] font-medium text-text-primary hover:bg-background"
            >
              Maybe later
            </Button>
            <Button
              type="button"
              onClick={handleUpgrade}
              className="h-10 rounded-md bg-primary px-[18px] text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
              data-testid="project-limit-upgrade"
            >
              Upgrade
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface NewProjectButtonProps {
  canCreate: boolean
  used: number
  planName: string
  className?: string
  label?: string
}

/**
 * "New Project" affordance for the dashboard. When the user still has allowance it
 * links straight to the intake wizard; when they are out of projects it opens the
 * upgrade dialog in place instead of navigating.
 */
export function NewProjectButton({
  canCreate,
  used,
  planName,
  className,
  label = "New Project",
}: NewProjectButtonProps) {
  const [open, setOpen] = useState(false)

  if (canCreate) {
    return (
      <Link href="/projects/new" className="shrink-0" prefetch={false}>
        <Button className={className}>{label}</Button>
      </Link>
    )
  }

  return (
    <>
      <Button type="button" className={className} onClick={() => setOpen(true)} data-testid="new-project-blocked">
        {label}
      </Button>
      <ProjectLimitDialog open={open} onOpenChange={setOpen} used={used} planName={planName} />
    </>
  )
}

/**
 * Route gate for /projects/new: when a blocked user reaches the wizard directly
 * (deep link or landing handoff), show the upgrade dialog and route back to the
 * projects dashboard on dismiss so the wizard is never usable past the limit.
 */
export function ProjectLimitRouteGate({
  used,
  planName,
}: {
  used: number
  planName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  return (
    <div className="min-h-[calc(100vh-112px)] bg-background" data-testid="project-limit-gate">
      <ProjectLimitDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) router.push("/projects")
        }}
        used={used}
        planName={planName}
      />
    </div>
  )
}

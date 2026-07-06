"use client"

import React from "react"
import { Check, Copy, Download, FileText, X } from "lucide-react"

/**
 * Small square icon button used in artifact cards and the lightbox header.
 */
export function ArtifactActionButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center border border-[#E8DDD5] bg-white text-[#4A4040] transition-colors hover:border-[#D8CEC5] hover:bg-[#F8F4F1] hover:text-[#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/**
 * Shared lightbox shell for previewing generated artifacts (markdown files,
 * mockup images). Renders a dark overlay with a white panel: a header bar with
 * the file name plus copy/download/close actions, and a scrollable body.
 * Escape and click-outside close it; body scroll is locked while open.
 */
export function ArtifactLightbox({
  fileName,
  onClose,
  onCopy,
  copied = false,
  onDownload,
  maxWidthClassName = "max-w-4xl",
  children,
}: {
  fileName: string
  onClose: () => void
  /** Omit to hide the copy action */
  onCopy?: () => void
  copied?: boolean
  /** Omit to hide the download action */
  onDownload?: () => void
  /** Tailwind max-width class for the panel; wide artifacts can pass a larger one */
  maxWidthClassName?: string
  children: React.ReactNode
}) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${fileName} preview`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[calc(100vh-4rem)] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-lg bg-white shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#E8DDD5] px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.9} />
            <span className="truncate font-mono text-[12px] tracking-[0.06em] text-[#1C1917]">
              {fileName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onCopy ? (
              <ArtifactActionButton
                label={copied ? `Copied ${fileName}` : `Copy ${fileName}`}
                onClick={onCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-[#22C55E]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </ArtifactActionButton>
            ) : null}
            {onDownload ? (
              <ArtifactActionButton label={`Download ${fileName}`} onClick={onDownload}>
                <Download className="h-3.5 w-3.5" />
              </ArtifactActionButton>
            ) : null}
            <ArtifactActionButton label="Close preview" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </ArtifactActionButton>
          </div>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

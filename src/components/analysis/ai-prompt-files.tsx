"use client"

import React from "react"
import { Copy, Download, FileText } from "lucide-react"
import { Check } from "@/components/icons/brand-icons"

import {
  ArtifactActionButton,
  ArtifactLightbox,
} from "@/components/ui/artifact-lightbox"
import { cn } from "@/lib/utils"
import { isUuid, PROMPT_FILE_NAMES, type ProductEventPropertyMap } from "@/lib/product-analytics/contracts"
import { trackClientProductEvent } from "@/lib/product-analytics/client"
import { displayFontClass } from "./planning-blocks-shared"
import type {
  AiPromptFile,
  AiPromptFileDescriptor,
} from "@/lib/ai-prompt-files"

export function InlineMarkdown({ value }: { value: string }) {
  const nodes: React.ReactNode[] = []
  const pattern = /\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*[^*\s][^*]*\*/g
  let lastIndex = 0
  let key = 0

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0
    const token = match[0]
    if (index > lastIndex) nodes.push(value.slice(lastIndex, index))

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-[#1C1917]">
          {token.slice(2, -2)}
        </strong>,
      )
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key++} className="rounded-sm bg-[#F5F0EB] px-1 py-0.5 font-mono text-[0.92em] text-[#1C1917]">
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith("[")) {
      const text = token.match(/^\[([^\]]+)\]/)?.[1] ?? token
      const url = token.match(/\((https?:\/\/[^)\s]+)\)$/)?.[1] ?? "#"
      nodes.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-[#D8CEC5] underline-offset-2 transition-colors hover:decoration-primary"
        >
          {text}
        </a>,
      )
    } else {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>)
    }
    lastIndex = index + token.length
  }

  if (lastIndex < value.length) nodes.push(value.slice(lastIndex))

  return <>{nodes}</>
}

/**
 * Sentence-case display name for the lightbox header, derived from the file
 * name: "user-stories-and-acceptance-criteria.md" → "User stories and
 * acceptance criteria". Download names stay kebab-case.
 */
export function humanizeFileName(fileName: string) {
  const words = fileName.replace(/\.[a-z0-9]+$/i, "").split("-")
  return words
    .map((word, index) => {
      if (word === "ai") return "AI"
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1)
      return word
    })
    .join(" ")
}

function downloadMarkdownFile(file: AiPromptFile) {
  const blob = new Blob([file.content], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = file.fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * Dark monospace file view used inside the lightbox. Every prompt file shows
 * its content exactly as it will be copied or downloaded, in the same
 * terminal-style block the Next Prompt uses.
 */
function FileContentView({ content }: { content: string }) {
  return (
    <pre className="m-0 min-h-full whitespace-pre-wrap bg-[#1C1917] px-6 py-5 font-mono text-[12px] leading-[1.7] text-[#D9D3CE]">
      {content}
    </pre>
  )
}

/**
 * Non-interactive placeholder for a prompt file that has not been written
 * yet: same card frame, muted identity, skeleton body, and a Queued badge
 * instead of the copy/download actions.
 */
function AiPromptFilePlaceholderCard({ file }: { file: AiPromptFileDescriptor }) {
  return (
    <article
      id={file.anchorId}
      className="flex flex-col border border-dashed border-[#E8DDD5] bg-[#FAFAFA]"
    >
      <div className="flex flex-1 flex-col items-start gap-2 px-5 pb-4 pt-5">
        <span className="flex items-center gap-2">
          <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-[#C9C1B8]" strokeWidth={1.9} />
          <span className="font-mono text-[11px] tracking-[0.06em] text-[#8A8480]">
            {file.fileName}
          </span>
        </span>
        <span className={cn(displayFontClass, "text-[16px] font-bold leading-tight tracking-[-0.02em] text-[#8A8480]")}>
          {file.title}
        </span>
        <span className="mt-1 w-full space-y-2" aria-hidden="true">
          <span className="block h-3 w-[88%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
          <span className="block h-3 w-[62%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-[#E8DDD5] px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8480]">
          Markdown
        </span>
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8480]">
          Queued
        </span>
      </div>
    </article>
  )
}

/**
 * Grid of markdown file cards. Clicking a card opens the file in a lightbox
 * (same interaction as design mockups) with the same copy/download actions.
 * `pendingFiles` render after the real cards as non-interactive queued
 * placeholders while their source sections are still being generated.
 */
export function AiPromptFileGrid({
  files,
  pendingFiles = [],
  projectId,
}: {
  files: AiPromptFile[]
  pendingFiles?: AiPromptFileDescriptor[]
  projectId?: string
}) {
  const [activeFile, setActiveFile] = React.useState<AiPromptFile | null>(null)
  const [copiedFileName, setCopiedFileName] = React.useState<string | null>(null)
  const copyResetRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const gridRef = React.useRef<HTMLDivElement>(null)

  const impressionTimersRef = React.useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const impressedFilesRef = React.useRef(new Set<string>())

  const trackPromptAction = React.useCallback((
    eventName: "prompt_file_opened" | "prompt_file_copied" | "prompt_file_downloaded",
    file: AiPromptFile,
    surface: "card" | "lightbox",
  ) => {
    const fileName = getTrackedPromptFileName(file.fileName)
    if (!isAnalyticsProjectId(projectId) || !fileName) return
    trackClientProductEvent(eventName, { fileName, surface }, { projectId })
  }, [projectId])

  const handleCopy = React.useCallback(async (file: AiPromptFile, surface: "card" | "lightbox") => {
    try {
      await navigator.clipboard.writeText(file.content)
      trackPromptAction("prompt_file_copied", file, surface)
      setCopiedFileName(file.fileName)
      if (copyResetRef.current) clearTimeout(copyResetRef.current)
      copyResetRef.current = setTimeout(() => setCopiedFileName(null), 2000)
    } catch {
      // Clipboard unavailable (e.g. insecure context); the download button still works.
    }
  }, [trackPromptAction])

  const handleDownload = React.useCallback((file: AiPromptFile, surface: "card" | "lightbox") => {
    downloadMarkdownFile(file)
    trackPromptAction("prompt_file_downloaded", file, surface)
  }, [trackPromptAction])

  React.useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current)
    }
  }, [])

  React.useEffect(() => {
    if (!isAnalyticsProjectId(projectId) || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const fileName = (entry.target as HTMLElement).dataset.promptFile
        if (!fileName || impressedFilesRef.current.has(fileName)) continue
        const existingTimer = impressionTimersRef.current.get(fileName)
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (existingTimer) continue
          impressionTimersRef.current.set(fileName, setTimeout(() => {
            impressionTimersRef.current.delete(fileName)
            const trackedFileName = getTrackedPromptFileName(fileName)
            if (!trackedFileName || impressedFilesRef.current.has(fileName)) return
            impressedFilesRef.current.add(fileName)
            trackClientProductEvent("prompt_file_impression", { fileName: trackedFileName }, { projectId })
          }, 1_000))
        } else if (existingTimer) {
          clearTimeout(existingTimer)
          impressionTimersRef.current.delete(fileName)
        }
      }
    }, { threshold: [0.5] })

    const cards = gridRef.current?.querySelectorAll<HTMLElement>("[data-prompt-file]") ?? []
    cards.forEach((card) => observer.observe(card))
    const timers = impressionTimersRef.current
    return () => {
      observer.disconnect()
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [files, projectId])

  if (files.length === 0 && pendingFiles.length === 0) return null

  return (
    <div ref={gridRef} className="grid gap-4 md:grid-cols-2">
      {files.map((file) => {
        const isCopied = copiedFileName === file.fileName

        return (
          <article
            key={file.fileName}
            id={file.anchorId}
            data-prompt-file={file.fileName}
            className="group flex flex-col border border-[#E8DDD5] bg-white transition-colors hover:border-[#D8CEC5]"
          >
            <button
              type="button"
              aria-label={`Open ${file.fileName} preview`}
              className="flex flex-1 flex-col items-start gap-2 px-5 pb-4 pt-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={() => {
                setActiveFile(file)
                trackPromptAction("prompt_file_opened", file, "card")
              }}
            >
              <span className="flex items-center gap-2">
                <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.9} />
                <span className="font-mono text-[11px] tracking-[0.06em] text-[#8A8480]">
                  {file.fileName}
                </span>
              </span>
              <span className={cn(displayFontClass, "text-[16px] font-bold leading-tight tracking-[-0.02em] text-[#1C1917]")}>
                {file.title}
              </span>
              <span className="text-[13px] leading-[1.5] text-[#4A4040]">{file.description}</span>
            </button>

            <div className="flex items-center justify-between border-t border-[#E8DDD5] px-5 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8480]">
                Markdown
              </span>
              <div className="flex items-center gap-1.5">
                <ArtifactActionButton
                  label={isCopied ? `Copied ${file.fileName}` : `Copy ${file.fileName}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleCopy(file, "card")
                  }}
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-[#22C55E]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </ArtifactActionButton>
                <ArtifactActionButton
                  label={`Download ${file.fileName}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDownload(file, "card")
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </ArtifactActionButton>
              </div>
            </div>
          </article>
        )
      })}

      {pendingFiles.map((file) => (
        <AiPromptFilePlaceholderCard key={file.fileName} file={file} />
      ))}

      {activeFile && (
        <ArtifactLightbox
          fileName={activeFile.fileName}
          displayName={humanizeFileName(activeFile.fileName)}
          copied={copiedFileName === activeFile.fileName}
          onCopy={() => void handleCopy(activeFile, "lightbox")}
          onDownload={() => handleDownload(activeFile, "lightbox")}
          onClose={() => setActiveFile(null)}
        >
          <FileContentView content={activeFile.content} />
        </ArtifactLightbox>
      )}
    </div>
  )
}

function getTrackedPromptFileName(fileName: string): ProductEventPropertyMap["prompt_file_impression"]["fileName"] | null {
  return (PROMPT_FILE_NAMES as readonly string[]).includes(fileName)
    ? fileName as ProductEventPropertyMap["prompt_file_impression"]["fileName"]
    : null
}

function isAnalyticsProjectId(projectId: string | undefined): projectId is string {
  return isUuid(projectId)
}

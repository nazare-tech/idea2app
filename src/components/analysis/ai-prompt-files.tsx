"use client"

import React from "react"
import { Check, Copy, Download, FileText } from "lucide-react"

import {
  ArtifactActionButton,
  ArtifactLightbox,
} from "@/components/ui/artifact-lightbox"
import type { PlanningDocumentSection } from "@/lib/planning-document-parser"
import {
  extractSectionsByHeading,
  parseListItems,
} from "@/lib/planning-document-parser"
import { cn } from "@/lib/utils"
import { PROMPT_FILE_NAMES, type ProductEventPropertyMap } from "@/lib/product-analytics/contracts"
import { trackClientProductEvent } from "@/lib/product-analytics/client"
import {
  displayFontClass,
  getSectionByAlias,
  splitLabeledText,
  stripHorizontalRulesFromMarkdown,
} from "./planning-blocks-shared"

/** One downloadable/copyable markdown file derived from the planning documents. */
export interface AiPromptFile {
  /** Anchor id used by the workspace nav (e.g. "ai-prompts-first-prompt") */
  anchorId: string
  /** File name shown on the card and used for downloads (e.g. "first-prompt.md") */
  fileName: string
  /** Human title shown on the card and used as the H1 inside the file */
  title: string
  /** One-line description of what the file is for */
  description: string
  /** Full markdown file content (already includes the H1 title) */
  content: string
}

/** Card identity for a prompt file that has not been written yet. */
export type AiPromptFileDescriptor = Omit<AiPromptFile, "content">

/**
 * Every prompt file the current contract is expected to produce, in display
 * order. While the source plans are still generating, these render as
 * non-interactive queued cards so users see the full set of upcoming files
 * from the start. (ai-build-guardrails.md is legacy-only and intentionally
 * absent.) Keep identities in sync with buildAiPromptFiles below.
 */
export const AI_PROMPT_FILE_PLACEHOLDERS: ReadonlyArray<AiPromptFileDescriptor> = [
  {
    anchorId: "ai-prompts-first-prompt",
    fileName: "first-prompt.md",
    title: "Your First Prompt",
    description: "The first message to paste into your AI build tool. Start here.",
  },
  {
    anchorId: "ai-prompts-build-steps",
    fileName: "build-steps.md",
    title: "Build Steps",
    description:
      "The ordered build chunks. After the first prompt, feed these to your AI tool one at a time.",
  },
  {
    anchorId: "ai-prompts-functional-requirements",
    fileName: "functional-requirements.md",
    title: "Functional Requirements",
    description: "What the product must do, written so a developer can implement it.",
  },
  {
    anchorId: "ai-prompts-user-stories-acceptance-criteria",
    fileName: "user-stories-and-acceptance-criteria.md",
    title: "User Stories & Acceptance Criteria",
    description: "User-facing behavior with pass/fail acceptance checks.",
  },
  {
    anchorId: "ai-prompts-technical-considerations",
    fileName: "technical-considerations.md",
    title: "Technical Considerations",
    description: "Architecture, data, integrations, and platform notes for your AI build tool.",
  },
  {
    anchorId: "ai-prompts-sub-agents",
    fileName: "sub-agents.md",
    title: "Sub-Agents",
    description: "One ready-to-paste prompt per agent role from your Product Plan team shape.",
  },
  {
    anchorId: "ai-prompts-project-context",
    fileName: "project-context.md",
    title: "Project Context",
    description: "Starter CLAUDE.md / AGENTS.md context file to drop into your repo root.",
  },
]

/**
 * Clean a section's markdown body into standalone file content. No title
 * heading is injected: the file name identifies the file, and the lightbox
 * shows the content exactly as it will be copied or downloaded.
 */
function toMarkdownFileContent(body: string) {
  return `${stripHorizontalRulesFromMarkdown(body)}\n`
}

/**
 * Strip markdown code-fence marker lines (``` or ```text). The Next Prompt
 * section wraps its prompt in a fence for document rendering, but the file
 * should be the paste-ready prompt text itself.
 */
function stripCodeFenceMarkers(body: string) {
  return body
    .split("\n")
    .filter((line) => !/^\s*```/.test(line))
    .join("\n")
    .trim()
}

/**
 * Build sub-agents.md from the Product Plan's "Team and Milestones" → "Agents"
 * list: one ready-to-paste prompt per recommended agent role.
 */
function buildSubAgentsFile(prdSections: PlanningDocumentSection[]): AiPromptFile | null {
  const team = getSectionByAlias(prdSections, ["Team and milestones", "Team and Milestones"])
  if (!team) return null

  // Models emit the Agents list at H3 or nested at H4 under "3.4 Milestones";
  // accept both (mirrors getAiPromptsReadiness).
  const agents =
    getSectionByAlias(extractSectionsByHeading(team.content, 3), ["Agents"]) ??
    getSectionByAlias(extractSectionsByHeading(team.content, 4), ["Agents"])
  if (!agents) return null

  const roles = parseListItems(agents.content)
    .map((item) => splitLabeledText(item) ?? { label: item, body: "" })
    .filter((role) => role.label.trim())
  if (roles.length === 0) return null

  const intro =
    "Prompts for the agent team recommended in your Product Plan. " +
    "Create one sub-agent per role in your AI build tool (for example a Claude Code subagent, " +
    "or a separate chat per role) and paste the matching prompt."

  const blocks = roles.map((role) => {
    const responsibility = role.body || "Cover this role's responsibilities from the Product Plan."
    return [
      `## ${role.label}`,
      "",
      responsibility,
      "",
      "Paste this prompt when you create the sub-agent:",
      "",
      "```text",
      `You are the ${role.label} for this project.`,
      `Your responsibility: ${responsibility}`,
      "Stay inside this responsibility; flag anything outside it instead of doing it.",
      "Before starting, read functional-requirements.md and user-stories-and-acceptance-criteria.md.",
      "Work on one small, testable piece at a time. After each piece, list what you",
      "changed and how to verify it.",
      "```",
    ].join("\n")
  })

  return {
    anchorId: "ai-prompts-sub-agents",
    fileName: "sub-agents.md",
    title: "Sub-Agents",
    description: "One ready-to-paste prompt per agent role from your Product Plan team shape.",
    content: `${intro}\n\n${blocks.join("\n\n")}\n`,
  }
}

function buildProductMetricsSection(
  successMetrics: PlanningDocumentSection | undefined,
  usesCloudflareD1: boolean,
) {
  const measures = successMetrics?.content.trim()
    ? stripHorizontalRulesFromMarkdown(successMetrics.content)
    : [
        "### Suggested starting measures",
        "",
        "- Define an early activation or workflow-completion measure, a retention or repeat-use measure, a business outcome, and a reliability/performance measure before launch.",
      ].join("\n")

  const eventStorageRule = usesCloudflareD1
    ? "For this Cloudflare stack, store early append-only product events in the existing application database (Cloudflare D1). Add a dedicated analytics vendor only when scale, experimentation, or reporting needs justify the extra system."
    : "For an early-stage product, store append-only events in the existing application database named in the build approach. Do not introduce another database or analytics vendor until scale, experimentation, or reporting needs justify the extra system."
  const instrumentationRules = [
    "Add measurement when the first relevant workflow is built, not after launch. Track the smallest useful funnel: entry, meaningful action, successful outcome, and failure.",
    "Use controlled event names and a small allowlist of properties. Each event must answer a product, user, business, reliability, or performance question.",
    eventStorageRule,
    "Keep analytics evidence separate from business authority. Orders, subscriptions, permissions, and other critical state must remain in their canonical tables.",
    "Never put secrets, credentials, raw prompts, generated content, or sensitive personal data in analytics events. Collect only the minimum identifiers and properties needed for the decision.",
    "Verify important events in development and production-safe diagnostics, and document the event name, trigger, allowed properties, and metric it supports.",
  ]

  return [
    "## Product metrics and instrumentation",
    "",
    measures,
    "",
    "### Instrumentation rules",
    "",
    ...instrumentationRules.map((rule) => `- ${rule}`),
  ].join("\n")
}

/**
 * Build project-context.md, a portable repo/project-instructions file assembled
 * from the Product Plan's success metrics and the First Version Plan's
 * orientation sections.
 */
function buildProjectContextFile(
  prdSections: PlanningDocumentSection[],
  mvpSections: PlanningDocumentSection[],
): AiPromptFile | null {
  const parts: string[] = []
  const add = (heading: string, section?: PlanningDocumentSection) => {
    if (section?.content.trim()) {
      parts.push(`## ${heading}\n\n${stripHorizontalRulesFromMarkdown(section.content)}`)
    }
  }

  const summary = getSectionByAlias(mvpSections, ["MVP Summary"])
  const target = getSectionByAlias(mvpSections, ["Target User and Problem"])
  const goal = getSectionByAlias(mvpSections, [
    "MVP Goal, Definition of Done, and Riskiest Assumptions",
  ])
  const buildApproach = getSectionByAlias(mvpSections, ["Suggested Build Approach"])
  const successMetrics = getSectionByAlias(prdSections, ["Success metrics"])
  const usesCloudflareD1 = (buildApproach?.content ?? "")
    .split("\n")
    .some((line) => /\bdatabase\b/i.test(line) && /\b(?:cloudflare\s+)?d1\b/i.test(line))

  if (!summary && !goal) return null

  add("What we are building", summary)
  add("Target user and problem", target)
  add("MVP goal and definition of done", goal)
  add("Build approach", buildApproach)

  parts.push(
    buildProductMetricsSection(
      successMetrics,
      usesCloudflareD1,
    ),
  )

  parts.push(
    [
      "## Working rules",
      "",
      "- Plan before implementation. State the goal, assumptions, scope, chosen approach, small phases, test strategy, and rollback or recovery path. For a small change, this can be a short checklist.",
      "- For medium or large changes, compare two viable approaches with trade-offs, select one, and critique it from architecture, product, customer, engineering, and risk/security perspectives. Look for scoped improvements that make the result more reusable, durable, secure, observable, or recoverable without over-engineering the MVP.",
      "- Build one observable behavior from build-steps.md at a time using red, green, refactor: define a failing test or acceptance check first, make the smallest change that passes, then improve the code without changing behavior.",
      "- If the platform has no automated test runner, write the acceptance checks before implementation and run them through its preview or browser. Do not treat visual inspection alone as proof for data, auth, payment, or security behavior.",
      "- Stay inside the MVP scope above; flag out-of-scope work instead of building it.",
      "- Use mock data before real backend; add loading, error, and empty states everywhere.",
      "- Route sensitive API calls through the backend and keep secrets in environment variables.",
      "- At every authenticated data boundary, derive user and organization ownership from the verified server session. Never trust a user, owner, or organization id from the request as authority; enforce ownership on every read and write and test cross-account denial.",
      "- Stop and ask before deleting or overwriting data, weakening auth or permissions, exposing secrets, making irreversible production changes, or adding paid external services that were not already approved.",
      "- Reuse existing components and patterns. Keep functions and files focused; centralize duplicated logic when that makes the product simpler to change or test.",
      "- After each phase, run the focused checks and verify the real user flow. For visible changes, test the actual interface at relevant screen sizes; for backend changes, verify requests, persisted data, permissions, and failure paths.",
      "- Before declaring work complete, review the changed code for regressions, maintainability, accessibility, and unmet acceptance criteria. Run a security review for auth, permissions, input handling, secrets, payments, uploads, and external APIs when applicable, then fix important findings.",
      "- Keep architecture/setup docs, requirements, and metric/event documentation synchronized with behavior. Report changed files, verification evidence, known risks, and anything still incomplete.",
    ].join("\n"),
  )

  const intro =
    "Portable project context and working rules for your AI build tool. Save it in your repo root as " +
    "CLAUDE.md (Claude Code), AGENTS.md (Codex), or your tool's rules file. If your tool does not " +
    "automatically read repository rules, paste this file into its project instructions or knowledge " +
    "before the first prompt. Follow the same outcomes even when the platform has no terminal, skills, " +
    "sub-agents, or automatic test runner."

  return {
    anchorId: "ai-prompts-project-context",
    fileName: "project-context.md",
    title: "Project Context",
    description: "Starter CLAUDE.md / AGENTS.md context file to drop into your repo root.",
    content: `${intro}\n\n${parts.join("\n\n")}\n`,
  }
}

/**
 * Assemble the full list of prompt files from the Product Plan (H2 sections)
 * and First Version Plan (H2 sections). Missing sections are skipped.
 */
export function buildAiPromptFiles({
  prdSections,
  mvpSections,
}: {
  prdSections: PlanningDocumentSection[]
  mvpSections: PlanningDocumentSection[]
}): AiPromptFile[] {
  const nextPrompt = getSectionByAlias(mvpSections, ["Next Prompt for AI Coding Tool"])
  const guardrails = getSectionByAlias(mvpSections, ["AI Build Guardrails"])
  const buildSequence = getSectionByAlias(mvpSections, ["AI-Friendly Build Sequence"])
  const requirements = getSectionByAlias(prdSections, ["Functional requirements"])
  const userStories = getSectionByAlias(prdSections, ["User stories and acceptance criteria"])
  const technical = getSectionByAlias(prdSections, ["Technical considerations"])

  const files: Array<AiPromptFile | null> = [
    nextPrompt?.content.trim()
      ? {
          anchorId: "ai-prompts-first-prompt",
          fileName: "first-prompt.md",
          title: "Your First Prompt",
          description: "The first message to paste into your AI build tool. Start here.",
          content: toMarkdownFileContent(stripCodeFenceMarkers(nextPrompt.content)),
        }
      : null,
    guardrails?.content.trim()
      ? {
          anchorId: "ai-prompts-build-guardrails",
          fileName: "ai-build-guardrails.md",
          title: "AI Build Guardrails",
          description: "Working rules that keep AI-generated code safe and reviewable.",
          content: toMarkdownFileContent(guardrails.content),
        }
      : null,
    buildSequence?.content.trim()
      ? {
          anchorId: "ai-prompts-build-steps",
          fileName: "build-steps.md",
          title: "Build Steps",
          description:
            "The ordered build chunks. After the first prompt, feed these to your AI tool one at a time.",
          content: toMarkdownFileContent(buildSequence.content),
        }
      : null,
    requirements?.content.trim()
      ? {
          anchorId: "ai-prompts-functional-requirements",
          fileName: "functional-requirements.md",
          title: "Functional Requirements",
          description: "What the product must do, written so a developer can implement it.",
          content: toMarkdownFileContent(requirements.content),
        }
      : null,
    userStories?.content.trim()
      ? {
          anchorId: "ai-prompts-user-stories-acceptance-criteria",
          fileName: "user-stories-and-acceptance-criteria.md",
          title: "User Stories & Acceptance Criteria",
          description: "User-facing behavior with pass/fail acceptance checks.",
          content: toMarkdownFileContent(userStories.content),
        }
      : null,
    technical?.content.trim()
      ? {
          anchorId: "ai-prompts-technical-considerations",
          fileName: "technical-considerations.md",
          title: "Technical Considerations",
          description: "Architecture, data, integrations, and platform notes for your AI build tool.",
          content: toMarkdownFileContent(technical.content),
        }
      : null,
    buildSubAgentsFile(prdSections),
    buildProjectContextFile(prdSections, mvpSections),
  ]

  return files.filter((file): file is AiPromptFile => file !== null)
}

/**
 * Render a short markdown string inline: **bold**, *italic*, `code`, and
 * [links](https://...). Used for small field values where the full
 * MarkdownRenderer would be too heavy.
 */
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
              className="flex flex-1 flex-col items-start gap-2 px-5 pb-4 pt-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
  return Boolean(projectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId))
}

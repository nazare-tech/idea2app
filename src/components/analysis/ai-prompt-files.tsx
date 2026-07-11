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

/**
 * Build project-context.md, a starter repo context file (CLAUDE.md style)
 * assembled from the First Version Plan's orientation sections.
 */
function buildProjectContextFile(mvpSections: PlanningDocumentSection[]): AiPromptFile | null {
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

  if (!summary && !goal) return null

  add("What we are building", summary)
  add("Target user and problem", target)
  add("MVP goal and definition of done", goal)
  add("Build approach", buildApproach)

  parts.push(
    [
      "## Working rules",
      "",
      "- Build one chunk from build-steps.md at a time; test before moving on.",
      "- Stay inside the MVP scope above; flag out-of-scope work instead of building it.",
      "- Use mock data before real backend; add loading, error, and empty states everywhere.",
      "- Route sensitive API calls through the backend and keep secrets in environment variables.",
      "- After each change, list changed files and explain how to test locally.",
    ].join("\n"),
  )

  const intro =
    "Starter context file for your AI build tool. Save it in your repo root as " +
    "CLAUDE.md (Claude Code), AGENTS.md (Codex), or your tool's rules file, so every " +
    "session starts with the same project context."

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
    buildProjectContextFile(mvpSections),
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
 * Grid of markdown file cards. Clicking a card opens the file in a lightbox
 * (same interaction as design mockups) with the same copy/download actions.
 */
export function AiPromptFileGrid({ files }: { files: AiPromptFile[] }) {
  const [activeFile, setActiveFile] = React.useState<AiPromptFile | null>(null)
  const [copiedFileName, setCopiedFileName] = React.useState<string | null>(null)
  const copyResetRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = React.useCallback(async (file: AiPromptFile) => {
    try {
      await navigator.clipboard.writeText(file.content)
      setCopiedFileName(file.fileName)
      if (copyResetRef.current) clearTimeout(copyResetRef.current)
      copyResetRef.current = setTimeout(() => setCopiedFileName(null), 2000)
    } catch {
      // Clipboard unavailable (e.g. insecure context); the download button still works.
    }
  }, [])

  React.useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current)
    }
  }, [])

  if (files.length === 0) return null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {files.map((file) => {
        const isCopied = copiedFileName === file.fileName

        return (
          <article
            key={file.fileName}
            id={file.anchorId}
            className="group flex flex-col border border-[#E8DDD5] bg-white transition-colors hover:border-[#D8CEC5]"
          >
            <button
              type="button"
              aria-label={`Open ${file.fileName} preview`}
              className="flex flex-1 flex-col items-start gap-2 px-5 pb-4 pt-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={() => setActiveFile(file)}
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
                    void handleCopy(file)
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
                    downloadMarkdownFile(file)
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </ArtifactActionButton>
              </div>
            </div>
          </article>
        )
      })}

      {activeFile && (
        <ArtifactLightbox
          fileName={activeFile.fileName}
          displayName={humanizeFileName(activeFile.fileName)}
          copied={copiedFileName === activeFile.fileName}
          onCopy={() => void handleCopy(activeFile)}
          onDownload={() => downloadMarkdownFile(activeFile)}
          onClose={() => setActiveFile(null)}
        >
          <FileContentView content={activeFile.content} />
        </ArtifactLightbox>
      )}
    </div>
  )
}

"use client"

import { useMemo } from "react"
import { ArrowUpRight } from "lucide-react"

import {
  AI_PROMPT_FILE_PLACEHOLDERS,
  AiPromptFileGrid,
  InlineMarkdown,
  buildAiPromptFiles,
} from "@/components/analysis/ai-prompt-files"
import type { PlanningDocumentSection } from "@/lib/planning-document-parser"
import { extractSectionsByHeading, stripInlineMarkdown } from "@/lib/planning-document-parser"
import { getAiPromptsReadiness } from "@/lib/ai-prompts-readiness"
import { cn } from "@/lib/utils"

import {
  displayFontClass,
  getSectionByAlias,
  stripHorizontalRulesFromMarkdown,
} from "./planning-blocks-shared"

type AiBuildToolRecommendation = {
  name: string
  url: string | null
  why: string
  bestFit: string
  cost: string
  watchOut: string
  handoff: string
}

const AI_BUILD_TOOL_URLS: Record<string, string> = {
  bolt: "https://bolt.new",
  "claude code": "https://www.anthropic.com/claude-code",
  cline: "https://cline.bot",
  codex: "https://openai.com/codex",
  cursor: "https://cursor.com",
  devin: "https://devin.ai",
  "gemini code assist": "https://codeassist.google",
  "github copilot": "https://github.com/features/copilot",
  lovable: "https://lovable.dev",
  replit: "https://replit.com",
  v0: "https://v0.dev",
  warp: "https://www.warp.dev",
}

function getAiBuildToolUrl(name: string) {
  return AI_BUILD_TOOL_URLS[stripInlineMarkdown(name).trim().toLowerCase()] ?? null
}

export function getRecommendedTool(section?: PlanningDocumentSection): AiBuildToolRecommendation | null {
  if (!section?.content.trim()) return null

  const headingLink = section.content.match(/^###\s+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/m)
  const headingText = section.content.match(/^###\s+(.+)$/m)
  const name = stripInlineMarkdown(headingLink?.[1] ?? headingText?.[1] ?? section.heading).trim()
  const url = headingLink?.[2]?.trim() ?? getAiBuildToolUrl(name)

  // Preserve markdown in values so links, bold text, and inline code render.
  const field = (label: string) => {
    const pattern = new RegExp(`^-\\s*\\*\\*${label}\\s*:?\\*\\*\\s*:?\\s*(.+)$`, "im")
    return (section.content.match(pattern)?.[1] ?? "").trim()
  }

  const why = field("Why this tool")
  const bestFit = field("Best fit for this project")
  const cost = field("Expected starting cost")
  const watchOut = field("Watch out")
  const handoff = field("Handoff instruction")

  if (!name || !why) {
    const fallback = stripHorizontalRulesFromMarkdown(
      section.content.replace(/^###\s+.+$/m, ""),
    ).trim()
    return fallback
      ? {
          name: name || "Recommended tool",
          url,
          why: fallback,
          bestFit: "",
          cost: "",
          watchOut: "",
          handoff: "",
        }
      : null
  }

  return { name, url, why, bestFit, cost, watchOut, handoff }
}

function AiPromptRecommendedToolCard({ section }: { section?: PlanningDocumentSection }) {
  const recommendation = getRecommendedTool(section)
  if (!recommendation) return null

  const details = [
    { label: "Best Fit For This Project", value: recommendation.bestFit },
    { label: "Expected Starting Cost", value: recommendation.cost },
    { label: "Watch Out", value: recommendation.watchOut },
    { label: "Handoff", value: recommendation.handoff },
  ].filter((detail) => detail.value)
  const title = (
    <span className={cn(displayFontClass, "text-[26px] font-bold leading-tight tracking-[-0.03em] text-[#0A0A0A]")}>
      {recommendation.name}
    </span>
  )

  return (
    <div className="border border-[#E8DDD5] bg-white px-6 py-6">
      {recommendation.url ? (
        <a href={recommendation.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 transition-opacity hover:opacity-80">
          {title}
          <ArrowUpRight className="mt-1.5 h-4 w-4 shrink-0 text-[#0A0A0A]" />
        </a>
      ) : title}
      {recommendation.why ? (
        <p className="mt-3 max-w-[70ch] text-[15px] leading-[1.65] text-[#4A4040]">
          <InlineMarkdown value={recommendation.why} />
        </p>
      ) : null}
      {details.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="border-t border-[#E8DDD5] pt-3">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8480]">{detail.label}</p>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-[#4A4040]"><InlineMarkdown value={detail.value} /></p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function AiPromptsMasthead() {
  return (
    <header className="pb-10">
      <h1 className={cn(displayFontClass, "text-[36px] font-bold leading-[1.12] tracking-[-0.05em] text-[#0A0A0A] md:text-[44px] md:leading-[66px]")}>AI Prompts</h1>
      <p className="mt-1 max-w-3xl text-[16px] leading-[25.6px] text-[#666666]">Your recommended build tool plus ready-to-use prompt files for your AI coding tool.</p>
    </header>
  )
}

const promptFileUsageSteps = [
  "Download all the files below into a new, empty folder. That folder becomes your project.",
  "Open your recommended AI build tool (above) in that folder.",
  "Rename project-context.md to CLAUDE.md (Claude Code), AGENTS.md (Codex), or your tool's rules file. In browser builders such as Lovable or v0, paste it into the project's instructions or knowledge.",
  "Paste the contents of first-prompt.md as your first message to start the build.",
  "Work through build-steps.md one chunk at a time; share the other files when your tool needs requirements or acceptance criteria.",
]

function PromptFileUsageGuide() {
  return (
    <div className="mb-6 border border-[#E8DDD5] bg-[#FAFAFA] px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4A4040]">How to use these files</p>
      <ol className="mt-3 space-y-2">
        {promptFileUsageSteps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="w-6 shrink-0 pt-0.5 font-mono text-[11px] font-medium text-[#8A8480]">{String(index + 1).padStart(2, "0")}</span>
            <p className="text-[13.5px] leading-[1.55] text-[#4A4040]">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

function AiPromptsSection({ id, title, index, total, children }: { id?: string; title: string; index: number; total: number; children: React.ReactNode }) {
  return (
    <section id={id} className="pt-0">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E8DDD5] pb-6">
        <div><h2 className={cn(displayFontClass, "text-[22px] font-bold tracking-[-0.03em] text-[#0A0A0A]")}>{title}</h2></div>
        <p className="shrink-0 font-mono text-[13px] tracking-[0.1em] text-[#8A8480]">{String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}</p>
      </div>
      {children}
    </section>
  )
}

export function AiPromptsDocumentBlocks({ prdContent, mvpContent, projectId, prdSettled = Boolean(prdContent), mvpSettled = Boolean(mvpContent) }: { prdContent: string | null; mvpContent: string | null; projectId: string; prdSettled?: boolean; mvpSettled?: boolean }) {
  const prdSections = useMemo(() => extractSectionsByHeading(prdContent ?? "", 2), [prdContent])
  const mvpSections = useMemo(() => extractSectionsByHeading(mvpContent ?? "", 2), [mvpContent])
  const recommendedTool = getSectionByAlias(mvpSections, ["Recommended AI Build Tool", "AI Build Tool", "Recommended Build Tool"])
  const promptFiles = useMemo(() => buildAiPromptFiles({ prdSections, mvpSections }), [prdSections, mvpSections])
  const hasRecommendedTool = Boolean(recommendedTool?.content.trim())
  const readiness = useMemo(() => getAiPromptsReadiness({ prdContent, mvpContent, prdSettled, mvpSettled }), [mvpContent, mvpSettled, prdContent, prdSettled])
  const showQueuedPlaceholders = !prdSettled || !mvpSettled
  const pendingFiles = showQueuedPlaceholders
    ? AI_PROMPT_FILE_PLACEHOLDERS.filter((placeholder) => !promptFiles.some((file) => file.fileName === placeholder.fileName))
    : []

  if (readiness.status === "waiting" && !showQueuedPlaceholders) {
    return <div className="flex items-center justify-center p-6 text-center text-sm text-muted-foreground sm:p-12">AI Prompts has not been generated yet.</div>
  }

  const showToolSection = hasRecommendedTool || showQueuedPlaceholders
  const showFilesSection = promptFiles.length > 0 || pendingFiles.length > 0
  const sectionTotal = (showToolSection ? 1 : 0) + (showFilesSection ? 1 : 0)
  let sectionIndex = 1
  const nextSectionIndex = () => sectionIndex++

  return (
    <div className="flex flex-col gap-16">
      <AiPromptsMasthead />
      {readiness.status === "incomplete" ? (
        <div className="border border-[#E8DDD5] bg-[#FAFAFA] px-5 py-4" role="status">
          <p className="text-[14px] font-semibold text-[#1C1917]">Some AI Prompts files are unavailable</p>
          <p className="mt-1 text-[13px] leading-5 text-[#4A4040]">The generated plans did not include every required handoff section. Available files remain usable.</p>
        </div>
      ) : null}
      {showToolSection ? (
        <AiPromptsSection id="ai-prompts-recommended-build-tool" title="Recommended AI Build Tool" index={nextSectionIndex()} total={sectionTotal}>
          {hasRecommendedTool ? <AiPromptRecommendedToolCard section={recommendedTool} /> : (
            <div className="border border-dashed border-[#E8DDD5] bg-[#FAFAFA] px-6 py-6">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8480]">Queued</span>
              <div className="mt-4 space-y-3" aria-hidden="true">
                <div className="h-3 w-[70%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
                <div className="h-3 w-[52%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
              </div>
            </div>
          )}
        </AiPromptsSection>
      ) : null}
      {showFilesSection ? (
        <AiPromptsSection id="ai-prompts-files" title="Prompt Files" index={nextSectionIndex()} total={sectionTotal}>
          <p className="mb-6 max-w-3xl text-[14px] leading-[1.6] text-[#4A4040]">Each file is ready to copy or download into your AI build tool. Click a card to preview the full markdown.</p>
          <PromptFileUsageGuide />
          <AiPromptFileGrid files={promptFiles} pendingFiles={pendingFiles} projectId={projectId} />
        </AiPromptsSection>
      ) : null}
    </div>
  )
}

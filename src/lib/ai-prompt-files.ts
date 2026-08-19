import type { PlanningDocumentSection } from "@/lib/planning-document-parser"
import {
  extractSectionsByHeading,
  getSectionByAlias,
  parseListItems,
  splitLabeledText,
  stripHorizontalRulesFromMarkdown,
} from "@/lib/planning-document-parser"

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

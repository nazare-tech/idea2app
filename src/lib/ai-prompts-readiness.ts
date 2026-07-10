import {
  extractSectionsByHeading,
  findSectionByAliases,
  parseListItems,
  type PlanningDocumentSection,
} from "@/lib/planning-document-parser"

export const AI_PROMPT_REQUIREMENTS = [
  { key: "recommended-tool", label: "Recommended AI Build Tool" },
  { key: "first-prompt", label: "First Prompt" },
  { key: "build-steps", label: "Build Steps" },
  { key: "functional-requirements", label: "Functional Requirements" },
  { key: "user-stories", label: "User Stories & Acceptance Criteria" },
  { key: "technical-considerations", label: "Technical Considerations" },
  { key: "sub-agents", label: "Sub-Agents" },
  { key: "project-context", label: "Project Context" },
] as const

export type AiPromptRequirementKey = typeof AI_PROMPT_REQUIREMENTS[number]["key"]
export type AiPromptsReadinessStatus = "waiting" | "partial" | "ready" | "incomplete"

export interface AiPromptsReadiness {
  status: AiPromptsReadinessStatus
  availableKeys: AiPromptRequirementKey[]
  missingKeys: AiPromptRequirementKey[]
  missingLabels: string[]
  availableCount: number
  requiredCount: number
}

function hasSection(
  sections: PlanningDocumentSection[],
  aliases: string[],
) {
  return Boolean(findSectionByAliases(sections, aliases)?.content.trim())
}

function hasSubAgentSource(prdSections: PlanningDocumentSection[]) {
  const team = findSectionByAliases(prdSections, ["Team and milestones", "Team and Milestones"])
  if (!team) return false

  // Models emit the Agents list at H3 or nested at H4 under "3.4 Milestones";
  // accept both so a valid list never reads as a missing prompt file.
  const agents =
    findSectionByAliases(extractSectionsByHeading(team.content, 3), ["Agents"]) ??
    findSectionByAliases(extractSectionsByHeading(team.content, 4), ["Agents"])
  return Boolean(agents && parseListItems(agents.content).length > 0)
}

function hasProjectContextSource(mvpSections: PlanningDocumentSection[]) {
  return hasSection(mvpSections, ["MVP Summary"]) || hasSection(
    mvpSections,
    ["MVP Goal, Definition of Done, and Riskiest Assumptions"],
  )
}

export function getAiPromptsReadiness({
  prdContent,
  mvpContent,
  prdSettled,
  mvpSettled,
}: {
  prdContent: string | null | undefined
  mvpContent: string | null | undefined
  prdSettled: boolean
  mvpSettled: boolean
}): AiPromptsReadiness {
  const prdSections = extractSectionsByHeading(prdContent ?? "", 2)
  const mvpSections = extractSectionsByHeading(mvpContent ?? "", 2)

  const availability: Record<AiPromptRequirementKey, boolean> = {
    "recommended-tool": hasSection(mvpSections, [
      "Recommended AI Build Tool",
      "AI Build Tool",
      "Recommended Build Tool",
    ]),
    "first-prompt": hasSection(mvpSections, ["Next Prompt for AI Coding Tool"]),
    "build-steps": hasSection(mvpSections, ["AI-Friendly Build Sequence"]),
    "functional-requirements": hasSection(prdSections, ["Functional requirements"]),
    "user-stories": hasSection(prdSections, ["User stories and acceptance criteria"]),
    "technical-considerations": hasSection(prdSections, ["Technical considerations"]),
    "sub-agents": hasSubAgentSource(prdSections),
    "project-context": hasProjectContextSource(mvpSections),
  }

  const availableKeys = AI_PROMPT_REQUIREMENTS
    .filter((requirement) => availability[requirement.key])
    .map((requirement) => requirement.key)
  const missing = AI_PROMPT_REQUIREMENTS.filter((requirement) => !availability[requirement.key])
  const hasAnySource = Boolean(prdContent?.trim() || mvpContent?.trim())

  const status: AiPromptsReadinessStatus = missing.length === 0
    ? "ready"
    : prdSettled && mvpSettled
      ? "incomplete"
      : !hasAnySource
        ? "waiting"
        : "partial"

  return {
    status,
    availableKeys,
    missingKeys: missing.map((requirement) => requirement.key),
    missingLabels: missing.map((requirement) => requirement.label),
    availableCount: availableKeys.length,
    requiredCount: AI_PROMPT_REQUIREMENTS.length,
  }
}

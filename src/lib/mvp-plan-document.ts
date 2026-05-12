import {
  extractSectionsByHeading,
  findSectionByAliases,
  parseNarrativeTable,
  type PlanningDocumentSection,
  type PlanningNarrativeTable,
} from "@/lib/planning-document-parser"

export interface MvpPlanStructuredData {
  title: string
  overview: PlanningNarrativeTable
  hypothesis: PlanningNarrativeTable
  problem: PlanningNarrativeTable
  targetUser: PlanningNarrativeTable
  scope: PlanningNarrativeTable
  featureSummary: PlanningNarrativeTable
  featureDetails: PlanningDocumentSection[]
  userFlow: PlanningDocumentSection[]
  techStack: PlanningDocumentSection[]
  timeline: PlanningDocumentSection[]
  successMetrics: PlanningDocumentSection[]
  assumptions: PlanningDocumentSection[]
  allSections: PlanningDocumentSection[]
}

export interface MvpPlanViewModel {
  canRenderModules: boolean
  warning: string | null
  structured: MvpPlanStructuredData
}

const H3_ALIASES = {
  overview: ["Product Vision Summary", "MVP Overview"],
  hypothesis: ["MVP Hypothesis"],
  problem: ["Problem Being Validated"],
  targetUser: ["Target User Segment"],
  scope: ["MVP Scope Boundaries", "Scope Boundaries"],
  featureSummary: ["Feature Summary Table", "Feature Summary"],
}

function getTitle(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "MVP Plan"
}

function getSection(sections: PlanningDocumentSection[], aliases: string[]) {
  return findSectionByAliases(sections, aliases)?.content ?? ""
}

function findH2Content(h2Sections: PlanningDocumentSection[], aliases: string[]) {
  return findSectionByAliases(h2Sections, aliases)?.content ?? ""
}

function sectionsOrFallback(content: string, fallbackHeading: string, level: 3 | 4 = 3) {
  const sections = extractSectionsByHeading(content, level)
  if (sections.length > 0) return sections

  const trimmed = content.trim()
  return trimmed
    ? [
        {
          heading: fallbackHeading,
          content: trimmed,
        },
      ]
    : []
}

function getFeatureDetails(
  h2Sections: PlanningDocumentSection[],
  h3Sections: PlanningDocumentSection[],
) {
  const coreFeaturesContent = findH2Content(h2Sections, ["Core MVP Features"])
  const nestedFeatures = extractSectionsByHeading(coreFeaturesContent, 4)
  if (nestedFeatures.length > 0) return nestedFeatures

  return sectionsOrFallback(getSection(h3Sections, ["Feature Details"]), "Feature Details", 4)
}

export function getMvpPlanViewModel(content: string): MvpPlanViewModel {
  const h2Sections = extractSectionsByHeading(content, 2)
  const h3Sections = extractSectionsByHeading(content, 3)
  const featureDetails = getFeatureDetails(h2Sections, h3Sections)

  const structured: MvpPlanStructuredData = {
    title: getTitle(content),
    overview: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.overview)),
    hypothesis: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.hypothesis)),
    problem: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.problem)),
    targetUser: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.targetUser)),
    scope: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.scope)),
    featureSummary: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.featureSummary)),
    featureDetails,
    userFlow: sectionsOrFallback(findH2Content(h2Sections, ["User Flow"]), "User Flow"),
    techStack: sectionsOrFallback(
      findH2Content(h2Sections, ["Tech Stack", "Tool Recommendations"]),
      "Tech Stack",
    ),
    timeline: sectionsOrFallback(
      findH2Content(h2Sections, ["Timeline", "Milestones"]),
      "Timeline / Milestones",
    ),
    successMetrics: sectionsOrFallback(
      findH2Content(h2Sections, ["Success Metrics", "Validation"]),
      "Success Metrics",
    ),
    assumptions: sectionsOrFallback(
      findH2Content(h2Sections, ["Open Questions", "Assumptions"]),
      "Open Questions / Assumptions",
    ),
    allSections: h3Sections,
  }

  const usefulSectionCount = [
    structured.hypothesis,
    structured.scope,
    structured.featureSummary,
    structured.featureDetails,
    structured.userFlow,
    structured.timeline,
    structured.successMetrics,
  ].filter((section) => {
    if (Array.isArray(section)) return section.length > 0
    return section.paragraphs.length > 0 || section.items.length > 0 || Boolean(section.table)
  }).length

  if (usefulSectionCount < 3) {
    return {
      canRenderModules: false,
      warning: "This MVP plan does not have enough recognizable sections for block rendering.",
      structured,
    }
  }

  return {
    canRenderModules: true,
    warning: null,
    structured,
  }
}

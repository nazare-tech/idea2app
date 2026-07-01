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
  overview: ["Product Vision", "Product Vision Summary", "MVP Overview"],
  hypothesis: ["What We Need to Prove", "MVP Hypothesis", "Riskiest Product Assumption"],
  problem: ["Problem to Prove", "Problem Being Validated", "Problem"],
  targetUser: ["Target Customer", "Target User Segment", "Primary User"],
  scope: ["What's In / Out", "What Is In / Out", "MVP Scope Boundaries", "Scope Boundaries"],
  featureSummary: ["Feature Summary Table", "Feature Summary", "Must-Have Features"],
}

const H2_ALIASES = {
  overview: ["MVP Summary", "Product Vision", "First Version Overview"],
  assumptions: ["Key Risks, Assumptions, and Scope Decisions", "Key Assumptions and Scope Decisions", "Assumptions"],
  targetProblem: ["Target User and Problem"],
  hypothesis: ["MVP Goal, Definition of Done, and Riskiest Assumptions", "MVP Goal"],
  userFlow: ["Core User Flows", "Core User Flow", "User Flow", "Key User Flow"],
  scope: ["Core User Flows", "MVP Scope", "Scope Boundaries"],
  features: ["Core User Flows", "Must-Have Features", "Core Features", "Core MVP Features"],
  techStack: ["Suggested Build Approach", "Tech Stack", "Tool Recommendations"],
  buildSequence: ["AI-Friendly Build Sequence", "Build Sequence", "Timeline", "Timeline & Risks", "Milestones"],
  validation: ["Validation Plan", "Success Signals", "Success Metrics", "Validation"],
  cutList: ["Cut List"],
}

function getTitle(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "First Version Plan"
}

function getSection(sections: PlanningDocumentSection[], aliases: string[]) {
  return findSectionByAliases(sections, aliases)?.content ?? ""
}

function getSectionByPreference(
  primarySections: PlanningDocumentSection[],
  primaryAliases: string[],
  fallbackSections: PlanningDocumentSection[],
  fallbackAliases: string[],
) {
  return (
    getSection(primarySections, primaryAliases) ||
    getSection(fallbackSections, fallbackAliases)
  )
}

function getNestedOrSection(
  parentContent: string,
  aliases: string[],
  fallbackContent: string,
) {
  return getSection(extractSectionsByHeading(parentContent, 3), aliases) || fallbackContent
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
  const coreFeaturesContent = findH2Content(h2Sections, ["Core Features", "Core MVP Features"])
  const nestedFeatures = extractSectionsByHeading(coreFeaturesContent, 4)
  if (nestedFeatures.length > 0) return nestedFeatures

  return sectionsOrFallback(getSection(h3Sections, ["Feature Details"]), "Feature Details", 4)
}

export function getMvpPlanViewModel(content: string): MvpPlanViewModel {
  const h2Sections = extractSectionsByHeading(content, 2)
  const h3Sections = extractSectionsByHeading(content, 3)
  const featureDetails = getFeatureDetails(h2Sections, h3Sections)
  const targetProblemContent = getSection(h2Sections, H2_ALIASES.targetProblem)
  const validationContent = getSection(h2Sections, H2_ALIASES.validation)

  const structured: MvpPlanStructuredData = {
    title: getTitle(content),
    overview: parseNarrativeTable(
      getSectionByPreference(
        h3Sections,
        H3_ALIASES.overview,
        h2Sections,
        H2_ALIASES.overview,
      ),
    ),
    hypothesis: parseNarrativeTable(
      getSectionByPreference(
        h3Sections,
        H3_ALIASES.hypothesis,
        h2Sections,
        H2_ALIASES.hypothesis,
      ),
    ),
    problem: parseNarrativeTable(
      getSection(h3Sections, H3_ALIASES.problem) ||
        getNestedOrSection(targetProblemContent, ["Problem"], targetProblemContent),
    ),
    targetUser: parseNarrativeTable(
      getSection(h3Sections, H3_ALIASES.targetUser) ||
        getNestedOrSection(targetProblemContent, ["Primary User", "Target Customer"], targetProblemContent),
    ),
    scope: parseNarrativeTable(
      getSectionByPreference(
        h3Sections,
        H3_ALIASES.scope,
        h2Sections,
        H2_ALIASES.scope,
      ),
    ),
    featureSummary: parseNarrativeTable(
      getSectionByPreference(
        h3Sections,
        H3_ALIASES.featureSummary,
        h2Sections,
        H2_ALIASES.features,
      ),
    ),
    featureDetails,
    userFlow: sectionsOrFallback(findH2Content(h2Sections, H2_ALIASES.userFlow), "User Flow"),
    techStack: sectionsOrFallback(
      findH2Content(h2Sections, H2_ALIASES.techStack),
      "Tech Stack",
    ),
    timeline: sectionsOrFallback(
      findH2Content(h2Sections, H2_ALIASES.buildSequence),
      "Timeline / Milestones",
    ),
    successMetrics: sectionsOrFallback(
      validationContent,
      "Success Signals",
    ),
    assumptions: sectionsOrFallback(
      findH2Content(h2Sections, ["Open Questions", "Assumptions", ...H2_ALIASES.assumptions, ...H2_ALIASES.cutList]),
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
      warning: "This First Version Plan does not have enough recognizable sections for block rendering.",
      structured,
    }
  }

  return {
    canRenderModules: true,
    warning: null,
    structured,
  }
}

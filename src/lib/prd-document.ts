import {
  extractSectionsByHeading,
  findSectionByAliases,
  parseNarrativeTable,
  type PlanningDocumentSection,
  type PlanningNarrativeTable,
} from "@/lib/planning-document-parser"

export interface PrdDocumentStructuredData {
  title: string
  background: PlanningNarrativeTable
  vision: PlanningNarrativeTable
  stakeholders: PlanningNarrativeTable
  userNeeds: PlanningNarrativeTable
  valueProposition: PlanningNarrativeTable
  objectives: PlanningNarrativeTable
  positioning: PlanningNarrativeTable
  personas: PlanningDocumentSection[]
  requirements: PlanningNarrativeTable
  userStories: PlanningNarrativeTable
  prioritization: PlanningNarrativeTable
  uiUx: PlanningNarrativeTable
  technical: PlanningNarrativeTable
  allSections: PlanningDocumentSection[]
}

export interface PrdDocumentViewModel {
  canRenderModules: boolean
  warning: string | null
  structured: PrdDocumentStructuredData
}

const H3_ALIASES = {
  background: ["Background Information / Context", "Background", "Context"],
  userNeeds: ["Problem to Solve", "Problem Definition / User Needs", "User Needs", "Problem Definition"],
  valueProposition: ["Purpose and Value Proposition", "Value Proposition"],
  vision: ["Vision"],
  objectives: ["Goals / Measurable Outcomes", "Goals", "Measurable Outcomes"],
  positioning: ["Product Positioning", "Positioning"],
  stakeholders: ["Stakeholder List", "Stakeholders"],
  personas: ["User Profiles / Personas", "Personas", "User Profiles"],
  requirements: ["What to Build", "Requirements"],
  userStories: ["Key User Flows", "User Stories / Use Cases", "User Stories", "Use Cases"],
  prioritization: ["Build Order", "Build Order & Experience", "Prioritization"],
  uiUx: ["Product Experience", "UI/UX Design Specifications", "UI UX Design Specifications", "UI/UX"],
  technical: ["Technical Requirements"],
}

const H2_ALIASES = {
  introduction: ["Introduction/overview", "Introduction overview", "Introduction"],
  goals: ["Goals"],
  personas: ["User personas", "Personas"],
  userExperience: ["User experience"],
  requirements: ["Functional requirements"],
  userStories: ["User stories and acceptance criteria", "User stories"],
  outOfScope: ["Non-goals / out of scope", "Non-goals", "Out of scope"],
  technical: ["Technical considerations"],
  successMetrics: ["Success metrics"],
  timeline: ["Team and Milestones", "Team & Milestones", "Timeline, milestones, and team shape", "Timeline and milestones"],
}

function getTitle(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Product Plan"
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

function getNestedSection(content: string, aliases: string[]) {
  return getSection(extractSectionsByHeading(content, 3), aliases)
}

function getCurrentPersonaContent(personasContent: string) {
  const nested = extractSectionsByHeading(personasContent, 3)
  return getSection(nested, ["Persona details"]) || personasContent
}

function getBoldLabelSections(content: string): PlanningDocumentSection[] {
  const sections: PlanningDocumentSection[] = []
  let active: PlanningDocumentSection | null = null

  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    const heading = trimmed.match(/^\*\*([^*:][^*]{1,80})\*\*$/)?.[1]?.trim()

    if (heading) {
      active = { heading, content: "" }
      sections.push(active)
      continue
    }

    if (active) {
      active.content = `${active.content}${active.content ? "\n" : ""}${line}`.trim()
    }
  }

  return sections.filter((section) => section.content.trim().length > 0)
}

function getPersonaSections(personasContent: string) {
  const boldLabelSections = getBoldLabelSections(getCurrentPersonaContent(personasContent))
  if (boldLabelSections.length > 0) return boldLabelSections

  const nested = [
    ...extractSectionsByHeading(personasContent, 4),
    ...extractSectionsByHeading(personasContent, 3),
  ]
  if (nested.length > 0) return nested

  const trimmed = personasContent.trim()
  if (!trimmed) return []

  return [
    {
      heading: "Target User Profile",
      content: trimmed,
    },
  ]
}

export function getPrdDocumentViewModel(content: string): PrdDocumentViewModel {
  const h2Sections = extractSectionsByHeading(content, 2)
  const h3Sections = extractSectionsByHeading(content, 3)
  const introductionContent = getSection(h2Sections, H2_ALIASES.introduction)
  const goalsContent = getSection(h2Sections, H2_ALIASES.goals)
  const personasContent = getSectionByPreference(
    h3Sections,
    H3_ALIASES.personas,
    h2Sections,
    H2_ALIASES.personas,
  )

  const structured: PrdDocumentStructuredData = {
    title: getTitle(content),
    background: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.background) || introductionContent),
    userNeeds: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.userNeeds) || introductionContent),
    valueProposition: parseNarrativeTable(
      getSection(h3Sections, H3_ALIASES.valueProposition) ||
        getNestedSection(goalsContent, ["User goals", "Business goals"]) ||
        introductionContent,
    ),
    vision: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.vision)),
    objectives: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.objectives) || goalsContent),
    positioning: parseNarrativeTable(
      getSection(h3Sections, H3_ALIASES.positioning) ||
        getSection(h2Sections, H2_ALIASES.successMetrics),
    ),
    stakeholders: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.stakeholders)),
    personas: getPersonaSections(personasContent),
    requirements: parseNarrativeTable(
      getSectionByPreference(
        h3Sections,
        H3_ALIASES.requirements,
        h2Sections,
        H2_ALIASES.requirements,
      ),
    ),
    userStories: parseNarrativeTable(
      getSectionByPreference(
        h3Sections,
        H3_ALIASES.userStories,
        h2Sections,
        H2_ALIASES.userStories,
      ),
    ),
    prioritization: parseNarrativeTable(
      getSection(h3Sections, H3_ALIASES.prioritization) ||
        getSection(h2Sections, H2_ALIASES.timeline) ||
        getSection(h2Sections, H2_ALIASES.outOfScope),
    ),
    uiUx: parseNarrativeTable(
      getSectionByPreference(
        h3Sections,
        H3_ALIASES.uiUx,
        h2Sections,
        H2_ALIASES.userExperience,
      ),
    ),
    technical: parseNarrativeTable(
      getSectionByPreference(
        h3Sections,
        H3_ALIASES.technical,
        h2Sections,
        H2_ALIASES.technical,
      ),
    ),
    allSections: h3Sections,
  }

  const usefulSectionCount = [
    structured.userNeeds,
    structured.valueProposition,
    structured.personas,
    structured.requirements,
    structured.userStories,
    structured.prioritization,
  ].filter((section) => {
    if (Array.isArray(section)) return section.length > 0
    return section.paragraphs.length > 0 || section.items.length > 0 || Boolean(section.table)
  }).length

  if (usefulSectionCount < 3) {
    return {
      canRenderModules: false,
      warning: "This Product Plan does not have enough recognizable sections for block rendering.",
      structured,
    }
  }

  return {
    canRenderModules: true,
    warning: null,
    structured,
  }
}

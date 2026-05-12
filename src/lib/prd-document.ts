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
  userNeeds: ["Problem Definition / User Needs", "User Needs", "Problem Definition"],
  valueProposition: ["Purpose and Value Proposition", "Value Proposition"],
  vision: ["Vision"],
  objectives: ["Goals / Measurable Outcomes", "Goals", "Measurable Outcomes"],
  positioning: ["Product Positioning", "Positioning"],
  stakeholders: ["Stakeholder List", "Stakeholders"],
  personas: ["User Profiles / Personas", "Personas", "User Profiles"],
  requirements: ["Requirements"],
  userStories: ["User Stories / Use Cases", "User Stories", "Use Cases"],
  prioritization: ["Prioritization"],
  uiUx: ["UI/UX Design Specifications", "UI UX Design Specifications", "UI/UX"],
  technical: ["Technical Requirements"],
}

function getTitle(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Product Requirements"
}

function getSection(sections: PlanningDocumentSection[], aliases: string[]) {
  return findSectionByAliases(sections, aliases)?.content ?? ""
}

function getPersonaSections(personasContent: string) {
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
  const h3Sections = extractSectionsByHeading(content, 3)
  const personasContent = getSection(h3Sections, H3_ALIASES.personas)

  const structured: PrdDocumentStructuredData = {
    title: getTitle(content),
    background: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.background)),
    userNeeds: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.userNeeds)),
    valueProposition: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.valueProposition)),
    vision: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.vision)),
    objectives: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.objectives)),
    positioning: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.positioning)),
    stakeholders: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.stakeholders)),
    personas: getPersonaSections(personasContent),
    requirements: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.requirements)),
    userStories: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.userStories)),
    prioritization: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.prioritization)),
    uiUx: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.uiUx)),
    technical: parseNarrativeTable(getSection(h3Sections, H3_ALIASES.technical)),
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
      warning: "This PRD does not have enough recognizable sections for block rendering.",
      structured,
    }
  }

  return {
    canRenderModules: true,
    warning: null,
    structured,
  }
}

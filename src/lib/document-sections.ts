// src/lib/document-sections.ts
import type { DocumentType } from "@/lib/document-definitions"

export interface DocumentSection {
  /** Unique anchor ID used for scroll targeting and URL hash */
  id: string
  /** Display label shown in the nav sub-tab */
  label: string
}

export interface DocumentNavItem {
  /** Matches DocumentType or a visual sub-type like "executive-summary" / "market-research" */
  key: string
  /** Display label for the nav tab */
  label: string
  /** Which DocumentType this maps to for status/content lookup */
  sourceType: DocumentType
  /** Sub-sections within this document */
  sections: DocumentSection[]
}

/**
 * Ordered list of navigation items for the scrollable project view.
 * "competitive" is split into two visual items: "executive-summary" and
 * "market-research".
 * "prompt" is excluded (rendered as separate full-screen chat view).
 * "techspec" and "deploy" are excluded (not shown in nav per existing config).
 */
export const SCROLLABLE_NAV_ITEMS: DocumentNavItem[] = [
  {
    key: "executive-summary",
    label: "Executive Summary",
    sourceType: "competitive",
    sections: [
      { id: "executive-summary", label: "Overview" },
    ],
  },
  {
    key: "market-research",
    label: "Market Research",
    sourceType: "competitive",
    sections: [
      { id: "market-research-direct-competitors", label: "Direct Competitors" },
      { id: "market-research-landscape-overview", label: "Market Landscape" },
      { id: "market-research-feature-matrix", label: "Feature Comparison" },
      { id: "market-research-positioning", label: "Positioning Map" },
      { id: "market-research-pricing", label: "Pricing Comparison" },
      { id: "market-research-audience", label: "Best Customer Segments" },
      { id: "market-research-gtm", label: "How You'll Reach Customers" },
      { id: "market-research-gap-analysis", label: "Gap Analysis" },
      { id: "market-research-differentiation", label: "Ways to Stand Out" },
      { id: "market-research-moat", label: "What Makes It Hard to Copy" },
      { id: "market-research-mvp-wedge", label: "First Version Focus" },
      { id: "market-research-strategic-recommendations", label: "Recommended Next Moves" },
    ],
  },
  {
    key: "prd",
    label: "Product Plan",
    sourceType: "prd",
    sections: [
      { id: "prd-introduction-overview", label: "Introduction & Overview" },
      { id: "prd-goals", label: "Goals" },
      { id: "prd-team-milestones", label: "Team & Milestones" },
      { id: "prd-success-metrics", label: "Success Metrics" },
      { id: "prd-user-personas", label: "User Personas" },
      { id: "prd-technical-considerations", label: "Technical Considerations" },
      { id: "prd-non-goals-out-of-scope", label: "Non-goals & Out of Scope" },
      { id: "prd-follow-through", label: "Risks, Dependencies & Open Questions" },
      { id: "prd-user-needs", label: "Problem to Solve" },
      { id: "prd-value-proposition", label: "Value Proposition" },
      { id: "prd-personas", label: "Personas" },
      { id: "prd-requirements", label: "What to Build" },
      { id: "prd-user-stories", label: "Key User Flows" },
      { id: "prd-prioritization", label: "Build Order & Experience" },
    ],
  },
  {
    key: "mvp",
    label: "First Version Plan",
    sourceType: "mvp",
    sections: [
      { id: "mvp-summary", label: "MVP Summary" },
      { id: "mvp-bet", label: "The Bet" },
      { id: "mvp-target-user-problem", label: "Target User & Problem" },
      { id: "mvp-core-user-flow", label: "Core User Flows" },
      { id: "mvp-key-assumptions", label: "Key Risks & Assumptions" },
      { id: "mvp-scope", label: "MVP Scope" },
      { id: "mvp-suggested-stack", label: "Suggested Build Approach" },
      { id: "mvp-validation-plan", label: "Validation Plan" },
      { id: "mvp-cut-list", label: "Cut List" },
      { id: "mvp-wedge", label: "First Version Scope" },
      { id: "mvp-core-features", label: "Core Features" },
      { id: "mvp-user-flow", label: "User Flow" },
      { id: "mvp-timeline", label: "Timeline & Risks" },
      { id: "mvp-success-metrics", label: "Success Signals" },
    ],
  },
  {
    key: "mockups",
    label: "Design Mockups",
    sourceType: "mockups",
    sections: [
      { id: "mockups-concept-1", label: "Concept 1" },
      { id: "mockups-concept-2", label: "Concept 2" },
      { id: "mockups-concept-3", label: "Concept 3" },
    ],
  },
  {
    key: "ai-prompts",
    label: "AI Prompts",
    sourceType: "mvp",
    sections: [
      { id: "ai-prompts-recommended-build-tool", label: "Recommended Tool" },
      { id: "ai-prompts-files", label: "Prompt Files" },
    ],
  },
]

/** Get the nav item key for a given anchor section ID */
export function getNavKeyForSection(sectionId: string): string | null {
  for (const item of SCROLLABLE_NAV_ITEMS) {
    if (item.sections.some((s) => s.id === sectionId)) {
      return item.key
    }
  }
  return null
}

/** Get all section IDs as a flat array (for IntersectionObserver registration) */
export function getAllSectionIds(): string[] {
  return Array.from(new Set(SCROLLABLE_NAV_ITEMS.flatMap((item) => [
    item.key, // the document-level anchor
    ...item.sections.map((s) => s.id),
  ])))
}

export function filterNavItemsByRenderedSections(
  navItems: DocumentNavItem[],
  renderedSectionIds: ReadonlySet<string>,
): DocumentNavItem[] {
  return navItems.map((item) => ({
    ...item,
    sections: item.sections.filter((section) => renderedSectionIds.has(section.id)),
  }))
}

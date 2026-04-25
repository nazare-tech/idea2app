// src/lib/document-sections.ts
import type { DocumentType } from "@/lib/document-definitions"

export interface DocumentSection {
  /** Unique anchor ID used for scroll targeting and URL hash */
  id: string
  /** Display label shown in the nav sub-tab */
  label: string
}

export interface DocumentNavItem {
  /** Matches DocumentType or a visual sub-type like "overview" / "market-research" */
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
 * "competitive" is split into two visual items: "overview" and "market-research".
 * "prompt" is excluded (rendered as separate full-screen chat view).
 * "techspec" and "deploy" are excluded (not shown in nav per existing config).
 */
export const SCROLLABLE_NAV_ITEMS: DocumentNavItem[] = [
  {
    key: "overview",
    label: "Overview",
    sourceType: "competitive",
    sections: [
      { id: "overview-executive-summary", label: "Executive Summary" },
      { id: "overview-founder-verdict", label: "Founder Verdict" },
    ],
  },
  {
    key: "market-research",
    label: "Market Research",
    sourceType: "competitive",
    sections: [
      { id: "market-research-direct-competitors", label: "Direct Competitors" },
      { id: "market-research-landscape-overview", label: "Landscape Overview" },
      { id: "market-research-feature-matrix", label: "Feature and Workflow Matrix" },
      { id: "market-research-positioning", label: "Positioning Map" },
      { id: "market-research-pricing", label: "Pricing and Packaging" },
      { id: "market-research-audience", label: "Audience Segments" },
      { id: "market-research-gtm", label: "GTM / Distribution Signals" },
      { id: "market-research-gap-analysis", label: "Gap Analysis" },
      { id: "market-research-differentiation", label: "Differentiation Wedges" },
      { id: "market-research-moat", label: "Moat / Defensibility" },
      { id: "market-research-risks", label: "Risks / Countermoves" },
      { id: "market-research-mvp-wedge", label: "MVP Wedge" },
      { id: "market-research-strategic-recommendations", label: "Strategic Recommendations" },
    ],
  },
  {
    key: "prd",
    label: "PRD",
    sourceType: "prd",
    sections: [
      { id: "prd-user-needs", label: "User Needs / Problem" },
      { id: "prd-value-proposition", label: "Value Proposition" },
      { id: "prd-personas", label: "Personas" },
      { id: "prd-requirements", label: "Requirements" },
      { id: "prd-user-stories", label: "User Stories" },
      { id: "prd-prioritization", label: "Prioritization / UI UX" },
    ],
  },
  {
    key: "mvp",
    label: "MVP Plan",
    sourceType: "mvp",
    sections: [
      { id: "mvp-wedge", label: "MVP Wedge / Scope" },
      { id: "mvp-core-features", label: "Core Features" },
      { id: "mvp-user-flow", label: "User Flow" },
      { id: "mvp-timeline", label: "Timeline / Risks" },
      { id: "mvp-success-metrics", label: "Success Metrics" },
    ],
  },
  {
    key: "mockups",
    label: "Mockups",
    sourceType: "mockups",
    sections: [
      { id: "mockups-concept-1", label: "Concept 1" },
      { id: "mockups-concept-2", label: "Concept 2" },
      { id: "mockups-concept-3", label: "Concept 3" },
    ],
  },
  {
    key: "launch",
    label: "Marketing",
    sourceType: "launch",
    sections: [
      { id: "marketing-audience", label: "Audience Segments" },
      { id: "marketing-gtm", label: "GTM / Distribution Signals" },
      { id: "marketing-budget", label: "Budget Allocation" },
      { id: "marketing-copy-pack", label: "Copy Pack / 14-Day Checklist" },
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
  return SCROLLABLE_NAV_ITEMS.flatMap((item) => [
    item.key, // the document-level anchor
    ...item.sections.map((s) => s.id),
  ])
}

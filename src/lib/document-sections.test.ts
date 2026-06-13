import assert from "node:assert/strict"
import test from "node:test"

import {
  SCROLLABLE_NAV_ITEMS,
  filterNavItemsByRenderedSections,
  getAllSectionIds,
} from "./document-sections"

test("Executive Summary nav item exposes its overview anchor as a selectable child", () => {
  const executiveSummary = SCROLLABLE_NAV_ITEMS.find((item) => item.key === "executive-summary")

  assert.equal(executiveSummary?.label, "Executive Summary")
  assert.deepEqual(executiveSummary?.sections, [
    { id: "executive-summary", label: "Overview" },
  ])
})

test("getAllSectionIds de-duplicates parent anchors reused by child links", () => {
  const sectionIds = getAllSectionIds()

  assert.equal(
    sectionIds.filter((sectionId) => sectionId === "executive-summary").length,
    1
  )
})

test("Product Plan nav labels match the current right-panel section text", () => {
  const productPlan = SCROLLABLE_NAV_ITEMS.find((item) => item.key === "prd")

  assert.deepEqual(productPlan?.sections.slice(0, 10), [
    { id: "prd-introduction-overview", label: "Introduction & Overview" },
    { id: "prd-goals", label: "Goals" },
    { id: "prd-user-personas", label: "User Personas" },
    { id: "prd-user-stories-acceptance-criteria", label: "User Stories & Acceptance Criteria" },
    { id: "prd-functional-requirements", label: "Functional Requirements" },
    { id: "prd-technical-considerations", label: "Technical Considerations" },
    { id: "prd-non-goals-out-of-scope", label: "Non-goals & Out of Scope" },
    { id: "prd-success-metrics", label: "Success Metrics" },
    { id: "prd-timeline-milestones", label: "Timeline & Milestones" },
    { id: "prd-follow-through", label: "Risks, Dependencies & Open Questions" },
  ])
})

test("First Version nav labels match the current right-panel section text", () => {
  const firstVersion = SCROLLABLE_NAV_ITEMS.find((item) => item.key === "mvp")

  assert.deepEqual(firstVersion?.sections.slice(0, 12), [
    { id: "mvp-summary", label: "MVP Summary" },
    { id: "mvp-bet", label: "The Bet" },
    { id: "mvp-target-user-problem", label: "Target User & Problem" },
    { id: "mvp-core-user-flow", label: "Core User Flow" },
    { id: "mvp-key-assumptions", label: "Key Assumptions" },
    { id: "mvp-scope", label: "MVP Scope" },
    { id: "mvp-suggested-stack", label: "Suggested Stack" },
    { id: "mvp-ai-friendly-build-sequence", label: "AI-Friendly Build Sequence" },
    { id: "mvp-validation-plan", label: "Validation Plan" },
    { id: "mvp-cut-list", label: "Cut List" },
    { id: "mvp-ai-build-guardrails", label: "AI Build Guardrails" },
    { id: "mvp-next-prompt", label: "Next Prompt" },
  ])
})

test("filterNavItemsByRenderedSections hides sub-sections without rendered anchors", () => {
  const filtered = filterNavItemsByRenderedSections(
    SCROLLABLE_NAV_ITEMS,
    new Set(["prd-goals", "prd-follow-through", "mvp-summary"]),
  )
  const productPlan = filtered.find((item) => item.key === "prd")
  const firstVersion = filtered.find((item) => item.key === "mvp")
  const marketResearch = filtered.find((item) => item.key === "market-research")

  assert.deepEqual(productPlan?.sections, [
    { id: "prd-goals", label: "Goals" },
    { id: "prd-follow-through", label: "Risks, Dependencies & Open Questions" },
  ])
  assert.deepEqual(firstVersion?.sections, [
    { id: "mvp-summary", label: "MVP Summary" },
  ])
  assert.deepEqual(marketResearch?.sections, [])
})

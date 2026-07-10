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

  assert.deepEqual(productPlan?.sections.slice(0, 7), [
    { id: "prd-introduction-overview", label: "Introduction & Overview" },
    { id: "prd-goals", label: "Goals" },
    { id: "prd-team-milestones", label: "Team & Milestones" },
    { id: "prd-success-metrics", label: "Success Metrics" },
    { id: "prd-user-personas", label: "User Personas" },
    { id: "prd-non-goals-out-of-scope", label: "Non-goals & Out of Scope" },
    { id: "prd-follow-through", label: "Risks, Dependencies & Open Questions" },
  ])
})

test("Market Research nav omits risks because Product Plan owns that section", () => {
  const marketResearch = SCROLLABLE_NAV_ITEMS.find((item) => item.key === "market-research")

  assert.deepEqual(marketResearch?.sections.slice(0, 3), [
    { id: "market-research-direct-competitors", label: "Direct Competitors" },
    { id: "market-research-landscape-overview", label: "Market Landscape" },
    { id: "market-research-feature-matrix", label: "Feature Comparison" },
  ])
  assert.equal(
    marketResearch?.sections.some((section) => section.id === "market-research-risks"),
    false
  )
})

test("First Version nav labels match the current right-panel section text", () => {
  const firstVersion = SCROLLABLE_NAV_ITEMS.find((item) => item.key === "mvp")

  assert.deepEqual(firstVersion?.sections.slice(0, 9), [
    { id: "mvp-summary", label: "MVP Summary" },
    { id: "mvp-key-assumptions", label: "Key Risks & Assumptions" },
    { id: "mvp-target-user-problem", label: "Target User & Problem" },
    { id: "mvp-bet", label: "The Bet" },
    { id: "mvp-core-user-flow", label: "Core User Flows" },
    { id: "mvp-scope", label: "MVP Scope" },
    { id: "mvp-suggested-stack", label: "Suggested Build Approach" },
    { id: "mvp-validation-plan", label: "Validation Plan" },
    { id: "mvp-cut-list", label: "Cut List" },
  ])
})

test("AI Prompts nav appears after Design Mockups with moved build handoff sections", () => {
  const labels = SCROLLABLE_NAV_ITEMS.map((item) => item.label)
  const aiPrompts = SCROLLABLE_NAV_ITEMS.find((item) => item.key === "ai-prompts")

  assert.ok(labels.indexOf("Design Mockups") < labels.indexOf("AI Prompts"))
  assert.equal(aiPrompts?.sourceType, "mvp")
  assert.deepEqual(aiPrompts?.sections, [
    { id: "ai-prompts-recommended-build-tool", label: "Recommended Tool" },
    { id: "ai-prompts-files", label: "Prompt Files" },
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

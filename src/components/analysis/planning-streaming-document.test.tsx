import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"

import { PlanningStreamingDocument } from "@/components/analysis/planning-streaming-document"

test("PRD stream renders arrived sections through designed blocks and skeletons for the rest", () => {
  const content = [
    "# Product Plan",
    "",
    "## 1. Introduction/Overview",
    "",
    "An intro paragraph about the product.",
    "",
    "## 2. Goals",
    "",
    "### 2.1 Business Goals",
    "1. **Reach:** 100 users",
  ].join("\n")

  const html = renderToStaticMarkup(
    <PlanningStreamingDocument
      docType="prd"
      content={content}
      finished={false}
      projectId="p1"
      smoothTail={false}
    />,
  )

  // Masthead + arrived section through the real renderer
  assert.match(html, /Product Plan/)
  assert.match(html, /Introduction &amp; Overview/)
  assert.match(html, /An intro paragraph about the product\./)
  assert.match(html, /100 users/)
  // Sections that have not arrived render as titled skeletons
  assert.match(html, /Team &amp; Milestones/)
  assert.match(html, /User Personas/)
  // No legacy-format warning while the stream is still short
  assert.doesNotMatch(html, /older format/)
})

test("shipping MVP stream assembly sanitizes the active section tail", () => {
  const content = [
    "# First Version Plan",
    "",
    "## MVP Summary",
    "",
    "Solo founders **who need a faster planning loop.",
  ].join("\n")

  const html = renderToStaticMarkup(
    <PlanningStreamingDocument
      docType="mvp"
      content={content}
      finished={false}
      projectId="p1"
      smoothTail={false}
    />,
  )

  assert.match(html, /Solo founders who need a faster planning loop\./)
  assert.doesNotMatch(html, /\*\*/)
})

test("MVP stream shows all expected titles as skeletons before the first section", () => {
  const html = renderToStaticMarkup(
    <PlanningStreamingDocument docType="mvp" content={"# First"} finished={false} projectId="p1" />,
  )

  assert.match(html, /MVP Summary/)
  assert.match(html, /Key Risks &amp; Assumptions/)
  assert.match(html, /Validation Plan/)
})

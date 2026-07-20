import test from "node:test"
import assert from "node:assert/strict"

import {
  getDesignListRows,
  getFvpAssumptionRows,
  getFvpScopeRows,
  getFvpShortcutSections,
  getNestedDesignCards,
} from "./first-version-plan-view-model"

test("first-version view model derives table and labeled-list rows", () => {
  assert.deepEqual(
    getDesignListRows(`| Step | Build Chunk |\n|---|---|\n| 1 | Intake form |`),
    [{
      title: "1",
      body: "Intake form",
      row: ["1", "Intake form"],
      headers: ["Step", "Build Chunk"],
    }],
  )
  assert.deepEqual(getDesignListRows("- Frontend: Next.js"), [{
    title: "Frontend",
    body: "Next.js",
    row: [],
    headers: [],
  }])
})

test("first-version view model derives risk labels, scope rows, and nested cards", () => {
  assert.deepEqual(
    getFvpAssumptionRows({ heading: "Risks", content: "- [HIGH CONFIDENCE] Buyers need faster reviews." }),
    [{ tag: "HIGH CONFIDENCE", title: "Buyers need faster reviews.", body: "" }],
  )

  assert.deepEqual(
    getFvpScopeRows({
      scope: { heading: "Scope", content: "- Exclude CRM: Defer integrations" },
      features: { heading: "Features", content: "- Intake form: Capture requirements" },
    }),
    [
      { tag: "Out Of Scope", title: "Exclude CRM", body: "Defer integrations" },
      { tag: "Feature", title: "Intake form", body: "Capture requirements" },
    ],
  )

  assert.deepEqual(
    getNestedDesignCards({ heading: "Target User", content: "### Primary User\nDesigners who send proposals." }),
    [{ title: "Primary User", body: "Designers who send proposals." }],
  )
})

test("first-version view model selects only tactical shortcut subsections", () => {
  const sections = getFvpShortcutSections({
    heading: "Build Approach",
    content: "### Tactical Shortcuts\n- Start manually.\n\n### Architecture\n- Use Next.js.",
  })

  assert.deepEqual(sections.map((section) => section.heading), ["Tactical Shortcuts"])
})

import test from "node:test"
import assert from "node:assert/strict"

import { MVP_PLAN_SYSTEM_PROMPT, PRD_SYSTEM_PROMPT } from "./prompts"

// These tests guard the prompt-to-renderer contract: the prompts must keep
// instructing the exact headings, labels, and tables that the current block
// renderers (src/components/analysis/product-plan-blocks.tsx and
// first-version-plan-blocks.tsx, via planning-document-parser aliases) consume by name.
// They were last aligned to the current 13-section MVP / numbered-PRD contract
// on 2026-06-12 after the prompt-shortening work; the parsers' alias lists are
// the source of truth and were verified to match these assertions.

test("Product Plan prompt asks for a scannable, bulleted structure with a quality bar", () => {
  assert.match(PRD_SYSTEM_PROMPT, /## PRD quality standards/)
  assert.match(PRD_SYSTEM_PROMPT, /Bullet list of proposed business goals/)
  assert.doesNotMatch(PRD_SYSTEM_PROMPT, /File output instruction/)
  assert.match(PRD_SYSTEM_PROMPT, /Use bullet points\. Explain briefly why each item is deferred/)
})

test("Product Plan prompt uses the requested section order and requirement groups", () => {
  // Personas: exactly 3, with the card fields the persona renderer reads.
  assert.match(PRD_SYSTEM_PROMPT, /Exactly 3 personas/)
  assert.match(PRD_SYSTEM_PROMPT, /\*\*Description\*\*/)
  assert.match(PRD_SYSTEM_PROMPT, /\*\*Needs\*\*/)
  assert.match(PRD_SYSTEM_PROMPT, /\*\*Pain points\*\*/)
  assert.match(PRD_SYSTEM_PROMPT, /\*\*Motivation\*\*/)

  // Functional requirements are split into the three grouped subsections.
  assert.match(PRD_SYSTEM_PROMPT, /6\.1 Core requirements/)
  assert.match(PRD_SYSTEM_PROMPT, /6\.2 States and errors/)
  assert.match(PRD_SYSTEM_PROMPT, /6\.3 Constraints/)

  // Numbered top-level sections appear in the contract order the renderer expects.
  const milestonesIndex = PRD_SYSTEM_PROMPT.indexOf("## 3. Team and Milestones")
  const metricsIndex = PRD_SYSTEM_PROMPT.indexOf("## 4. Success metrics")
  const personasIndex = PRD_SYSTEM_PROMPT.indexOf("## 5. User personas")
  const requirementsIndex = PRD_SYSTEM_PROMPT.indexOf("## 6. Functional requirements")
  const storiesIndex = PRD_SYSTEM_PROMPT.indexOf("## 7. User stories and acceptance criteria")
  const nonGoalsIndex = PRD_SYSTEM_PROMPT.indexOf("## 8. Non-goals / out of scope")
  const technicalIndex = PRD_SYSTEM_PROMPT.indexOf("## 9. Technical considerations")

  assert.ok(milestonesIndex > -1)
  assert.ok(metricsIndex > milestonesIndex)
  assert.ok(personasIndex > metricsIndex)
  assert.ok(requirementsIndex > personasIndex)
  assert.ok(storiesIndex > requirementsIndex)
  assert.ok(nonGoalsIndex > storiesIndex)
  assert.ok(technicalIndex > nonGoalsIndex)
})

test("First Version Plan prompt keeps concision and compression guidance", () => {
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Adaptive depth & compression/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Be concise/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Avoid fake precision/)
})

test("First Version Plan handoff keeps first-prompt and project rules aligned", () => {
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Read and follow project-context\.md/i)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /failing test or acceptance check/i)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /red, green, refactor/i)
})

test("First Version Plan prompt preserves the renderer heading contract", () => {
  const requiredHeadings = [
    "# MVP Plan: [Product Name]",
    "## 1. MVP Summary",
    "## 2. Key Risks, Assumptions, and Scope Decisions",
    "## 3. Target User and Problem",
    "## 4. MVP Goal, Definition of Done, and Riskiest Assumptions",
    "## 5. Core User Flows",
    "## 6. Suggested Build Approach",
    "## 7. Recommended AI Build Tool",
    "## 8. AI-Friendly Build Sequence",
    "## 9. Validation Plan",
    "## 10. Next Prompt for AI Coding Tool",
  ]

  let previousIndex = -1

  for (const heading of requiredHeadings) {
    const nextIndex = MVP_PLAN_SYSTEM_PROMPT.indexOf(heading)
    assert.ok(nextIndex > previousIndex, `${heading} should appear after the previous required heading`)
    previousIndex = nextIndex
  }
})

test("First Version Plan prompt names required nested labels for visual cards", () => {
  for (const label of [
    "Primary User",
    "Current Workaround",
    "Desired Outcome",
    "Riskiest Product Assumption",
    "Riskiest Technical Assumption",
    "KEY RISK",
    "Tactical shortcuts for speed to market",
    "Allowed tools only",
    "Handoff instruction",
    "First test audience",
    "How to find them",
    "Research plan",
    "Phase thresholds",
  ]) {
    assert.match(MVP_PLAN_SYSTEM_PROMPT, new RegExp(label))
  }
})

test("First Version Plan prompt keeps the required markdown tables", () => {
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /\| Risk to Retire \| Impact \| Uncertainty \| Validation Action \|/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /\| Flow \/ Capability \| User Action \| Value \/ Why It Matters \| Include in MVP \| Exclude for Now \| Validation Action \|/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /\| Layer \| Recommendation \| Reason \|/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /\| Step \| Build Chunk \| Goal \| Test Before Moving On \|/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /\| Research Activity \| Question It Answers \| Observable Signal \/ Threshold \| Decision It Informs \|/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /\| Phase \| Audience \/ Task \| Minimum Exit Criterion \| Decision \|/)
})

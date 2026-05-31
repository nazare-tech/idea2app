import test from "node:test"
import assert from "node:assert/strict"

import { MVP_PLAN_SYSTEM_PROMPT, PRD_SYSTEM_PROMPT } from "./prompts"

test("Product Plan prompt asks for bullet points where they improve scanability", () => {
  assert.match(PRD_SYSTEM_PROMPT, /Use bullet points wherever they make the document easier to scan/)
  assert.match(PRD_SYSTEM_PROMPT, /If a paragraph lists more than two related ideas, convert it into bullets/)
  assert.match(PRD_SYSTEM_PROMPT, /Preserve required markdown tables/)
})

test("Product Plan prompt uses the requested section order and requirement groups", () => {
  assert.doesNotMatch(PRD_SYSTEM_PROMPT, /^---$/m)
  assert.doesNotMatch(PRD_SYSTEM_PROMPT, /##\s+\d+\.\s+User experience/i)
  assert.match(PRD_SYSTEM_PROMPT, /Create exactly 3 personas/)
  assert.match(PRD_SYSTEM_PROMPT, /- \*\*Archetype\*\*:/)
  assert.match(PRD_SYSTEM_PROMPT, /- \*\*Meta\*\*: Age/)
  assert.match(PRD_SYSTEM_PROMPT, /- \*\*Description\*\*:/)
  assert.match(PRD_SYSTEM_PROMPT, /- \*\*Needs\*\*:/)
  assert.match(PRD_SYSTEM_PROMPT, /- \*\*Pain points\*\*:/)
  assert.match(PRD_SYSTEM_PROMPT, /- \*\*Motivation\*\*:/)
  assert.match(PRD_SYSTEM_PROMPT, /### 5\.1 Functional/)
  assert.match(PRD_SYSTEM_PROMPT, /### 5\.2 Non-Functional/)
  assert.match(PRD_SYSTEM_PROMPT, /### 5\.3 Integration/)

  const personasIndex = PRD_SYSTEM_PROMPT.indexOf("## 3. User personas")
  const storiesIndex = PRD_SYSTEM_PROMPT.indexOf("## 4. User stories and acceptance criteria")
  const requirementsIndex = PRD_SYSTEM_PROMPT.indexOf("## 5. Functional requirements")
  const technicalIndex = PRD_SYSTEM_PROMPT.indexOf("## 6. Technical considerations")
  const nonGoalsIndex = PRD_SYSTEM_PROMPT.indexOf("## 7. Non-goals / out of scope")

  assert.ok(personasIndex > -1)
  assert.ok(storiesIndex > personasIndex)
  assert.ok(requirementsIndex > storiesIndex)
  assert.ok(technicalIndex > requirementsIndex)
  assert.ok(nonGoalsIndex > technicalIndex)
})

test("First Version Plan prompt asks for bullet points where they improve scanability", () => {
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Use bullet points wherever they make the plan easier/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /If a paragraph lists more than two related ideas, convert it into bullets/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Preserve required markdown tables/)
})

test("First Version Plan prompt preserves the renderer heading contract", () => {
  const requiredHeadings = [
    "# MVP Plan: [Product Name]",
    "## 1. MVP Summary",
    "## 2. Key Assumptions and Scope Decisions",
    "## 3. Target User and Problem",
    "## 4. MVP Goal, Definition of Done, and Riskiest Assumptions",
    "## 5. Core User Flow",
    "## 6. MVP Scope",
    "## 7. Must-Have Features",
    "## 8. Suggested Build Approach",
    "## 9. AI-Friendly Build Sequence",
    "## 10. AI Build Guardrails",
    "## 11. Validation Plan",
    "## 12. Cut List",
    "## 13. Next Prompt for AI Coding Tool",
  ]

  let previousIndex = -1

  for (const heading of requiredHeadings) {
    const nextIndex = MVP_PLAN_SYSTEM_PROMPT.indexOf(heading)
    assert.ok(nextIndex > previousIndex, `${heading} should appear after the previous required heading`)
    previousIndex = nextIndex
  }

  assert.match(MVP_PLAN_SYSTEM_PROMPT, /do not omit, rename, reorder, or combine the required H2 sections/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Keep all 13 numbered H2 section headings exactly as written/)
})

test("First Version Plan prompt names required nested labels for visual cards", () => {
  for (const label of [
    "Primary User",
    "Problem",
    "Current Workaround",
    "Desired Outcome",
    "Riskiest Product Assumption",
    "Riskiest Technical Assumption",
    "Suggested Stack",
    "Manual Shortcuts",
    "First Test Audience",
    "How to Find Them",
    "Success Signals",
    "Suggested Metrics",
    "Key Feedback Questions",
  ]) {
    assert.match(MVP_PLAN_SYSTEM_PROMPT, new RegExp(label))
  }
})

test("First Version Plan prompt keeps required tables but uses metric bullets", () => {
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Preserve the required markdown tables for MVP Scope, Must-Have Features, Suggested Stack, AI-Friendly Build Sequence, and Cut List/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /\| Category \| Include in MVP \| Exclude for Now \|/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /\| Feature \| Why It Matters \| Acceptance Criteria \|/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /\| Layer \| Recommendation \| Reason \|/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /\| Step \| Build Chunk \| Goal \| Test Before Moving On \|/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /\| If This Gets Complicated \| Simplify By \|/)
  assert.match(MVP_PLAN_SYSTEM_PROMPT, /Format Suggested Metrics as 3-5 bullet\/stat items, not a markdown table/)
  assert.doesNotMatch(MVP_PLAN_SYSTEM_PROMPT, /\| Metric \| Suggested Target \| Why This Matters \|/)
})

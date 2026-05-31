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

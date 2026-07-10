import test from "node:test"
import assert from "node:assert/strict"

import { getAiPromptsReadiness } from "@/lib/ai-prompts-readiness"

const completePrd = `# PRD: Fixture

## 3. Team and Milestones

### Agents
- **Full-stack engineer**: Build the product.

## 6. Functional requirements
- FR-001: Create the core flow.

## 7. User stories and acceptance criteria
- As a user, I can complete the core flow.

## 9. Technical considerations
- Use a typed web stack.
`

const completeMvp = `# First Version Plan: Fixture

## MVP Summary
Build the smallest useful version.

## Target User and Problem
Founders need a clear plan.

## MVP Goal, Definition of Done, and Riskiest Assumptions
The core flow works end to end.

## Suggested Build Approach
Use the existing stack.

## Recommended AI Build Tool
### Cursor
- **Why it fits**: Good repo-aware workflow.

## AI-Friendly Build Sequence
1. Build the shell.

## Next Prompt for AI Coding Tool
\`\`\`text
Build the shell.
\`\`\`
`

test("getAiPromptsReadiness waits when neither source document is available", () => {
  const result = getAiPromptsReadiness({
    prdContent: null,
    mvpContent: null,
    prdSettled: false,
    mvpSettled: false,
  })

  assert.equal(result.status, "waiting")
  assert.equal(result.availableCount, 0)
})

test("getAiPromptsReadiness reports incomplete when empty source rows are settled", () => {
  const result = getAiPromptsReadiness({
    prdContent: null,
    mvpContent: null,
    prdSettled: true,
    mvpSettled: true,
  })

  assert.equal(result.status, "incomplete")
  assert.equal(result.availableCount, 0)
})

test("getAiPromptsReadiness reports partial while source documents are still arriving", () => {
  const result = getAiPromptsReadiness({
    prdContent: completePrd,
    mvpContent: null,
    prdSettled: true,
    mvpSettled: false,
  })

  assert.equal(result.status, "partial")
  assert.ok(result.availableCount > 0)
  assert.ok(result.missingKeys.includes("recommended-tool"))
  assert.ok(result.missingKeys.includes("first-prompt"))
})

test("getAiPromptsReadiness reports incomplete when settled documents lack required handoff content", () => {
  const result = getAiPromptsReadiness({
    prdContent: "# PRD\n\n## 1. Introduction/overview\nA plan.",
    mvpContent: "# First Version Plan\n\n## MVP Summary\nA first version.",
    prdSettled: true,
    mvpSettled: true,
  })

  assert.equal(result.status, "incomplete")
  assert.ok(result.missingKeys.includes("functional-requirements"))
  assert.ok(result.missingKeys.includes("recommended-tool"))
})

test("getAiPromptsReadiness accepts the Agents list nested at H4 under Milestones", () => {
  // Real generations put "#### Agents" inside "### 3.4 Milestones" instead of
  // an H3 sibling; the list must still count as a derivable sub-agents source.
  const nestedAgentsPrd = completePrd.replace(
    "### Agents",
    "### 3.4 Milestones\n\n#### Agents",
  )

  const result = getAiPromptsReadiness({
    prdContent: nestedAgentsPrd,
    mvpContent: completeMvp,
    prdSettled: true,
    mvpSettled: true,
  })

  assert.equal(result.status, "ready")
  assert.ok(!result.missingKeys.includes("sub-agents"))
})

test("getAiPromptsReadiness is ready only when the full current handoff bundle is derivable", () => {
  const result = getAiPromptsReadiness({
    prdContent: completePrd,
    mvpContent: completeMvp,
    prdSettled: true,
    mvpSettled: true,
  })

  assert.equal(result.status, "ready")
  assert.deepEqual(result.missingKeys, [])
  assert.equal(result.availableCount, result.requiredCount)
})

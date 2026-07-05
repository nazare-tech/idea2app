import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import {
  AiPromptsDocumentBlocks,
  MvpPlanDocumentBlocks,
} from "./first-version-plan-blocks"

const mvpFixture = `# MVP Plan: Maker Compass

## I. MVP Overview

### 1.1 Product Vision Summary
Maker Compass helps founders move from idea to plan.

### 1.2 MVP Hypothesis
We believe founders want build-ready plans.

### 1.3 Problem Being Validated
Planning artifacts are scattered.

### 1.4 Target User Segment
- Primary User: Solo founder

### 1.5 MVP Scope Boundaries
| In Scope (MVP) | Out of Scope (Post-MVP) |
|---|---|
| Idea intake | Multi-user approvals |

## II. Core MVP Features

### 2.1 Feature Summary Table
| ID | Feature | Priority |
|---|---|---|
| MVP-001 | Block PRD rendering | P1 |

### 2.2 Feature Details
#### MVP-001: Block PRD rendering
Render completed PRDs as organized blocks.

## III. User Flow

### 3.1 Primary User Journey
Founder submits idea and waits for completed planning docs.

## VI. Timeline & Milestones

### 6.2 Milestone Details
- Week 1: Parser and tests

## VII. Success Metrics & Validation

### 7.1 MVP Success Criteria
- 80% of generated MVP plans render as blocks.
`

test("MvpPlanDocumentBlocks renders organized module anchors", () => {
  const html = renderToStaticMarkup(
    <MvpPlanDocumentBlocks content={mvpFixture} projectId="project-1" />,
  )

  assert.match(html, /First Version Plan/)
  assert.match(html, /-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10/)
  assert.doesNotMatch(html, /border-b border-\[#E0E0E0\]/)
  assert.match(html, /id="mvp-wedge"/)
  assert.match(html, /What We Need to Prove/)
  assert.match(html, /id="mvp-core-features"/)
  assert.match(html, /MVP-001: Block PRD rendering/)
  assert.match(html, /id="mvp-success-metrics"/)
  assert.match(html, /Product Vision/)
  assert.doesNotMatch(html, /border border-\[#E0E0E0\] bg-white px-6 py-5/)
  assert.doesNotMatch(html, /space-y-2 px-6 py-5/)
  assert.doesNotMatch(html, /px-6 pb-6/)
  assert.doesNotMatch(html, /border rounded-none/)
  assert.doesNotMatch(html, /border-\[#D8CEC5\] bg-\[#F5F0EB\]/)
})

test("MvpPlanDocumentBlocks makes the final odd feature card full width", () => {
  const html = renderToStaticMarkup(
    <MvpPlanDocumentBlocks content={mvpFixture} projectId="project-1" />,
  )

  assert.match(html, /xl:col-span-2/)
})

test("MvpPlanDocumentBlocks renders current numbered MVP prompt content as blocks", () => {
  const html = renderToStaticMarkup(
    <MvpPlanDocumentBlocks
      projectId="project-1"
      content={`# MVP Plan: Proposal Pilot

## 1. MVP Summary
Proposal Pilot helps freelance designers turn client notes into proposals.

## 2. Key Assumptions and Scope Decisions
- [HIGH CONFIDENCE] Freelance designers need faster proposal turnaround.
- [SCOPE DECISION] CRM features are excluded from the MVP.

## 3. Target User and Problem
### Primary User
Freelance designers who manage proposals manually.
### Problem
They rewrite scope and pricing language for every lead.
### Riskiest Product Assumption
Designers will trust the generated draft enough to edit it.

## 4. Core User Flow
1. User opens the proposal workspace.
2. User enters client notes.
3. System generates a proposal draft.

## 5. MVP Scope
| Category | Include in MVP | Exclude for Now |
|---|---|---|
| Core input | Structured proposal intake | CRM import |

## 6. Must-Have Features
| Feature | Why It Matters | Acceptance Criteria |
|---|---|---|
| Proposal intake | Captures useful context | User can submit required fields |

## 7. Suggested Build Approach
| Layer | Recommendation | Why |
|---|---|---|
| Frontend | Next.js + Tailwind | Fast workspace UI |

## 8. AI-Friendly Build Sequence
| Step | Build Chunk | Goal | Test Before Moving On |
|---|---|---|---|
| 1 | Proposal intake form | Capture context | Submit valid and invalid input |

## 9. Validation Plan
### First Test Audience
Five freelance designers who send proposals monthly.

### Suggested Metrics
- 60% of users complete a generation.

## 10. Cut List
- If CRM import takes too long, then use CSV upload only.

## 11. AI Build Guardrails
- Build one chunk at a time.
- Do not add features outside MVP scope.

## 12. Next Prompt for AI Coding Tool
Start with the proposal intake form and mock proposal generation.
`}
    />,
  )

  assert.doesNotMatch(html, /Block view unavailable/)
  assert.match(html, /First Version Plan/)
  assert.match(html, /MVP Summary/)
  assert.match(html, /id="mvp-summary"/)
  assert.doesNotMatch(html, /id="mvp-bet"/)
  assert.match(html, /id="mvp-target-user-problem"/)
  assert.match(html, /id="mvp-core-user-flow"/)
  assert.match(html, /id="mvp-key-assumptions"/)
  assert.match(html, /id="mvp-scope"/)
  assert.match(html, /id="mvp-suggested-stack"/)
  assert.match(html, /id="mvp-validation-plan"/)
  assert.match(html, /id="mvp-cut-list"/)
  assert.match(html, /Target User &amp; Problem/)
  assert.match(html, /Core User Flow/)
  assert.match(html, /Key Risks &amp; Assumptions/)
  assert.match(html, /MVP Scope/)
  assert.match(html, /Suggested Build Approach/)
  assert.match(html, /Validation Plan/)
  assert.match(html, /Cut List/)
  assert.match(html, /01 \/ 08/)
  assert.match(html, /08 \/ 08/)
  assert.match(html, /fvp-flow/)
  assert.match(html, /fvp-cuts/)
  assert.match(html, /pp-tech-grid/)
  assert.match(html, /pp-nongoals/)
  assert.match(html, /Proposal intake/)
  assert.match(html, /Next\.js \+ Tailwind/)
  assert.match(html, /60%/)
  assert.match(html, /HIGH CONFIDENCE/)
  assert.match(html, /Freelance designers need faster proposal turnaround/)
  assert.doesNotMatch(html, /\[HIGH CONFIDENCE\]/)
  assert.doesNotMatch(html, /Key Assumptions &amp; Scope/)
  assert.doesNotMatch(html, /Build Steps/)
  assert.doesNotMatch(html, /min-w-\[140px\]/)
  assert.doesNotMatch(html, /Plan Snapshot/)
  assert.doesNotMatch(html, /bg-\[#FAFAFA\] px-5 py-5/)
  assert.doesNotMatch(html, /bg-\[#4A4040\]/)
  assert.doesNotMatch(html, /grid gap-4 xl:grid-cols-2/)
  assert.doesNotMatch(html, /What We Need to Prove/)
  assert.doesNotMatch(html, /Core Features/)
  assert.doesNotMatch(html, /id="mvp-ai-friendly-build-sequence"/)
  assert.doesNotMatch(html, /id="mvp-ai-build-guardrails"/)
  assert.doesNotMatch(html, /id="mvp-next-prompt"/)
  assert.doesNotMatch(html, /AI-Friendly Build Sequence/)
  assert.doesNotMatch(html, /AI Build Guardrails/)
  assert.doesNotMatch(html, /Next Prompt/)
})

test("AiPromptsDocumentBlocks renders recommended tool before handoff sections", () => {
  const html = renderToStaticMarkup(
    <AiPromptsDocumentBlocks
      projectId="project-1"
      prdContent={`# PRD

## Functional requirements
- Users can create a proposal from structured intake fields.

## User stories and acceptance criteria
- As a designer, I can generate a proposal draft.
`}
      mvpContent={`# MVP Plan

## Recommended AI Build Tool
### Cursor
- **Why this tool**: Full-stack Next.js/Supabase project in an existing GitHub repo.
- **Best fit for this project**: Build the proposal intake and generated proposal review screens first.
- **Expected starting cost**: Free tier first; $20/month Pro once iteration starts.
- **Watch out**: Verify Supabase RLS policy syntax manually.
- **Handoff instruction**: Clone your repo, open it in Cursor, and paste the Next Prompt.

## Next Prompt for AI Coding Tool
Start with the proposal intake form.

## AI Build Guardrails
- Build one chunk at a time.

## AI-Friendly Build Sequence
| Step | Build Chunk | Goal | Test Before Moving On |
|---|---|---|---|
| 1 | Proposal intake form | Capture context | Submit valid and invalid input |
`}
    />,
  )

  assert.match(html, /AI Prompts/)
  assert.match(html, /Recommended AI Build Tool/)
  assert.match(html, /href="https:\/\/cursor\.com"/)
  assert.match(html, /id="ai-prompts-recommended-build-tool"/)
  assert.match(html, /id="ai-prompts-next-prompt"/)
  assert.match(html, /id="ai-prompts-build-guardrails"/)
  assert.match(html, /id="ai-prompts-build-sequence"/)
  assert.match(html, /id="ai-prompts-functional-requirements"/)
  assert.match(html, /id="ai-prompts-user-stories-acceptance-criteria"/)
  assert.ok(html.indexOf("Recommended AI Build Tool") < html.indexOf("Next Prompt"))
  assert.ok(html.indexOf("Next Prompt") < html.indexOf("AI Build Guardrails"))
  assert.ok(html.indexOf("AI Build Guardrails") < html.indexOf("AI-Friendly Build Sequence"))
})

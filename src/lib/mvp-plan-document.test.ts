import test from "node:test"
import assert from "node:assert/strict"

import { getMvpPlanViewModel } from "./mvp-plan-document"

const mvpFixture = `# MVP Plan: Maker Compass

**Created**: 2026-05-12
**Status**: Draft
**Target MVP Duration**: 6 weeks

## I. MVP Overview

### 1.1 Product Vision Summary
Maker Compass helps founders move from idea to validated build plan.

### 1.2 MVP Hypothesis
**We believe that** solo founders
**Want to** turn an idea into a buildable plan
**We will know we are right when** 60% complete the planning flow.

### 1.3 Problem Being Validated
Founders lose momentum when planning artifacts are scattered.

### 1.4 Target User Segment
- **Primary User**: Solo founder
- **User Context**: Before hiring a team
- **Success Looks Like**: A buildable MVP scope

### 1.5 MVP Scope Boundaries
| In Scope (MVP) | Out of Scope (Post-MVP) |
|---|---|
| Idea intake | Multi-user approvals |

## II. Core MVP Features

### 2.1 Feature Summary Table
| ID | Feature | PRD Reference | User Value | Priority |
|---|---|---|---|---|
| MVP-001 | Block PRD rendering | FR-002 | Faster scanning | P1 |

### 2.2 Feature Details

#### MVP-001: Block PRD rendering
**PRD Reference**: FR-002
**Description**: Render completed PRDs as organized blocks.
**Acceptance Criteria**:
- [ ] Shows block view after save.
- [ ] Shows loading during generation.

## III. User Flow

### 3.1 Primary User Journey
Founder submits idea and waits for completed planning docs.

### 3.3 Critical Path Diagram (mermaid)
\`\`\`mermaid
graph LR
Idea --> PRD
PRD --> MVP
\`\`\`

## VI. Timeline & Milestones

### 6.2 Milestone Details
- Week 1: Parser and tests
- Week 2: Renderer integration

## VII. Success Metrics & Validation

### 7.1 MVP Success Criteria
- 80% of generated MVP plans render as blocks.

## VIII. Open Questions & Assumptions

### 8.1 Assumptions
- Existing markdown remains supported.
`

test("getMvpPlanViewModel parses block-ready MVP content", () => {
  const viewModel = getMvpPlanViewModel(mvpFixture)

  assert.equal(viewModel.canRenderModules, true)
  assert.equal(viewModel.structured.title, "MVP Plan: Maker Compass")
  assert.equal(viewModel.structured.scope.table?.headers[0], "In Scope (MVP)")
  assert.equal(viewModel.structured.featureSummary.table?.rows[0][0], "MVP-001")
  assert.equal(viewModel.structured.featureDetails[0].heading, "MVP-001: Block PRD rendering")
  assert.match(viewModel.structured.userFlow[1].content, /graph LR/)
  assert.match(viewModel.structured.successMetrics[0].content, /80%/)
})

test("getMvpPlanViewModel parses current First Version Plan headings", () => {
  const viewModel = getMvpPlanViewModel(`# First Version Plan: Maker Compass

## I. First Version Overview

### 1.1 Product Vision
Maker Compass helps founders move from idea to plan.

### 1.2 What We Need to Prove
Founders will complete a plan in one session.

### 1.3 Problem to Prove
Planning work is scattered.

### 1.4 Target Customer
- Solo founder

### 1.5 What's In / Out
| In Scope (First Version) | Out of Scope (Later) |
|---|---|
| Idea intake | Team approvals |

## II. Core Features

### 2.1 Feature Summary Table
| ID | Feature | Priority |
|---|---|---|
| MVP-001 | Idea intake | P1 |

### 2.2 Feature Details
#### MVP-001: Idea intake
Capture the founder's idea.

## III. User Flow
Founder submits an idea and reviews the plan.

## VI. Timeline & Risks
Week 1: Intake and generation.

## VII. Success Signals & Validation
- 70% complete the first plan.
`)

  assert.equal(viewModel.canRenderModules, true)
  assert.equal(viewModel.structured.title, "First Version Plan: Maker Compass")
  assert.equal(viewModel.structured.scope.table?.headers[0], "In Scope (First Version)")
  assert.match(viewModel.structured.hypothesis.paragraphs.join(" "), /complete a plan/)
  assert.match(viewModel.structured.successMetrics[0].content, /70%/)
})

test("getMvpPlanViewModel parses current numbered First Version Plan prompt headings", () => {
  const viewModel = getMvpPlanViewModel(`# MVP Plan: Proposal Pilot

> **Product type detected:** B2B SaaS, AI-first Product
> **Recommended first version:** Functional software MVP

## 1. MVP Summary

Proposal Pilot helps freelance designers turn client discovery notes into client-ready proposals. The MVP validates whether designers will trust an AI-assisted draft enough to edit and send it.

## 2. Key Assumptions and Scope Decisions

- [HIGH CONFIDENCE] Freelancers need faster proposal turnaround.
- [SCOPE DECISION] CRM features are excluded from the MVP.

## 3. Target User and Problem

### Primary User
Freelance designers who manage proposals manually.

### Problem
They spend too much time rewriting scope, timeline, and pricing language for every lead.

### Current Workaround
They copy old proposal documents and manually edit them.

### Desired Outcome
Send a credible proposal shortly after a client call.

### Riskiest Product Assumption
Designers will trust the generated proposal enough to edit it instead of starting from a blank document.

### Riskiest Technical Assumption
AI output quality is good enough for first-draft proposal language.

## 4. Core User Flow

1. User opens the proposal workspace.
2. User enters client notes, services, budget, and timeline.
3. System generates a proposal draft.
4. User edits the draft.
5. User exports or copies the proposal.

## 5. MVP Scope

| Category | Include in MVP | Exclude for Now |
|---|---|---|
| User access | Email login | Team roles |
| Core input | Structured proposal intake | CRM import |
| Core output | Editable proposal draft | E-signature |

## 6. Must-Have Features

| Feature | Why It Matters | Acceptance Criteria |
|---|---|---|
| Proposal intake | Captures enough context for a useful draft | User can submit required fields |
| Proposal generation | Delivers the core value | User sees loading, success, and error states |

## 7. Suggested Build Approach

### Suggested Stack

| Layer | Recommendation | Reason |
|---|---|---|
| Frontend | Next.js | Fast web MVP |
| Database | Supabase | Store proposals |
| AI / API | Server-side AI route | Keep keys private |

### Manual Shortcuts
- Manually review the first generated proposals with beta users.

## 8. AI-Friendly Build Sequence

| Step | Build Chunk | Goal | Test Before Moving On |
|---|---|---|---|
| 1 | Proposal intake form | Capture required context | Submit valid and invalid input |
| 2 | AI draft route | Generate proposal copy | Mock successful and failed generation |

## 9. Validation Plan

### First Test Audience
Five freelance designers who send at least two proposals per month.

### Success Signals
| Signal Type | What to Look For |
|---|---|
| Strong Signal | Users edit and send generated proposals |

## 10. Cut List

| If This Gets Complicated | Simplify By |
|---|---|
| Auth too slow | Use invite-only magic links |

## 11. AI Build Guardrails
- Do not build CRM integrations.

## 12. Next Prompt for AI Coding Tool

\`\`\`text
Build the proposal intake form first.
\`\`\`
`)

  assert.equal(viewModel.canRenderModules, true)
  assert.match(viewModel.structured.overview.paragraphs.join(" "), /Proposal Pilot/)
  assert.match(viewModel.structured.hypothesis.source, /Designers will trust/)
  assert.match(viewModel.structured.targetUser.source, /Freelance designers/)
  assert.equal(viewModel.structured.scope.table?.headers[0], "Category")
  assert.equal(viewModel.structured.featureSummary.table?.rows[0][0], "Proposal intake")
  assert.match(viewModel.structured.userFlow[0].content, /proposal workspace/)
  assert.match(viewModel.structured.techStack[0].content, /Next.js/)
  assert.match(viewModel.structured.timeline[0].content, /Build Chunk/)
  assert.match(viewModel.structured.successMetrics[0].content, /freelance designers/)
})

test("getMvpPlanViewModel preserves direct feature details and direct H2 content", () => {
  const viewModel = getMvpPlanViewModel(`# MVP Plan: ADR Helper

## I. MVP Overview

### 1.1 Product Vision Summary
ADR Helper captures decision research while it is happening.

### 1.2 MVP Hypothesis
Engineering leads will adopt a lightweight decision-memory tool.

### 1.3 Problem Being Validated
Teams lose rationale after architecture decisions.

### 1.4 Target User Segment
- Senior software architects

### 1.5 MVP Scope Boundaries
- In scope: Decision capture and ADR generation.

## II. Core MVP Features

### 2.1 Feature Summary Table
| ID | Feature | Priority |
|---|---|---|
| MVP-001 | Decision capture | P0 |

### 2.2 Feature Details
- MVP-001 Decision Capture: Capture alternatives, tradeoffs, and selected rationale.
- MVP-002 ADR Draft: Generate a structured ADR from saved research.

## III. User Flow
Architect starts a decision record, adds research notes, and exports an ADR.

## VI. Timeline & Milestones
Week 1: Capture form.
Week 2: ADR export.

## VII. Success Metrics & Validation
- 60% of beta teams export at least one ADR.
`)

  assert.equal(viewModel.canRenderModules, true)
  assert.equal(viewModel.structured.featureDetails.length, 1)
  assert.equal(viewModel.structured.featureDetails[0].heading, "Feature Details")
  assert.match(viewModel.structured.featureDetails[0].content, /MVP-001 Decision Capture/)
  assert.equal(viewModel.structured.userFlow.length, 1)
  assert.equal(viewModel.structured.userFlow[0].heading, "User Flow")
  assert.match(viewModel.structured.timeline[0].content, /Week 1/)
})

test("getMvpPlanViewModel falls back for incomplete legacy content", () => {
  const viewModel = getMvpPlanViewModel("# MVP Plan\n\nLoose legacy notes only.")

  assert.equal(viewModel.canRenderModules, false)
  assert.match(viewModel.warning ?? "", /recognizable sections/)
})

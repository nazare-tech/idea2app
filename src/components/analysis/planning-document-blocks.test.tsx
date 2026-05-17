import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"

import {
  MvpPlanDocumentBlocks,
  PrdDocumentBlocks,
} from "./planning-document-blocks"

const prdFixture = `# PRD: Maker Compass

## I. Introduction

### 1.2 Problem Definition / User Needs
- Early-stage builders need build-ready scope.

### 1.3 Purpose and Value Proposition
Maker Compass turns ideas into execution plans.

## II. Objectives

### 2.2 Goals / Measurable Outcomes (SMART)
| Goal | Metric |
|---|---|
| Activation | Completed plans |

### 2.3 Product Positioning
For solo founders, Maker Compass is an AI planning workspace.

## III. Stakeholders

### 3.2 User Profiles / Personas
#### Founder Fiona
- Goal: validate quickly.

## IV. Features and Functionality

### 4.1 Requirements
- FR-001: Capture idea intake.

### 4.2 User Stories / Use Cases
As a founder, I want a structured PRD.

### 4.3 Prioritization
| Priority | Feature |
|---|---|
| P0 | Idea intake |

### 4.4 UI/UX Design Specifications
- Keep document navigation scannable.

### 4.5 Technical Requirements
- Render saved documents from markdown.
`

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

test("PrdDocumentBlocks renders organized module anchors", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks content={prdFixture} projectId="project-1" />,
  )

  assert.match(html, /Product Requirements/)
  assert.match(html, /id="prd-user-needs"/)
  assert.match(html, /User Needs \/ Problem/)
  assert.match(html, /Founder Fiona/)
  assert.match(html, /id="prd-prioritization"/)
  assert.match(html, /Technical Requirements/)
  assert.doesNotMatch(html, /border rounded-none/)
  assert.doesNotMatch(html, /border-\[#D8CEC5\] bg-\[#F5F0EB\]/)
})

test("PrdDocumentBlocks renders unlabeled persona fields as one target-user profile", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      content={`# PRD: ADR Helper

## I. Introduction

### 1.2 Problem Definition / User Needs
- Architects need a searchable decision record.

### 1.3 Purpose and Value Proposition
Capture research context while decisions are fresh.

## II. Objectives

### 2.2 Goals / Measurable Outcomes
- Reduce ADR writing time.

### 2.3 Product Positioning
For engineering teams, ADR Helper is a decision-memory workspace.

## III. Stakeholders

### 3.2 User Profiles / Personas
- Demographics: 34 years old, Senior Software Architect at a SaaS company.
- Background: Responsible for documenting major technical decisions.
- Goals and motivations: Produce high-quality ADRs without spending hours writing.
- Pain points and frustrations: Writes ADRs from memory after the research happened.

## IV. Features and Functionality

### 4.1 Requirements
- FR-001: Capture decision context.

### 4.2 User Stories / Use Cases
As an architect, I want to preserve rationale.

### 4.3 Prioritization
- P0: Research capture.
`}
      projectId="project-1"
    />,
  )

  assert.match(html, /Target User Profile/)
  assert.match(html, /Demographics/)
  assert.doesNotMatch(html, /Persona 02/)
})

test("PrdDocumentBlocks stacks objectives, positioning, and personas full width", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      content={`# PRD: Full Width Personas

## I. Introduction

### 1.2 Problem Definition / User Needs
Teams need cleaner planning documents.

### 1.3 Purpose and Value Proposition
Convert rough ideas into build-ready plans.

## II. Objectives

### 2.2 Goals / Measurable Outcomes
- Increase plan completion.

### 2.3 Product Positioning
For founders, this is a planning workspace.

## III. Stakeholders

### 3.2 User Profiles / Personas
#### Persona Alpha
- Goal: validate quickly.

#### Persona Beta
- Goal: compare options.

#### Persona Gamma
- Goal: hand work to engineering.

## IV. Features and Functionality

### 4.1 Requirements
- FR-001: Render PRD sections.

### 4.2 User Stories / Use Cases
As a founder, I want readable personas.

### 4.3 Prioritization
- P0: Planning clarity.
`}
      projectId="project-1"
    />,
  )

  assert.match(html, /Measurable Objectives/)
  assert.match(html, /Positioning/)
  assert.match(html, /Persona 03/)
  assert.match(html, /mt-4 space-y-4/)
  assert.doesNotMatch(html, /mt-4 grid gap-4 xl:grid-cols-2/)
  assert.doesNotMatch(html, /xl:col-span-2/)
})

test("MvpPlanDocumentBlocks renders organized module anchors", () => {
  const html = renderToStaticMarkup(
    <MvpPlanDocumentBlocks content={mvpFixture} projectId="project-1" />,
  )

  assert.match(html, /Minimum Viable Product/)
  assert.match(html, /id="mvp-wedge"/)
  assert.match(html, /MVP Hypothesis/)
  assert.match(html, /id="mvp-core-features"/)
  assert.match(html, /MVP-001: Block PRD rendering/)
  assert.match(html, /id="mvp-success-metrics"/)
  assert.match(html, /Product Vision Summary/)
  assert.doesNotMatch(html, /border rounded-none/)
  assert.doesNotMatch(html, /border-\[#D8CEC5\] bg-\[#F5F0EB\]/)
})

test("MvpPlanDocumentBlocks makes the final odd feature card full width", () => {
  const html = renderToStaticMarkup(
    <MvpPlanDocumentBlocks content={mvpFixture} projectId="project-1" />,
  )

  assert.match(html, /xl:col-span-2/)
})

test("PrdDocumentBlocks cleans messy PRD markdown into organized blocks", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      projectId="project-1"
      content={`# PRD: AI Decision Log

## I. Introduction

### 1.1 Background Information / Context
- Developer knowledge loss: Teams lose context when decisions are not captured.
- Key trends driving demand:
  - Remote teams need richer written context
  - AI-assisted developer tooling is normalized

### 1.2 Problem Definition / User Needs
- Core pain point: Developers repeat research because decision rationale is lost.
- Unmet needs identified from gap analysis:
  - Automated capture without manual clipping
  - Shareable decision artifacts

### 1.3 Purpose and Value Proposition
---
- What the product does: AI Decision Log captures developer research and turns it into decision records.
- Unique value delivered:
  - Converts passive browsing into institutional knowledge
  - Captures rejected alternatives

## II. Objectives

### 2.1 Vision
- Long-term vision: Become the institutional memory layer for engineering teams.

### 2.2 Goals / Measurable Outcomes (SMART)
| # | Goal | Metric | Target | Timeframe |
|---|---|---|---|---|
| 1 | Validate capture quality | User rating | 4.0/5 | 30 days |

### 2.3 Product Positioning
---
- Positioning statement: > For engineering teams who lose technical context, AI Decision Log is a browser-native decision capture tool.
- Competitive advantages derived from gap analysis:
  - Only tool focused on rejected-alternative rationale

## III. Stakeholders

### 3.2 User Profiles / Personas
#### Lead Architect
- Goal: Preserve technical decisions.
- Pain point: Rewrites ADRs from memory.

## IV. Features and Functionality

### 4.1 Requirements
Functional Requirements

Non-Functional Requirements

Integration Requirements

- Automated Research Session Detection: Detect research sessions without manual activation.
- Privacy and Security: Browsing data must be processed with explicit user consent.
- Chrome Extension Manifest V3 compatibility (primary platform)

### 4.2 User Stories / Use Cases
---
> US-01: "As a Senior Developer, I want the extension to summarize my research session so that I have a structured record."
Acceptance Criteria: - A session summary is generated after related tabs close - The user can accept, edit, or discard the summary
---
> US-02: "As a Lead Architect, I want to share a decision link with my team so that everyone understands why we chose PostgreSQL."
Acceptance Criteria: - Every saved decision log has a share link - The shared URL renders a read-only decision page

### 4.3 Prioritization
| Priority | Feature | Rationale |
|---|---|---|
| P0 | Research session detection | Core capture workflow |
`}
    />,
  )

  assert.doesNotMatch(html, /&gt;\s*For engineering/)
  assert.doesNotMatch(html, /---/)
  assert.doesNotMatch(html, /No structured content available/)
  assert.match(html, /Key trends driving demand/)
  assert.match(html, /Competitive advantages derived from gap analysis[\s\S]*Only tool focused/)
  assert.doesNotMatch(html, /border px-4 py-3/)
  assert.doesNotMatch(html, /xl:grid-cols-3/)
  assert.match(html, /Acceptance Criteria/)
  assert.match(html, /Functional/)
  assert.match(html, /Non-Functional/)
  assert.match(html, /Integration/)
})

test("PrdDocumentBlocks renders duplicate user story ids without dropping stories", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      projectId="project-1"
      content={`# PRD

## IV. Features and Functionality

### 4.2 User Stories / Use Cases
#### US-002: Book a sitter
Story: As a pet owner, I want to book a verified sitter so that my dog is safe.
Acceptance Criteria:
- The sitter profile shows verification status.

#### US-002: Track care updates
Story: As a pet owner, I want live care updates so that I know my dog is okay.
Acceptance Criteria:
- The booking timeline shows the latest update.
`}
    />,
  )

  assert.match(html, /Book a sitter/)
  assert.match(html, /Track care updates/)
  assert.equal((html.match(/US-002/g) ?? []).length, 2)
})

test("PrdDocumentBlocks stacks table-based PRD requirements vertically", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      projectId="project-1"
      content={`# PRD: Table Requirements

## I. Introduction

### 1.2 Problem Definition / User Needs
- Builders need a cleaner planning workspace.

### 1.3 Purpose and Value Proposition
Maker Compass organizes generated planning docs.

## II. Objectives

### 2.2 Goals / Measurable Outcomes
- Improve document readability.

### 2.3 Product Positioning
For founders, Maker Compass is a planning workspace.

## III. Stakeholders

### 3.2 User Profiles / Personas
- Founder building an app.

## IV. Features and Functionality

### 4.1 Requirements
| ID | Type | Requirement | Acceptance / Notes | Priority |
|---|---|---|---|---|
| FR-001 | Functional | Capture the idea intake. | Intake saves project context. | P0 |
| NFR-001 | Non-Functional | Keep rendering fast. | PRD sections remain responsive. | P1 |
| IR-001 | Integration | Export markdown. | Saved documents can be reused. | P2 |

### 4.2 User Stories / Use Cases
As a founder, I want readable requirements.
`}
    />,
  )

  assert.doesNotMatch(html, /<table/)
  assert.doesNotMatch(html, /xl:grid-cols-3/)
  assert.match(html, /FR-001/)
  assert.match(html, /Capture the idea intake/)
  assert.match(html, /NFR-001/)
  assert.match(html, /IR-001/)
})

test("planning document blocks fall back to markdown for loose legacy content", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks content="# PRD\n\nLoose legacy notes only." projectId="project-1" />,
  )

  assert.match(html, /Block view unavailable/)
  assert.match(html, /Loose legacy notes only/)
})

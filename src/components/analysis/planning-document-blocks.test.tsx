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

  assert.match(html, /Product Plan/)
  assert.match(html, /-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10/)
  assert.doesNotMatch(html, /border-b border-\[#E0E0E0\]/)
  assert.match(html, /id="prd-user-needs"/)
  assert.match(html, /Problem to Solve/)
  assert.match(html, /Founder Fiona/)
  assert.match(html, /id="prd-prioritization"/)
  assert.match(html, /Technical Requirements/)
  assert.doesNotMatch(html, /border border-\[#E0E0E0\] bg-white px-6 py-5/)
  assert.doesNotMatch(html, /space-y-2 px-6 py-5/)
  assert.doesNotMatch(html, /px-6 pb-6/)
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
  assert.match(html, /34 years old, Senior Software Architect/)
  assert.doesNotMatch(html, /Demographics:/)
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
  assert.match(html, /Persona 1/)
  assert.doesNotMatch(html, /mt-4 grid gap-4 xl:grid-cols-2/)
  assert.doesNotMatch(html, /xl:col-span-2/)
})

test("PrdDocumentBlocks renders persona-card design from structured persona fields", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      projectId="project-1"
      content={`# PRD: Weekend Builder

## 1. Introduction/overview
Weekend Builder helps product-minded operators validate side-project ideas.

## 2. Goals
### Business goals
- Activate 100 builders.
### User goals
- Pick one idea worth building.

## 3. User personas
### 3.2 Persona details
**Maya Okonkwo**
- **Archetype**: The Weekend Builder
- **Meta**: Age 31; Product designer; Toronto; Technical-adjacent
- **Description**: Maya ships side projects on weekends while holding a full-time design role.
- **Needs**:
  - Pressure-test an idea before committing engineering time
  - Structured outputs she can hand to a coding agent
- **Pain points**:
  - Loses momentum in the where-do-I-start spiral
  - Burns weekends on prep work instead of building
- **Motivation**: Wants to go from a one-line idea to something shippable in a single weekend.

## 4. User stories and acceptance criteria
### US-001: Generate plan
**User story**
As a builder, I want a product plan.
**Acceptance criteria**
- A plan is generated.

## 5. Functional requirements
### 5.1 Functional
- **FR-001**: Plan generation
  - Users can generate a plan.
`}
    />,
  )

  assert.match(html, /Persona 1/)
  assert.match(html, /The Weekend Builder/)
  assert.match(html, /Age 31/)
  assert.match(html, /Description/)
  assert.match(html, /Needs/)
  assert.match(html, /Pain points/)
  assert.match(html, /Motivation/)
  assert.match(html, /Pressure-test an idea/)
  assert.match(html, /where-do-I-start spiral/)
  assert.match(html, /overflow-hidden border border-\[#E8DDD5\] bg-white/)
  assert.match(html, /shadow-sm/)
  assert.match(html, /text-\[26px\] font-extrabold/)
  assert.doesNotMatch(html, /rounded-xl border border-\[#E8DDD5\] bg-white/)
  assert.doesNotMatch(html, /shadow-\[0_4px_20px_rgba\(15,23,42,0\.06\)\]/)
  assert.doesNotMatch(html, /mt-8 rounded-lg border border-\[#EAE0D8\]/)
  assert.doesNotMatch(html, /grid gap-4 lg:grid-cols-3/)
})

test("PrdDocumentBlocks preserves current PRD functional requirement subsections as separate blocks", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      projectId="project-1"
      content={`# PRD: Wear It Now AI Mirror

## 1. Introduction/overview
Wear It Now AI Mirror helps shoppers preview outfits before buying.

## 2. Goals
- Increase confident outfit decisions.

## 3. User personas
### 3.2 Persona details
**Priya Mehta**
- **Description**: Priya wants outfit confidence before buying.

## 4. User stories and acceptance criteria
### US-001: Preview outfit
**User story**
As a shopper, I want to preview an outfit.
**Acceptance criteria**
- The preview appears.

## 5. Functional requirements
### 5.1 Core requirements
- **CR-001**: Project input
  - Users can create a mirror try-on project.
- **CR-002**: Avatar upload
  - Users can upload one avatar photo.

### 5.2 States and errors
- **SE-001**: Empty state
  - Show guidance when no outfit image has been selected.
- **SE-002**: Generation failure
  - Show retry copy when AI generation fails.

### 5.3 Constraints
- **FR-005**: Supported file types
  - Accept JPEG, PNG, and WEBP images only.
- **FR-006**: Upload size
  - Limit avatar uploads to 10 MB.

## 6. Technical considerations
- Keep image generation on the server.
`}
    />,
  )

  assert.match(html, /Core requirements/)
  assert.match(html, /States and errors/)
  assert.match(html, /Constraints/)
  assert.match(html, /Project input/)
  assert.match(html, /Generation failure/)
  assert.match(html, /Supported file types/)
  assert.match(html, /2 reqs/)
  assert.match(html, />01<\/span>/)
  assert.match(html, />02<\/span>/)
  assert.doesNotMatch(html, /CR-001/)
  assert.doesNotMatch(html, /CR-002/)
  assert.doesNotMatch(html, /SE-001/)
  assert.doesNotMatch(html, /SE-002/)
  assert.doesNotMatch(html, /FR-005/)
  assert.doesNotMatch(html, /<h3[^>]*>Functional<\/h3>/)
  assert.doesNotMatch(html, /<h3[^>]*>Integration<\/h3>/)

  const coreIndex = html.indexOf("Core requirements")
  const statesIndex = html.indexOf("States and errors")
  const constraintsIndex = html.indexOf("Constraints")
  const getSectionOpeningTag = (index: number) => {
    const sectionStart = html.lastIndexOf("<section", index)
    return html.slice(sectionStart, html.indexOf(">", sectionStart))
  }

  assert.ok(coreIndex > -1)
  assert.ok(statesIndex > coreIndex)
  assert.ok(constraintsIndex > statesIndex)
  assert.match(getSectionOpeningTag(coreIndex), /lg:col-span-2/)
  assert.doesNotMatch(getSectionOpeningTag(statesIndex), /lg:col-span-2/)
  assert.doesNotMatch(getSectionOpeningTag(constraintsIndex), /lg:col-span-2/)
})

test("PrdDocumentBlocks preserves deeper functional requirement subsections under a wrapper heading", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      projectId="project-1"
      content={`# PRD: Wrapped Requirements

## 1. Introduction/overview
Wrapped Requirements helps validate nested planning output.

## 2. Goals
- Keep renderer output faithful.

## 3. User personas
### 3.2 Persona details
**Builder**
- **Description**: Builder needs clear scope.

## 4. User stories and acceptance criteria
### US-001: Read requirements
**User story**
As a builder, I want readable requirements.
**Acceptance criteria**
- The requirement groups are visible.

## 5. Functional requirements
### Functional requirements
#### Core requirements
- **FR-001**: Create project
  - Users can create a project.

#### States and errors
- **FR-002**: Loading state
  - Users see progress during generation.

#### Constraints
- **FR-003**: File size
  - Uploads stay below the configured limit.

## 6. Technical considerations
- Keep rendering deterministic.
`}
    />,
  )

  assert.match(html, /Core requirements/)
  assert.match(html, /States and errors/)
  assert.match(html, /Constraints/)
  assert.doesNotMatch(html, /<h3[^>]*>Functional requirements<\/h3>/)
})

test("PrdDocumentBlocks keeps standalone bold persona labels inside the active persona", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      projectId="project-1"
      content={`# PRD: Wear It Now AI Mirror

## 1. Introduction/overview
Wear It Now AI Mirror helps shoppers preview outfits before buying or styling them.

## 2. Goals
### 2.1 Business goals
- Increase confident outfit decisions.
### 2.2 User goals
- Decide what to wear faster.

## 3. User personas
### 3.2 Persona details

**Priya Mehta**
*The Outfit Optimizer*

- **Age**: 26
- **Occupation**: Product designer
- **Location**: Toronto
- **Technical level**: Technical-adjacent

**Description**
Priya is a fashion-conscious shopper who wants outfit confidence before buying.

**Needs**
- Better styling guidance
- Fast outfit previews
- Confidence that items work together
- Simple sharing with friends

**Pain points**
- Unclear fit and style from flat product photos
- Wastes time comparing outfit combinations
- Returns items that look different in context
- Hard to know what works for an event

**Motivation**
Priya wants to feel confident before spending money on clothes.

## 4. User stories and acceptance criteria
### US-001: Preview outfit
**User story**
As a shopper, I want to preview an outfit.
**Acceptance criteria**
- The preview appears.

## 5. Functional requirements
### 5.1 Functional
- **FR-001**: Preview outfit
  - Users can preview an outfit.
`}
    />,
  )

  assert.match(html, /Priya Mehta/)
  assert.match(html, /The Outfit Optimizer/)
  assert.match(html, /Age 26/)
  assert.match(html, /Product designer/)
  assert.match(html, /Toronto/)
  assert.match(html, /Technical-adjacent/)
  assert.doesNotMatch(html, /Occupation: Product designer/)
  assert.doesNotMatch(html, /Location: Toronto/)
  assert.doesNotMatch(html, /Technical level: Technical-adjacent/)
  assert.match(html, /fashion-conscious shopper/)
  assert.match(html, /Better styling guidance/)
  assert.match(html, /Unclear fit and style/)
  assert.match(html, /feel confident before spending money/)
  assert.doesNotMatch(html, /<h3[^>]*>Description<\/h3>/)
  assert.doesNotMatch(html, />26<\/p><\/section>[\s\S]*>Needs</)
})

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

test("PrdDocumentBlocks normalizes duplicate user story ids without dropping stories", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      projectId="project-1"
      content={`# PRD

## I. Introduction

### 1.2 Problem Definition / User Needs
- Pet owners need safer booking.

### 1.3 Purpose and Value Proposition
Verified care updates improve trust.

## III. Stakeholders

### 3.2 User Profiles / Personas
- Pet owner booking care.

## IV. Features and Functionality

### 4.1 Requirements
- FR-001: Book verified sitters.

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
  assert.match(html, /US-001/)
  assert.equal((html.match(/US-002/g) ?? []).length, 1)
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

test("PrdDocumentBlocks renders current numbered PRD prompt content as blocks", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      projectId="project-1"
      content={`# PRD: Proposal Pilot

## 1. Introduction/overview
Proposal Pilot helps freelance designers turn discovery notes into client-ready proposals.

## 2. Goals
### Business goals
- Reduce proposal writing time by 50%.
- Reach 25 paying teams within 90 days.

### User goals
- Create a proposal from messy client notes.
- Review generated sections before sharing.

## 3. User personas
### 3.1 Key user types
- Freelance designer who sends proposals monthly.
- Solo agency owner who reuses proposal sections.

### 3.2 Persona details
**Dana Designer**
- **Archetype**: The Fast Proposal Maker
- **Description**: Freelance designer managing three active client leads.
- **Needs**: Faster proposal creation and reuse.
- **Pain points**: Rewrites scope and timeline language from scratch.
- **Motivation**: Win more work without extra admin.

**Omar Owner**
- **Description**: Solo agency owner sending proposals to high-value prospects.
- **Needs**: Consistent language across client proposals.

**Priya Producer**
- **Description**: Operations lead reviewing proposal details before send-off.
- **Needs**: Clear status and editable proposal sections.

## 4. User stories and acceptance criteria
### US-009: Generate proposal
**User story**
As a freelance designer, I want to generate a proposal from client notes.
**Acceptance criteria**
- Generated proposal includes scope, timeline, and pricing sections.

### US-009: Review generated draft
**User story**
As a solo agency owner,
I want to review and edit generated sections,
So that I can send client-ready proposals.
**Acceptance criteria**
- User can edit generated proposal sections before saving.

## 5. Functional requirements
### 5.1 Functional
- **FR-001**: Proposal intake
  - Users can create a proposal from structured intake fields.
- **FR-002**: Draft editing
  - Users can edit generated proposal sections before saving.

### 5.2 Non-Functional
- **NFR-001**: Generation feedback
  - The page shows a loading state while AI proposal generation is running.

### 5.3 Integration
- **IR-001**: AI generation provider
  - Server routes connect to the configured AI provider for proposal generation.

## 6. Technical considerations
- Keep AI calls on the server.
- Store proposal drafts in the existing project workspace.

## 7. Non-goals / out of scope
- Multi-seat team approvals are deferred.

## 8. Success metrics
### 8.1 User metrics
- 60% of users generate a first proposal within one day.
- Draft review completes in under 10 minutes.

### 8.2 Business metrics
- 25 paying teams within 90 days.

### 8.3 Technical/performance metrics
- Generation errors stay below 2%.
- Proposal draft page loads under 2 seconds.

## 9. Timeline and milestones
### Project estimate
- **Size**: Medium
- **Estimated total duration**: 8 weeks

### Team composition
- **Product manager**: Scope and acceptance criteria
- **Full-stack engineer**: Product UI and backend routes
- **Designer**: Proposal review workflow

### Phase 1: Foundation
- **Goal**: Create the intake and draft shell.
- **Estimated duration**: 3 weeks
- **Key deliverables**:
  - Intake form
  - Draft storage

### Phase 2: Generation and review
- **Goal**: Generate editable proposals.
- **Estimated duration**: 5 weeks
- **Key deliverables**:
  - AI generation route
  - Review editor

## 10. Risks and mitigation
- **Risk**: Proposal quality may be too generic.
  - **Mitigation**: Add section-level review prompts.

## 11. Dependencies and assumptions
- Existing authentication and project workspace are available.

## 12. Open questions
- Which proposal export format matters first?

## 99. User experience
- This legacy section should not render for current PRD documents.
`}
    />,
  )

  assert.doesNotMatch(html, /Block view unavailable/)
  assert.match(html, />Product Plan<\/h1>/)
  assert.match(html, /text-\[36px\] font-bold tracking-\[-0\.05em\] text-\[#0A0A0A\] md:text-\[44px\]/)
  assert.match(html, /text-\[22px\] font-bold tracking-\[-0\.03em\] text-\[#0A0A0A\]/)
  assert.doesNotMatch(html, />Proposal Pilot<\/h1>/)
  assert.match(html, /Proposal Pilot helps freelance designers turn discovery notes into client-ready proposals/)
  assert.match(html, /Project Size/)
  assert.match(html, /Medium/)
  assert.match(html, /Est\. Duration/)
  assert.match(html, /8 weeks/)
  assert.match(html, /Team Members/)
  assert.match(html, /User Stories/)
  assert.match(html, /Requirements/)
  assert.match(html, /Business Goals/)
  assert.match(html, /User Goals/)
  assert.match(html, /Dana Designer/)
  assert.match(html, /Omar Owner/)
  assert.match(html, /Priya Producer/)
  assert.doesNotMatch(html, /Freelance designer who sends proposals monthly/)
  assert.match(html, /The Fast Proposal Maker/)
  assert.match(html, /Persona 1/)
  assert.match(html, /Pain points/)
  assert.match(html, /Motivation/)
  assert.doesNotMatch(html, /User persona/)
  assert.match(html, /Introduction &amp; Overview/)
  assert.match(html, /Functional Requirements/)
  assert.match(html, /User Stories &amp; Acceptance Criteria/)
  assert.match(html, /Generated proposal includes scope, timeline, and pricing sections/)
  assert.match(html, /US-001/)
  assert.match(html, /US-002/)
  assert.match(html, /grid gap-4 lg:grid-cols-2/)
  assert.match(html, /Technical Considerations/)
  assert.match(html, /aria-label="Technical Item 1 details"/)
  assert.match(html, /aria-label="Technical Item 2 details"/)
  assert.match(html, /Non-goals &amp; Out of Scope/)
  assert.match(html, /Success Metrics/)
  assert.match(html, /Technical \/ Performance Metrics/)
  assert.match(html, /Timeline &amp; Milestones/)
  assert.match(html, /Team Composition/)
  assert.match(html, /Phase 1/)
  assert.match(html, /Weeks 1-3/)
  assert.match(html, /Weeks 4-8/)
  assert.match(html, /Foundation/)
  assert.match(html, /aria-label="Foundation key deliverables"/)
  assert.match(html, /Intake form/)
  assert.match(html, /Risks, Dependencies &amp; Open Questions/)
  assert.match(html, /Which proposal export format matters first/)
  assert.doesNotMatch(html, /No structured content available/)
  assert.doesNotMatch(html, /bg-\[#4A4040\]/)
  assert.doesNotMatch(html, /grid gap-4 xl:grid-cols-3/)
  assert.doesNotMatch(html, /grid gap-3 sm:grid-cols-2 xl:grid-cols-3/)
  assert.doesNotMatch(html, /This legacy section should not render/)
  assert.doesNotMatch(html, /Problem to Solve/)
  assert.doesNotMatch(html, /What to Build/)

  assert.ok(html.indexOf("User Personas") < html.indexOf("User Stories &amp; Acceptance Criteria"))
  assert.ok(html.indexOf("User Stories &amp; Acceptance Criteria") < html.indexOf("Functional Requirements"))
  assert.ok(html.indexOf("Technical Considerations") < html.indexOf("Non-goals &amp; Out of Scope"))

  const timelineHtml = html.slice(
    html.indexOf("Timeline &amp; Milestones"),
    html.indexOf("Risks, Dependencies &amp; Open Questions"),
  )
  assert.doesNotMatch(timelineHtml, /lucide-check h-3\.5 w-3\.5/)
  assert.match(timelineHtml, /lucide-check mt-1 h-3 w-3/)
  assert.doesNotMatch(timelineHtml, />Goal</)
  assert.doesNotMatch(timelineHtml, /Phase 1: Foundation/)
})

test("MvpPlanDocumentBlocks renders current numbered MVP prompt content as blocks", () => {
  const html = renderToStaticMarkup(
    <MvpPlanDocumentBlocks
      projectId="project-1"
      content={`# MVP Plan: Proposal Pilot

## 1. MVP Summary
Proposal Pilot helps freelance designers turn client notes into proposals.

## 3. Target User and Problem
### Primary User
Freelance designers who manage proposals manually.
### Problem
They rewrite scope and pricing language for every lead.

## 4. MVP Goal, Definition of Done, and Riskiest Assumptions
**Goal:** Validate whether designers will generate and edit a proposal.

## 5. Core User Flow
1. User opens the proposal workspace.
2. User enters client notes.
3. System generates a proposal draft.

## 6. MVP Scope
| Category | Include in MVP | Exclude for Now |
|---|---|---|
| Core input | Structured proposal intake | CRM import |

## 7. Must-Have Features
| Feature | Why It Matters | Acceptance Criteria |
|---|---|---|
| Proposal intake | Captures useful context | User can submit required fields |

## 9. AI-Friendly Build Sequence
| Step | Build Chunk | Goal | Test Before Moving On |
|---|---|---|---|
| 1 | Proposal intake form | Capture context | Submit valid and invalid input |

## 11. Validation Plan
### First Test Audience
Five freelance designers who send proposals monthly.
`}
    />,
  )

  assert.doesNotMatch(html, /Block view unavailable/)
  assert.match(html, /First Version Plan/)
  assert.match(html, /MVP Summary/)
  assert.match(html, /Primary User/)
  assert.match(html, /Step 01/)
  assert.match(html, /Feature 01/)
  assert.match(html, /Must-Have Features/)
  assert.match(html, /MVP Scope/)
  assert.match(html, /Validation Plan/)
  assert.doesNotMatch(html, /bg-\[#4A4040\]/)
  assert.doesNotMatch(html, /grid gap-4 xl:grid-cols-2/)
  assert.doesNotMatch(html, /What We Need to Prove/)
  assert.doesNotMatch(html, /Core Features/)
})

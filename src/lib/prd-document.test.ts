import test from "node:test"
import assert from "node:assert/strict"

import { getPrdDocumentViewModel } from "./prd-document"

const prdFixture = `# PRD: Maker Compass

**Created**: 2026-05-12
**Status**: Draft

## I. Introduction

### 1.1 Background Information / Context
- Founders need faster validation.

### 1.2 Problem Definition / User Needs
- Early-stage builders struggle to convert raw ideas into build-ready product scope.
- Teams need market context, requirements, and launch planning in one flow.

### 1.3 Purpose and Value Proposition
Maker Compass turns an idea into planning artifacts that are ready for execution.

## II. Objectives

### 2.1 Vision
Become the operating system for zero-to-one product planning.

### 2.2 Goals / Measurable Outcomes (SMART)
| Goal | Metric | Target |
|---|---|---|
| Activation | Completed plans | 70% |

### 2.3 Product Positioning
For solo founders, Maker Compass is an AI planning workspace.

## III. Stakeholders

### 3.1 Stakeholder List
- Founder
- Designer

### 3.2 User Profiles / Personas
#### Founder Fiona
- Goal: validate a product direction quickly.
- Pain point: unclear scope.

#### Operator Omar
- Goal: compare launch options.
- Pain point: scattered planning.

## IV. Features and Functionality

### 4.1 Requirements
- FR-001: Capture idea intake.
- FR-002: Generate PRD blocks.

### 4.2 User Stories / Use Cases
> "As a founder, I want a structured PRD so that I can start building."

Acceptance criteria:
- [ ] PRD includes requirements.
- [ ] PRD includes personas.

### 4.3 Prioritization
| Priority | Feature | Rationale |
|---|---|---|
| P0 | Idea intake | Starts the workflow |

### 4.4 UI/UX Design Specifications
- Keep document navigation scannable.

### 4.5 Technical Requirements
- Render saved documents from markdown.
`

test("getPrdDocumentViewModel parses block-ready PRD content", () => {
  const viewModel = getPrdDocumentViewModel(prdFixture)

  assert.equal(viewModel.canRenderModules, true)
  assert.equal(viewModel.structured.title, "PRD: Maker Compass")
  assert.match(viewModel.structured.userNeeds.items.join(" "), /Early-stage builders/)
  assert.equal(viewModel.structured.objectives.table?.headers[0], "Goal")
  assert.equal(viewModel.structured.personas.length, 2)
  assert.equal(viewModel.structured.personas[0].heading, "Founder Fiona")
  assert.equal(viewModel.structured.prioritization.table?.rows[0][0], "P0")
})

test("getPrdDocumentViewModel parses current Product Plan headings", () => {
  const viewModel = getPrdDocumentViewModel(`# Product Plan: Maker Compass

## I. Introduction

### 1.2 Problem to Solve
- Founders need clearer scope.

### 1.3 Value Proposition
Maker Compass turns ideas into build-ready plans.

## III. Stakeholders

### 3.2 Personas
#### Solo Founder
- Goal: ship faster.

## IV. Features and Functionality

### 4.1 What to Build
- FR-001: Capture idea intake.

### 4.2 Key User Flows
As a founder, I want a plan.

### 4.3 Build Order
- P0: Idea intake.
`)

  assert.equal(viewModel.canRenderModules, true)
  assert.match(viewModel.structured.userNeeds.items.join(" "), /clearer scope/)
  assert.match(viewModel.structured.requirements.items.join(" "), /FR-001/)
  assert.match(viewModel.structured.userStories.paragraphs.join(" "), /founder/)
  assert.match(viewModel.structured.prioritization.items.join(" "), /Idea intake/)
})

test("getPrdDocumentViewModel keeps unlabeled persona fields in one profile block", () => {
  const viewModel = getPrdDocumentViewModel(`# PRD: ADR Helper

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
- Demographics: 34 years old, Senior Software Architect at a 120-person SaaS company.
- Background: Responsible for making and documenting major technical decisions.
- Goals and motivations:
  - Produce high-quality ADRs without spending hours writing documentation after the fact.
  - Build a searchable record of why the team chose PostgreSQL over MongoDB.
- Pain points and frustrations:
  - Spends 2-3 hours per major decision writing ADRs from memory.

## IV. Features and Functionality

### 4.1 Requirements
- FR-001: Capture decision context.

### 4.2 User Stories / Use Cases
As an architect, I want to preserve rationale.

### 4.3 Prioritization
- P0: Research capture.
`)

  assert.equal(viewModel.canRenderModules, true)
  assert.equal(viewModel.structured.personas.length, 1)
  assert.equal(viewModel.structured.personas[0].heading, "Target User Profile")
  assert.match(viewModel.structured.personas[0].content, /Demographics/)
  assert.match(viewModel.structured.personas[0].content, /Pain points/)
})

test("getPrdDocumentViewModel falls back for incomplete legacy content", () => {
  const viewModel = getPrdDocumentViewModel("# PRD\n\nLoose legacy notes only.")

  assert.equal(viewModel.canRenderModules, false)
  assert.match(viewModel.warning ?? "", /recognizable sections/)
})

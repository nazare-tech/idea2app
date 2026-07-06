import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { PrdDocumentBlocks } from "./product-plan-blocks"

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
  assert.doesNotMatch(html, /shadow-sm/)
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
  assert.doesNotMatch(html, /mt-2 max-w-3xl ui-type-body text-\[#666666\]/)
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
  assert.match(html, /id="prd-introduction-overview"/)
  assert.match(html, /id="prd-goals"/)
  assert.match(html, /id="prd-user-personas"/)
  assert.match(html, /id="prd-user-stories-acceptance-criteria"/)
  assert.match(html, /id="prd-functional-requirements"/)
  assert.match(html, /id="prd-technical-considerations"/)
  assert.match(html, /id="prd-non-goals-out-of-scope"/)
  assert.match(html, /id="prd-success-metrics"/)
  assert.match(html, /id="prd-timeline-milestones"/)
  assert.match(html, /id="prd-follow-through"/)
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

test("PrdDocumentBlocks renders current PRD follow-through sections with designed blocks", () => {
  const html = renderToStaticMarkup(
    <PrdDocumentBlocks
      projectId="project-1"
      content={`# PRD: Wear It Now AI Mirror

## 1. Introduction/overview
Wear It Now AI Mirror helps shoppers preview outfits before buying.

## 2. Goals
- Validate whether shoppers trust generated try-on previews.

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
- **FR-001**: Preview outfit
  - Users can preview an outfit.

## 10. Risks and mitigation
- **Risk**: Retailer websites break the extension by updating their DOM structure or implementing anti-scraping measures.
  - **Impact**: The overlay fails to appear on affected sites.
  - **Mitigation**: Use a remotely fetched selector configuration file.
- **Risk**: AI image quality misses user expectations.
  - **Impact**: Users lose trust after poor previews.
  - **Mitigation**: Add quality gates before charging credits.

## 11. Dependencies and assumptions
### 11.1 Dependencies
- **Chrome Web Store approval**: The extension must pass Google's review process.
- **AI generation API**: A reliable image-to-image virtual try-on API must be selected.

### 11.2 Assumptions
- **Target user**: The primary target user is a mid-tier fashion influencer.
- **AI model**: A suitable image-to-image model exists and is accessible via API with acceptable latency. This is the single highest-risk technical assumption.
- **Credit pricing**: Suggested credit pricing is a starting hypothesis.

## 12. Open questions
- **AI model selection**: Which specific virtual try-on model will be used?
- **Refund policy**: Beyond automatic refunds, will there be a manual policy?
`}
    />,
  )

  assert.match(html, /Risks &amp; Mitigation/)
  assert.match(html, /R-01/)
  assert.match(html, /R-02/)
  assert.match(html, /Impact/)
  assert.match(html, /Mitigation/)
  assert.match(html, /Retailer websites break the extension/)
  assert.doesNotMatch(html, /Site Compatibility/)

  assert.match(html, /Dependencies/)
  assert.match(html, /D01/)
  assert.match(html, /D02/)
  assert.match(html, /Chrome Web Store approval/)
  assert.match(html, /divide-y divide-\[#E8DDD5\]/)

  assert.match(html, /Assumptions/)
  assert.match(html, /A01/)
  assert.match(html, /A02/)
  assert.match(html, /A03/)
  assert.match(html, /Highest Risk/)
  assert.match(html, /grid gap-px border border-\[#E8DDD5\] bg-\[#E8DDD5\] md:grid-cols-2/)
  assert.match(html, /bg-\[#E7DDD6\]/)
  assert.doesNotMatch(html, /hidden bg-\[#E7DDD6\] md:block/)

  assert.match(html, /Open Questions/)
  assert.match(html, /Q01/)
  assert.match(html, /Q02/)
  assert.match(html, /grid gap-4 lg:grid-cols-2/)
  assert.doesNotMatch(html, />Open<\/span>/)
})

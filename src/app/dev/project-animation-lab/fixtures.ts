export type AnimationLabDocumentChunk = {
  id: string
  label: string
  summary: string
  markdown: string
}

export type AnimationLabFixture = {
  id: string
  projectName: string
  projectSummary: string
  marketResearch: {
    summary: string
    markdown: string
  }
  productPlan: {
    title: string
    chunks: AnimationLabDocumentChunk[]
  }
  firstVersionPlan: {
    title: string
    chunks: AnimationLabDocumentChunk[]
  }
}

export const animationLabFixtures: AnimationLabFixture[] = [
  {
    id: "proposal-pilot",
    projectName: "Proposal Pilot",
    projectSummary:
      "A workspace for freelance designers and solo agencies to turn messy discovery notes into client-ready proposals.",
    marketResearch: {
      summary:
        "The strongest opening is speed plus review control: buyers want a first draft fast, but still need clear ownership before sending.",
      markdown: `# Market Research: Proposal Pilot

## Executive Summary
Proposal Pilot competes with proposal builders, CRM templates, and general writing tools. The wedge is a focused workflow for service businesses that turns rough client notes into proposal sections the owner can review, edit, and send.

## Market Snapshot
- Freelance designers and solo agencies often rebuild proposal language for every lead.
- Existing proposal tools are polished but assume the user already knows the scope.
- General writing tools are flexible, but they do not preserve proposal structure or client-specific decisions.

## Entry Assessment
The first version should avoid full CRM scope and focus on the moment after discovery: notes in, proposal draft out, human review before sharing.

## Biggest Risk
The generated proposal must feel editable and trustworthy. If the first draft sounds generic, users will return to manual templates.`,
    },
    productPlan: {
      title: "# PRD: Proposal Pilot",
      chunks: [
        {
          id: "prd-context",
          label: "Context and goals",
          summary: "Define the product thesis and what success means.",
          markdown: `## 1. Introduction/overview
Proposal Pilot helps freelance designers turn discovery notes into client-ready proposals.

## 2. Goals
### Business goals
- Reduce proposal writing time by 50%.
- Reach 25 paying teams within 90 days.

### User goals
- Create a proposal from messy client notes.
- Review generated sections before sharing.`,
        },
        {
          id: "prd-users",
          label: "Users and stories",
          summary: "Frame the target users and the core behavior they need.",
          markdown: `## 3. User personas
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
### US-001: Generate proposal
**User story**
As a freelance designer, I want to generate a proposal from client notes.
**Acceptance criteria**
- Generated proposal includes scope, timeline, and pricing sections.

### US-002: Review generated draft
**User story**
As a solo agency owner, I want to review and edit generated sections before sharing.
**Acceptance criteria**
- User can edit generated proposal sections before saving.`,
        },
        {
          id: "prd-scope",
          label: "Scope and constraints",
          summary: "Set the first build boundary and technical shape.",
          markdown: `## 5. Functional requirements
### 5.1 Functional
- **FR-001**: Proposal intake
  - Users can create a proposal from structured intake fields.
- **FR-002**: Draft editing
  - Users can edit generated proposal sections before saving.

### 5.2 Non-Functional
- **NFR-001**: Generation feedback
  - The page shows a loading state while proposal generation is running.

### 5.3 Integration
- **IR-001**: Generation provider
  - Server routes connect to the configured generation provider for proposal drafting.

## 6. Technical considerations
- Keep generation calls on the server.
- Store proposal drafts in the existing project workspace.

## 7. Non-goals / out of scope
- Multi-seat team approvals are deferred.
- CRM imports are deferred.`,
        },
        {
          id: "prd-follow-through",
          label: "Metrics and follow-through",
          summary: "Make the build measurable and sequence the work.",
          markdown: `## 8. Success metrics
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

### Phase 1: Intake and draft shell
- **Goal**: Capture notes and show a generated proposal draft.
- **Estimated duration**: 3 weeks
- **Key deliverables**:
  - Proposal intake
  - Draft workspace

### Phase 2: Review and reuse
- **Goal**: Make proposal sections editable and reusable.
- **Estimated duration**: 5 weeks
- **Key deliverables**:
  - Section editor
  - Saved proposal library

## 10. Risks and mitigation
- **Risk**: Generated drafts sound generic.
  - **Impact**: Users lose trust and return to manual templates.
  - **Mitigation**: Capture client-specific constraints before generation and expose clear editing controls.

## 11. Dependencies and assumptions
### 11.1 Dependencies
- **Generation model**: A reliable text generation provider is available.
- **Billing provider**: Payments can be handled after draft quality is proven.

### 11.2 Assumptions
- **Target user**: Freelance designers and solo agency owners.
- **Platform**: Desktop web first.

## 12. Open questions
- What is the minimum proposal structure users will trust?
- Should pricing be generated or entered manually?`,
        },
      ],
    },
    firstVersionPlan: {
      title: "# MVP Plan: Proposal Pilot",
      chunks: [
        {
          id: "mvp-summary",
          label: "MVP summary",
          summary: "Name the first useful version and its assumptions.",
          markdown: `## 1. MVP Summary
Proposal Pilot helps freelance designers turn client notes into proposals.

## 2. Key Assumptions and Scope Decisions
- [HIGH CONFIDENCE] Freelance designers need faster proposal turnaround.
- [SCOPE DECISION] CRM features are excluded from the MVP.`,
        },
        {
          id: "mvp-flow",
          label: "User and flow",
          summary: "Define the core workflow the first version must prove.",
          markdown: `## 3. Target User and Problem
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
4. User edits sections before saving.`,
        },
        {
          id: "mvp-build",
          label: "Scope and build sequence",
          summary: "Translate the plan into buildable slices.",
          markdown: `## 5. MVP Scope
| Category | Include in MVP | Exclude for Now |
|---|---|---|
| Core input | Structured proposal intake | CRM import |
| Drafting | Proposal section generation | Automated client follow-up |

## 6. Must-Have Features
| Feature | Why It Matters | Acceptance Criteria |
|---|---|---|
| Proposal intake | Captures useful context | User can submit required fields |
| Draft review | Keeps user in control | User can edit generated sections |

## 7. Suggested Build Approach
| Layer | Recommendation | Why |
|---|---|---|
| Frontend | Next.js workspace UI | Fast authenticated product surface |
| Backend | Server route for generation | Keeps provider keys private |

## 8. AI-Friendly Build Sequence
| Step | Build Chunk | Goal | Test Before Moving On |
|---|---|---|---|
| 1 | Proposal intake form | Capture context | Submit valid and invalid input |
| 2 | Draft preview route | Show generated sections | Render fixture draft |
| 3 | Save draft | Persist reviewed content | Save and reload draft |`,
        },
        {
          id: "mvp-validation",
          label: "Validation and handoff",
          summary: "Set the cut list, guardrails, and first coding prompt.",
          markdown: `## 9. Validation Plan
### First Test Audience
Five freelance designers who send proposals monthly.

### Suggested Metrics
- 60% of users complete a generation.
- 50% of generated drafts are edited and saved.

## 10. Cut List
- If CRM import takes too long, use manual client notes only.
- If payment setup slows the first test, use a manual pilot.

## 11. AI Build Guardrails
- Build one chunk at a time.
- Do not add features outside MVP scope.
- Keep provider keys server-side.

## 12. Next Prompt for AI Coding Tool
Start with the proposal intake form and a fixture-backed proposal draft preview.`,
        },
      ],
    },
  },
  {
    id: "wear-it-now",
    projectName: "Wear It Now AI Mirror",
    projectSummary:
      "A shopping assistant that helps style-conscious buyers preview outfits before buying or building a look.",
    marketResearch: {
      summary:
        "The opportunity is confidence before purchase. The first version should reduce outfit uncertainty without pretending to solve every fit problem.",
      markdown: `# Market Research: Wear It Now AI Mirror

## Executive Summary
Wear It Now AI Mirror sits between virtual try-on tools, styling apps, and retailer product pages. The first wedge is a fast preview workflow that helps shoppers compare outfits before they buy.

## Market Snapshot
- Shoppers already use screenshots, saved carts, and social feedback to decide what to wear.
- Retailers invest in try-on tools, but coverage is fragmented.
- Styling apps can inspire outfits, but often lack product-page context.

## Entry Assessment
Start as a desktop web workflow that takes a base profile and a product image. Avoid marketplace scope until preview quality and trust are proven.

## Biggest Risk
The output has to be useful enough for decision-making. A beautiful but inaccurate preview will damage trust quickly.`,
    },
    productPlan: {
      title: "# PRD: Wear It Now AI Mirror",
      chunks: [
        {
          id: "prd-context",
          label: "Context and goals",
          summary: "Set the product frame and success targets.",
          markdown: `## 1. Introduction/overview
Wear It Now AI Mirror helps shoppers preview outfits before buying or styling them.

## 2. Goals
### Business goals
- Validate whether shoppers trust generated try-on previews.
- Reach 500 preview generations in the first 30 days.

### User goals
- Decide what to wear faster.
- Understand whether a retailer item matches their body profile and style.`,
        },
        {
          id: "prd-users",
          label: "Users and stories",
          summary: "Identify who uses the mirror and why.",
          markdown: `## 3. User personas
### 3.2 Persona details
**Priya Shopper**
- **Archetype**: The Outfit Optimizer
- **Meta**: Technical-adjacent fashion shopper
- **Description**: Priya is a style-conscious shopper who wants outfit confidence before buying.
- **Needs**:
  - Better styling guidance
  - Fast outfit previews
- **Pain points**:
  - Unclear fit and style from flat product photos
  - Wastes time comparing outfit combinations
- **Motivation**: Priya wants to feel confident before spending money on clothes.

## 4. User stories and acceptance criteria
### US-001: Preview outfit
**User story**
As a shopper, I want to preview an outfit on my body profile.
**Acceptance criteria**
- The preview appears on the retailer page.
- The user can save or discard the result.`,
        },
        {
          id: "prd-scope",
          label: "Scope and constraints",
          summary: "Keep the first version focused on one preview workflow.",
          markdown: `## 5. Functional requirements
### 5.1 Core requirements
- **FR-001**: Avatar upload
  - Users can upload one base photo.
- **FR-002**: Retailer overlay
  - Users can trigger try-on from supported product pages.

## 6. Technical considerations
- Keep image generation on the server.
- Store generated images in private storage.

## 7. Non-goals / out of scope
- Native mobile apps are deferred.
- Multi-user styling teams are deferred.`,
        },
        {
          id: "prd-follow-through",
          label: "Metrics and follow-through",
          summary: "Sequence the build around trust and performance.",
          markdown: `## 8. Success metrics
### User metrics
- 60% of users generate a first preview within one day.
- Refund rate stays below 5%.

### Business metrics
- 500 paid preview credits are purchased within 30 days.

### Technical/performance metrics
- Preview generation completes in under 45 seconds.
- Generation errors stay below 2%.

## 9. Timeline and milestones
### Project estimate
- **Size**: Medium
- **Estimated total duration**: 8 weeks

### Team composition
- **Product manager**: Scope and acceptance criteria
- **Full-stack engineer**: Extension, UI, and backend routes
- **Designer**: Overlay and result review workflow

### Phase 1: Foundation
- **Goal**: Create the upload and account shell.
- **Estimated duration**: 3 weeks
- **Key deliverables**:
  - Avatar upload
  - Private storage

### Phase 2: Extension and generation
- **Goal**: Generate try-on previews from retailer pages.
- **Estimated duration**: 5 weeks
- **Key deliverables**:
  - Retailer overlay
  - Generation route

## 10. Risks and mitigation
- **Risk**: Image quality misses user expectations.
  - **Impact**: Users lose trust after poor previews.
  - **Mitigation**: Add quality gates before charging credits.

## 11. Dependencies and assumptions
### 11.1 Dependencies
- **Generation API**: A reliable image-to-image virtual try-on API must be selected.
- **Cloud storage provider**: Private object storage must be configured.

### 11.2 Assumptions
- **Target user**: The primary target user is a style-conscious desktop shopper.
- **Platform**: Desktop web first.

## 12. Open questions
- Which specific virtual try-on model will be used?
- What preview quality threshold is good enough for a paid pilot?`,
        },
      ],
    },
    firstVersionPlan: {
      title: "# MVP Plan: Wear It Now AI Mirror",
      chunks: [
        {
          id: "mvp-summary",
          label: "MVP summary",
          summary: "State the launchable version.",
          markdown: `## 1. MVP Summary
Wear It Now AI Mirror helps shoppers generate a practical outfit preview from a base profile and product image.

## 2. Key Assumptions and Scope Decisions
- [HIGH CONFIDENCE] Shoppers want more confidence before buying clothes online.
- [SCOPE DECISION] Native mobile apps are excluded from MVP.`,
        },
        {
          id: "mvp-flow",
          label: "User and flow",
          summary: "Define the preview workflow.",
          markdown: `## 3. Target User and Problem
### Primary User
Style-conscious shoppers who browse retailer sites on desktop.
### Problem
They cannot tell whether a product will work with their body profile and wardrobe.
### Riskiest Product Assumption
Users will trust generated previews enough to influence purchase decisions.

## 4. Core User Flow
1. User creates a body profile.
2. User adds a retailer product image.
3. System generates an outfit preview.
4. User saves or discards the result.`,
        },
        {
          id: "mvp-build",
          label: "Scope and build sequence",
          summary: "Keep the first version narrow and testable.",
          markdown: `## 5. MVP Scope
| Category | Include in MVP | Exclude for Now |
|---|---|---|
| Profile | One base image | Multi-avatar wardrobe |
| Preview | Product image try-on | Retailer marketplace |

## 6. Must-Have Features
| Feature | Why It Matters | Acceptance Criteria |
|---|---|---|
| Profile upload | Creates the preview base | User can upload and replace one photo |
| Preview generation | Delivers product value | User can generate and view a result |

## 7. Suggested Build Approach
| Layer | Recommendation | Why |
|---|---|---|
| Frontend | Next.js workspace | Fast authenticated UI |
| Storage | Private image storage | Protects user photos |

## 8. AI-Friendly Build Sequence
| Step | Build Chunk | Goal | Test Before Moving On |
|---|---|---|---|
| 1 | Profile upload | Store base image | Upload and delete image |
| 2 | Product input | Capture product image | Submit valid image URL |
| 3 | Preview result | Render generated preview | Display fixture result |`,
        },
        {
          id: "mvp-validation",
          label: "Validation and handoff",
          summary: "Name the cuts and handoff prompt.",
          markdown: `## 9. Validation Plan
### First Test Audience
Ten shoppers who already buy clothes from online retailers.

### Suggested Metrics
- 50% of testers generate at least two previews.
- 40% report the preview changed a purchase decision.

## 10. Cut List
- If retailer overlays take too long, start with pasted product image URLs.
- If payments slow the test, run a manual free pilot.

## 11. AI Build Guardrails
- Keep user photos private.
- Do not add marketplace or social features.
- Build upload, input, and preview as separate slices.

## 12. Next Prompt for AI Coding Tool
Start with the profile upload and a fixture-backed preview result page.`,
        },
      ],
    },
  },
]

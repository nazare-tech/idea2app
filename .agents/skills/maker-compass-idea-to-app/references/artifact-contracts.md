# Artifact Contracts

## `01-idea-brief.md`

Required H2 sections:

- Idea
- Product name
- Target user
- Problem and current workaround
- Core workflow
- Business model hypothesis
- Launch priority
- Platform scope
- Constraints
- Assumptions
- Evidence status

## `02-market-research.md`

Start with the production-compatible H1 `# Competitive Analysis: <Product Name>`. The local filename remains `02-market-research.md` because that is the user-facing artifact label. Use these H2 headings in order:

1. Executive Summary
2. Direct Competitors
3. Feature Comparison
4. Pricing Comparison
5. Best Customer Segments
6. Competitive Landscape Overview
7. Positioning Map
8. How You'll Reach Customers
9. Gap Analysis
10. Ways to Stand Out
11. What Makes It Hard to Copy
12. First Version Focus
13. Recommended Next Moves

Use 3–5 direct competitors only when supported. Each competitor gets an H3 profile with Overview, Core Product/Service, Market Positioning, Strengths, Key Edge, Limitations, Pricing Model, and Target Audience. Use Markdown tables for feature, pricing, and positioning comparisons.

## `03-product-plan.md`

Start with `# PRD: <Product Name>`. Use these H2 headings in order:

1. Introduction/overview
2. Goals
3. Team and Milestones
4. Success metrics
5. User personas
6. Functional requirements
7. User stories and acceptance criteria
8. Non-goals / out of scope
9. Technical considerations
10. Risks and mitigation
11. Dependencies and assumptions
12. Open questions

Requirements:

- Exactly three personas.
- Stable IDs: `FR-`, `SE-`, and `CR-`.
- Testable acceptance criteria.
- Explicit empty, loading, error, duplicate/conflict, auth, accessibility, performance, privacy, and analytics behavior when relevant.
- Proposed metrics labeled as starting thresholds when evidence is weak.
- Team roles suitable for later sub-agent prompts.

## `04-first-version-plan.md`

Start with the production-compatible H1 `# MVP Plan: <Product Name>`. The local filename remains `04-first-version-plan.md` because that is the user-facing artifact label. Include:

1. MVP Summary
2. Key Risks, Assumptions, and Scope Decisions
3. Target User and Problem
4. MVP Goal, Definition of Done, and Riskiest Assumptions
5. Core User Flows
6. Suggested Build Approach
7. Recommended AI Build Tool
8. AI-Friendly Build Sequence
9. Validation Plan
10. Next Prompt for AI Coding Tool

Choose one primary user and one primary tool. Use the lightest useful validation format. Include `[COMPLIANCE FLAG]` for health, finance, legal, children/student data, government identity, employment eligibility, EU personal data, or other highly sensitive information. Recommend a safer early test rather than claiming full compliance.

## AI Build Files

### `first-prompt.md`

Paste-ready prompt containing product type, first-version format, goal, definition of done, target user, core flow, stack, first build chunk, exclusions, test-first rule, verification, and change-reporting rule.

### `build-steps.md`

Ordered table of small build chunks. Each row states goal and test before moving on. First chunk must match the chosen validation format.

### `functional-requirements.md`

Copy Product Plan functional requirements without changing IDs or scope.

### `user-stories-and-acceptance-criteria.md`

Copy Product Plan user stories with pass/fail criteria.

### `technical-considerations.md`

Copy Product Plan technical considerations plus any explicit stack compatibility note from the First Version Plan.

### `sub-agents.md`

Create one H2 per Product Plan role. Give each role a bounded responsibility, required context files, outputs, exclusions, and verification expectations.

### `project-context.md`

Include What We Are Building, Target User and Problem, MVP Goal, Build Approach, Product Metrics and Instrumentation, and Working Rules. Require planning, scoped red-green-refactor, ownership checks at trusted server boundaries, environment-variable secrets, real-flow verification, review, security review, recovery notes, and documentation sync.

## `mockups/design-plan.md`

For each platform, define:

- target user;
- one populated happy-path scenario;
- exactly two screens with name, fixed caption, purpose, visible data, and P0 priority;
- Directions A/B/C with name, layout strategy, navigation, density, visual tone, motifs, consistency notes, pros, and cons.

Keep the two screens constant across A/B/C.

Also write one JSON file per requested platform at `mockups/<platform>/design-plan.json`. Each must match:

- `version`: `mockup-design-plan-v1`
- `primaryPlatform`: directory platform
- non-empty `happyPathScenario`
- non-empty `targetUser`
- exactly two `screens`, each with `name`, numeric `flowStep`, `caption`, `purpose`, `happyPathState`, non-empty `dataToShow`, and `priority`
- exactly three `directions` labeled A, B, C, each with `name`, `layoutStrategy`, `navigationPattern`, `density`, `visualTone`, non-empty `reusableMotifs`, and `consistencyNotes`

## `run-summary.md`

Include idea, source/evidence caveats, artifact index, six-image gallery links, direction comparison, validator result, visual-QA result, and remaining risks.

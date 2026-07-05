---
implemented: true
implemented_at: 2026-07-01T16:41:12Z
implementation_summary: "Created a cited AI coding-tool handoff research database plus a review artifact for Maker Compass recommendations."
---

# Plan: AI Coding Tool Research Database

## Goal
Create a cited markdown research database that compares the coding tools currently shown on the Maker Compass landing page plus adjacent tools users may reasonably hand off to from the AI Prompts section. The output should help Maker Compass recommend a tool based on target platform, backend needs, user technical level, collaboration needs, and expected cost.

## Assumptions
- This pass creates research documentation only; it does not change landing-page or AI Prompts UI.
- The current landing-page handoff list is the source of truth for must-cover tools.
- Pricing and plan names can change, so the database will include a research date and source links.
- Community sentiment should include Reddit, Hacker News, GitHub, forums, or review sites where available, but official docs/pricing pages remain the source of truth for current plans.

## Clarifying Questions
1. Should the database include only tools already shown on the landing page, or also adjacent tools users may ask about?
   - Recommendation A: Include all landing-page tools plus a small set of adjacent builder/agent tools. This makes recommendations more useful when the best answer is not already in the logo bar.
   - Trade-off: Broader scope means more maintenance as tools change.
   - Recommendation B: Include only the landing-page tools. This is easier to keep current but may miss better recommendations for non-web or backend-heavy projects.
   - Trade-off: Narrower coverage may make the handoff advice feel less informed.
   - Selected: Recommendation A, because the user asked for "others as well."
2. Should pricing be normalized as exact monthly costs or as pricing bands?
   - Recommendation A: Record exact public plan prices where official pricing pages expose them, and mark unavailable or sales-led pricing clearly.
   - Trade-off: Exact prices can become stale and need dated citations.
   - Recommendation B: Use coarse bands only. This ages better but is less useful for users estimating cost.
   - Trade-off: Users lose purchase-decision detail.
   - Selected: Recommendation A, because the user explicitly asked for pricing plans and likely build cost.
3. Should recommendations be product-facing or implementation-facing?
   - Recommendation A: Write recommendations in product-facing language that can later be shown in Maker Compass, with enough implementation detail for prompt selection logic.
   - Trade-off: Less exhaustive than an internal-only competitive teardown.
   - Recommendation B: Write a dense internal analysis first and distill it later.
   - Trade-off: More complete, but less directly usable in the product.
   - Selected: Recommendation A, because the requested output should be reusable as a database for handoff guidance.

## Recommended First Step
Confirm the landing-page handoff tools from `src/app/page.tsx`, then research official pricing and credible user sentiment for each category.

## Plan
1. Map the current landing-page tools and the current AI Prompts handoff surface.
2. Research official pricing, platform coverage, backend capabilities, deployment support, collaboration, code ownership, and security posture.
3. Gather community sentiment from Reddit, Hacker News, GitHub issues/discussions, and trusted reviews where available.
4. Create a markdown database under `docs/research/` with a summary matrix, detailed tool profiles, recommendation rules, pricing notes, and source links.
5. Create a review artifact documenting verification, limitations, and maintenance risks.

## Milestones
- Source inventory complete: landing-page tools and adjacent research targets are listed.
- Research complete: official and community sources are captured with links.
- Database complete: markdown file is structured enough to support future UI or prompt logic.
- Review complete: limitations, update cadence, and verification notes are documented.

## Validation
- Confirm the file covers every current landing-page handoff tool.
- Confirm each pricing claim has an official source or is marked unavailable/sales-led.
- Confirm recommendations distinguish static sites, frontend-only apps, full-stack web apps, mobile apps, desktop apps, internal tools, and backend-heavy/regulated work.
- Run a docs-only sanity check by reading the generated markdown for broken structure and obvious stale/unsupported claims.

## Risks And Mitigations
- Risk: Pricing changes quickly.
  - Mitigation: Include `Research date: 2026-07-01`, official pricing links, and maintenance notes.
- Risk: Community sentiment is anecdotal and can overrepresent frustrated users.
  - Mitigation: Separate sourced facts from community patterns and avoid treating forums as statistically representative.
- Risk: Tool capabilities overlap and change rapidly.
  - Mitigation: Classify by best-fit use case rather than declaring one universal winner.
- Risk: The database becomes too verbose for product use.
  - Mitigation: Include a concise recommendation rubric and keep detailed profiles below the matrix.

## Rollback Or Recovery
This is a docs-only change. If the research format is not useful, revise or replace the new markdown files without touching application code.

## Open Decisions
- None. Defaults selected per repo instruction to proceed with Recommendation A unless a safety constraint applies.

## Critique

### Software Architect
- The markdown should be structured with stable headings and table columns so it can later be parsed or migrated into JSON without rewriting the research.

### Product Manager
- Tool recommendations should map to user intent and build context, not logo popularity. The most valuable output is "use X when..." guidance.

### Customer Or End User
- Users need price expectations and a safe first choice. They do not need a maximal feature encyclopedia during handoff.

### Engineering Implementer
- Avoid adding app code until the recommendation model is validated. A docs database is the right first artifact.

### Risk, Security, Or Operations
- Avoid encouraging users to paste secrets or proprietary code into cloud tools without noting privacy/security fit. Regulated or backend-heavy work should bias toward local/editor tools with explicit repository control.

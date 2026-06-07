# Plan: Competitive Table Consolidation

## Goal
Consolidate the Market Research direct competitors section so it shows one dense, useful competitor table instead of a comparison table followed by redundant competitor cards. All information currently visible in the cards should remain available in the table: competitor link, profile tag, overview, core product, positioning, strengths, key edge, limitations, pricing model, and target audience.

## Assumptions
- The change should apply to the Competitive Research v2 module renderer, not the underlying generated markdown contract.
- Existing generated documents should keep working because the parser already extracts the needed competitor fields from the Direct Competitors section.
- The direct competitors section should stay anchored at `market-research-direct-competitors` so sidebar/hash navigation does not regress.
- The full-page `CompetitiveAnalysisDocument` and split workspace `CompetitiveDetailSection` should use the same consolidated section.
- No backend, Supabase, generation prompt, or document metadata change is required unless implementation reveals the table needs a new structured view model.
- Lower-priority profile fields can be grouped inside stacked table cells to reduce column count.
- Mobile horizontal scrolling is acceptable for this dense comparison table.

## Clarifying Questions
1. Should the table include every card field as separate columns, or is it acceptable to combine lower-priority fields like overview/core/strengths into stacked cell content to preserve readability?
   - Answered: combine lower-priority fields in stacked cell content.
2. Should competitor profile tags such as `PROFILE`, `TEAM`, or `ENTERPRISE` remain visible in the table?
   - Answered: remove these tags from the table.
3. Should the current section title stay close to `Competitor Profiles & Fast Comparison`, or should it become something more direct like `Direct Competitor Profiles`?
   - Answered: use `Competitor Profiles & Quick Comparison`.
4. On mobile, is horizontal scrolling acceptable for this dense table, or should each competitor row collapse into a stacked row layout?
   - Answered: horizontal scrolling is acceptable.

## Recommended First Step
Write or adjust a focused renderer test that fails while the redundant card grid still exists. The test should assert that the direct competitors section renders table headers/data for all card fields, and no longer renders the card-only grid/container behavior.

## Plan
1. Inspect current renderer and tests.
   - Output: confirm the data path from `parseCompetitiveAnalysisV2()` to `structured.directCompetitors` to `CompetitorProfiles`.
   - Validation: no code changes yet; identify the smallest test surface.
2. Add failing renderer coverage.
   - Output: update `src/components/analysis/competitive-analysis-document.test.tsx` fixture to include multiple competitors and all card-only fields.
   - Validation: focused `node --import tsx --test src/components/analysis/competitive-analysis-document.test.tsx` should fail before implementation because the expected consolidated table structure is absent.
3. Replace card grid with a richer table.
   - Output: update `src/components/analysis/competitive-analysis-document.tsx` so `FastComparisonTable` or a renamed table component includes all profile fields and the `CompetitorProfiles` section no longer renders the post-table article cards.
   - Column strategy: minimize columns by using four primary columns: competitor, profile, commercial fit, and advantage/risk. Stack overview/core under profile, pricing/audience under commercial fit, and strengths/key edge/limitations under advantage/risk.
   - Validation: focused renderer test passes and confirms overview/core/strengths/limitations/pricing/audience/key edge remain in rendered HTML.
4. Check responsive and visual behavior.
   - Output: run the local app, open the current in-app browser route, inspect the Market Research direct competitors section at desktop width and a narrower viewport if practical.
   - Validation: table is readable, no redundant profile cards appear after it, and section navigation remains stable.
5. Run broader verification.
   - Output: run `npm test` or the relevant focused test set, plus `npm run lint` if time and local environment allow.
   - Validation: no test/lint regressions from the renderer change.
6. Review and remediate.
   - Output: create `plans/competitive-table-consolidation-review.md` with code review and security review notes, then fix actionable findings.
   - Validation: rerun focused tests after any remediation.

## Milestones
- Test Locked: completed. Renderer test failed against the old redundant layout and names the expected consolidated behavior.
- UI Consolidated: completed. All competitor card fields appear in grouped table cells, and the card grid is removed.
- Visual Verified: completed. The current local project page shows the consolidated direct competitors section with one table and no duplicate cards.
- Review Complete: completed. Code review and security review notes are written in `plans/competitive-table-consolidation-review.md`; no remediation findings remain.

## Validation
- Focused test: `node --import tsx --test src/components/analysis/competitive-analysis-document.test.tsx`
- Broader test: `npm test`
- Lint: `npm run lint`
- Visual: open `http://localhost:3000/projects/adc9d6d6-30b7-43ec-8b3c-e0b0aeab63f6-mobile-groomer-no-show-booking-tool?tab=prd#market-research-direct-competitors` in the in-app browser and verify the section shows one consolidated table with no follow-on competitor cards.

## Risks And Mitigations
- Risk: A table with every field becomes too wide and hard to scan.
  - Mitigation: Use a dense product-table pattern with grouped cell content, horizontal scroll, and concise headers instead of one column per tiny field if needed.
- Risk: Tests become brittle by asserting implementation-specific class names.
  - Mitigation: Prefer text/content assertions and only use structure assertions where needed to prove the card grid was removed.
- Risk: Existing generated content omits some fields, creating blank cells.
  - Mitigation: Preserve existing fallback behavior and show `Unknown` only for fields that already used that fallback, such as pricing and audience.
- Risk: Removing `CompetitorField` or helper functions could affect full-page and split workspace renderers differently.
  - Mitigation: Confirm both render paths use the same component and keep shared helpers only where still needed.

## Rollback Or Recovery
Rollback is limited to the renderer and tests. Revert the changes to `src/components/analysis/competitive-analysis-document.tsx` and `src/components/analysis/competitive-analysis-document.test.tsx`; generated documents and stored data do not need migration because this plan does not change the markdown contract or database schema.

## Open Decisions
- Resolved: use grouped stacked cells rather than separate columns for every field.
- Resolved: use horizontal scrolling on mobile.
- Resolved: rename the section to `Competitor Profiles & Quick Comparison`.

## Critique

### Software Architect
- This should stay a component-level renderer change. The parser already extracts the right fields, so adding a new data model layer would create unnecessary contract churn.
- The main architectural concern is keeping the table component readable and reusable without over-abstracting around a one-off report section.

### Product Manager
- The request improves information density and removes obvious repetition. The success criterion is faster competitor comparison, not simply fewer components.
- The table should still preserve the richer profile context from the cards, because removing duplication by losing information would make the report less useful.

### Customer Or End User
- A founder scanning market research wants to compare competitors quickly. One table is better than reading a table and then re-reading the same companies in cards.
- A very wide table can become tiring, so the implementation should minimize column count and stack related details inside fewer high-signal columns.

### Engineering Implementer
- The implementation looks contained, but visual verification matters because server-rendered HTML tests will not catch awkward column widths or hard-to-read row density.
- The current `CompetitorField` and card-specific helpers may become dead code; remove only what is truly unused after implementation.

### Risk, Security, Or Operations
- Security risk is low because the change is presentational and keeps existing external-link handling with `target="_blank"` and `rel="noreferrer"`.
- Operational risk is low because there is no migration, generation change, or API behavior change. The main rollback path is reverting the renderer patch.

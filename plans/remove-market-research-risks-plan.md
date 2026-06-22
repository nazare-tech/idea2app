---
implemented: true
implemented_at: 2026-06-22T07:02:27Z
implementation_summary: Removed the Market Research risks subsection from the prompt contract, parser, renderer, nav, and glossary while keeping Product Plan risk handling intact.
---

# Plan: Remove Market Research Risks

## Goal
Remove `Risks & Competitor Responses` from Market Research for newly created projects because Product Plan already has a fuller risk/dependency/open-question section.

## Assumptions
- Product Plan remains the canonical place for risks, dependencies, and open questions.
- New projects should not generate or display the Market Research risk subsection.
- Existing saved project data does not need content preservation for the removed subsection.
- Deleting existing projects is not technically required for this code change; it is a separate destructive data operation.

## Clarifying Questions
1. Should old Market Research documents be normalized to hide the old section?
   - Recommendation A: Strip old `Risks & Competitor Responses` in the parser.
   - Trade-off: Existing project UI also loses the duplicate subsection without deleting data.
   - Recommendation B: No. Focus only on new projects and let old documents behave normally.
   - Trade-off: Smaller change, but old saved docs may still show the removed text.
2. Should existing projects be deleted now?
   - Recommendation A: Do not delete them as part of this implementation.
   - Trade-off: Avoids irreversible data loss and still achieves the new-project behavior.
   - Recommendation B: Delete all existing projects through the app/API.
   - Trade-off: Clears old examples, but destroys project data and should be confirmed with exact scope.

## Recommended First Step
Implement Recommendation A for both questions: remove the section from code and prompts, strip old removed sections in memory, and do not delete project data unless explicitly confirmed as a separate destructive operation.

## Plan
1. Remove `Risks & Competitor Responses` from the Market Research v2 section order, workspace map, aliases, structured data, parser, and prompt version.
2. Strip old `Risks & Competitor Responses` and `SWOT Analysis` H2 sections during parsing so existing project UI does not need data deletion.
3. Remove the section from generation prompts, legacy fallback prompts, nav, fallback section lists, and designed renderers.
4. Remove stale explainable-term metadata for this Market Research-only label.
5. Update tests for the new 13-section Market Research contract, prompt output, nav order, and renderer output.
6. Update `PROJECT_CONTEXT.md` to document that Product Plan owns risk handling.
7. Run focused tests, typecheck, lint, and a browser DOM check on the existing local workspace.

## Milestones
- Contract updated: Market Research v2 no longer requires or accepts the risk subsection.
- Prompt updated: new projects do not ask the model for Market Research risk bullets.
- UI updated: Market Research nav and renderer no longer expose the subsection.
- Verification complete: tests and local browser check pass.

## Validation
- `node --import tsx --test src/lib/competitive-analysis-v2.test.ts src/lib/competitive-analysis-prompt.test.ts src/lib/document-sections.test.ts src/components/analysis/competitive-analysis-document.test.tsx`
- `npm run typecheck`
- `npm run lint`
- Browser DOM check on `http://127.0.0.1:3000/projects/...` showing Market Research nav does not include `Risks & Competitor Responses`.

## Risks And Mitigations
- Existing old projects may still contain old markdown in the database: strip removed sections in memory so the designed UI does not show them.
- Prompt tests can miss duplicate wording in fallback prompts: scan all `src` references before finishing.
- Product Plan must continue to expose risk content: leave Product Plan risk rendering untouched.

## Rollback Or Recovery
Restore the previous Market Research section order, prompt text, renderer card, nav item, and tests from git diff if the section is needed again.

## Open Decisions
- Decision: Add a narrow in-memory strip for removed Market Research risk/SWOT sections so existing project UI does not require data deletion.
- Decision: Do not delete existing projects during this code change without a separate exact confirmation.

## Critique

### Software Architect
- Removing the section from the canonical order is cleaner than hiding it in the UI, because it prevents prompt drift and invalid downstream assumptions.

### Product Manager
- The product becomes less repetitive. Product Plan is the better place for risk because it can connect risks to execution, dependencies, and open questions.

### Customer Or End User
- Users should not see the same concept twice in adjacent artifacts. Market Research can focus on evidence, competitors, positioning, and opportunity.

### Engineering Implementer
- This touches several contract surfaces. Tests should assert absence, not only the new count, to avoid a future hidden duplicate.

### Risk, Security, Or Operations
- Code change is low security risk. Deleting projects is a separate destructive data operation and should not be bundled into a renderer/prompt change.

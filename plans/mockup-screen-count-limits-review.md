# Review: Platform-Specific Mockup Screen Limits

## Scope
- `src/lib/mockup-design-plan.ts`
- `src/lib/openrouter-image-mockup-pipeline.ts`
- `src/lib/prompt-lab.ts`
- Focused unit tests for mockup planning, image prompt composition, and Prompt Lab overrides
- `PROJECT_CONTEXT.md`
- `plans/mockup-screen-count-limits-plan.md`

## Verification
- `node --import tsx --test src/lib/mockup-design-plan.test.ts src/lib/openrouter-image-mockup-pipeline.test.ts src/lib/prompt-lab.test.ts`
- `npm run typecheck`
- `npx eslint src/lib/mockup-design-plan.ts src/lib/mockup-design-plan.test.ts src/lib/openrouter-image-mockup-pipeline.ts src/lib/openrouter-image-mockup-pipeline.test.ts src/lib/prompt-lab.ts src/lib/prompt-lab.test.ts`
- `rg -n "2-4 screens|2 to 4|2-4" src/lib/mockup-design-plan.ts src/lib/openrouter-image-mockup-pipeline.ts src/lib/prompt-lab.ts PROJECT_CONTEXT.md`

## Fresh-Eyes Self Review
- Pass 1: Reviewed the implemented parser/helper diff, image prompt diff, Prompt Lab override path, tests, and project context update. No functional bugs found.
- Pass 2: Ran a stale-contract scan for the old `2-4` language in production code and project context. Found one stale `PROJECT_CONTEXT.md` architecture index row and updated it. Reran the scan successfully.

## Code Review Findings
- No blocking findings.
- Low residual risk: `normalizeMockupDesignPlanScreens` trims over-limit plans without storing a separate "trimmed" metadata flag. This matches the approved default, and tests cover the observable output.

## Security Review Findings
- No security findings.
- This change does not add auth, authorization, data access, payment handling, secrets, or new external API calls. It only changes validation, prompt construction, and documentation.

## Remediation Checklist
- [x] Update stale `PROJECT_CONTEXT.md` architecture index row from the old `2-4` contract.
- [x] Rerun stale-text scan after remediation.

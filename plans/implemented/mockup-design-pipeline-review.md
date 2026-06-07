# Review: Happy-Path Storyboard Mockup Pipeline

## Scope
- Required platform intake question, canonical choices, and project-creation validation.
- Hidden mockup design planner, OpenRouter storyboard generation, option recovery/finalization, fixture generation, Prompt Lab compatibility, and renderer updates.
- Documentation updates in `PROJECT_CONTEXT.md` and the implementation plan.

## Verification
- `node --import tsx --test src/lib/intake-question-generation.test.ts src/lib/intake-required-questions.test.ts src/lib/intake-summary.test.ts`
- `node --import tsx --test src/lib/openrouter-image-mockup-pipeline.test.ts src/lib/mockup-design-plan.test.ts src/components/ui/mockup-renderer.test.tsx`
- `node --import tsx --test src/lib/openrouter-image-mockup-pipeline.test.ts src/lib/mockup-design-plan.test.ts`
- `npm test`
- `npm run typecheck`
- `npm run lint` exits 0 with existing warnings in `src/app/api/tech-specs/[id]/route.ts` and `src/components/workspace/project-workspace.tsx`
- `git diff --check`

## Code Review Findings
- Fixed: Hidden design plan was initially included in saved mockup content. Final saved mockup content now keeps only display-safe storyboard option data; the full design plan is stored in `mockups.metadata.design_plan`.
- Fixed: JSON design planning initially used the image model by default. The planner now uses `OPENROUTER_MOCKUP_PLANNER_MODEL`, then `OPENROUTER_ANALYSIS_MODEL`, then the image model as a fallback.
- Fixed: Platform-question detection could have replaced unrelated questions containing the word "mobile". Detection now requires direct platform intent or a platform-like option set, with regression coverage.
- Fixed: Option generation accepted arbitrary run-id characters. Generate, recover, and finalize paths now require safe run-id values.
- Fixed: Mobile image prompts allowed the model too much freedom with device sizing and captions. The prompt now sends a structured mobile composition JSON with iPhone 17 Pro portrait frames, fixed top labels, neutral arrows, side rationale lanes, and same-width scroll/continuation handling.

## Security Review Findings
- Authentication and ownership checks remain in all mockup routes before storage recovery, finalization, and fixture saves.
- Service-role storage access remains server-only; users only receive authenticated proxy URLs.
- PRD/MVP/intake content is wrapped as untrusted context in the design-plan prompt, and design plans are validated before reuse in option generation, recovery, and finalization.
- No secrets or API keys are hardcoded; new model/image settings use environment variables.
- No destructive data migration or cleanup was included; old saved mockups are left untouched.

## Remediation Checklist
- [x] Keep full design plans out of user-rendered content JSON.
- [x] Add dedicated planner-model selection and tests.
- [x] Validate design-plan payloads passed back from the browser.
- [x] Validate run IDs on option generation, recovery, and finalization.
- [x] Narrow platform-question replacement heuristics and cover false-positive wording.
- [x] Add regression coverage for the mobile storyboard composition grammar.

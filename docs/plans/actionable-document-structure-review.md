# Review: Actionable Document Structure Updates

## Scope
Implemented NAZ-66, NAZ-88, NAZ-92, and NAZ-96 across the planning-document prompt contracts, parser aliases, workspace section ordering, and renderer blocks. Also fixed the intake question-count bug discovered while creating the requested baseline projects through the real UI.

## Linear Status
- `NAZ-66` moved to `Done`.
- `NAZ-88` moved to `Done`.
- `NAZ-92` moved to `Done`.
- `NAZ-96` moved to `Done`.

## Baseline Evidence
- Checkpoint commit before work: `a3cf1cf5`.
- Idea 1.1 before project: `6d18736f-3a08-4bf8-bc77-07cb73241038`.
- Idea 2.1 before project: `d34bfd78-fe07-4e2c-b1d5-288b06aa6c37`.
- Before artifacts:
  - `ui-evidence/2026-06-30-document-structure/before/idea-1.1/`
  - `ui-evidence/2026-06-30-document-structure/before/idea-2.1/`
- UI bug-fix evidence:
  - `ui-evidence/2026-06-30-intake-question-count-fix/idea-1-1-step-2-four-questions-viewport.png`

## After Evidence
- Status: completed for raw artifacts and mockup metadata.
- Idea 1.1 after project: `ce31de52-f5eb-4562-bae7-a0821538e09b`.
- Idea 2.1 after project: `4df96f00-3582-472f-83ab-50ecb4d6c8c4`.
- After artifacts:
  - `ui-evidence/2026-06-30-document-structure/after/idea-1.1/`
  - `ui-evidence/2026-06-30-document-structure/after/idea-2.1/`
- Artifact sizes:
  - Idea 1.1 before: Market Research 11,479 bytes; Product Plan 42,939 bytes; First Version Plan 16,141 bytes; Mockups JSON 6,517 bytes.
  - Idea 1.1 after: Market Research 19,237 bytes; Product Plan 56,648 bytes; First Version Plan 22,840 bytes; Mockups JSON 14,270 bytes.
  - Idea 2.1 before: Market Research 10,555 bytes; Product Plan 36,821 bytes; First Version Plan 19,469 bytes; Mockups JSON 14,506 bytes.
  - Idea 2.1 after: Market Research 18,344 bytes; Product Plan 25,312 bytes; First Version Plan 16,206 bytes; Mockups JSON 12,467 bytes.
- The in-app browser completed baseline creation but later became unavailable for reliable screenshots and sign-in recovery. Chrome fallback also timed out. To avoid bypassing a real UI bug, the actual UI bug was fixed first. For after artifacts, the UI controller itself was the blocker, so generation continued through the same server-side document-generation service and durable Supabase queue used by onboarding. After screenshots could not be captured because both browser controllers were unavailable.
- Follow-up correction: this fallback should not be repeated for required normal-user UI flows. The likely root cause was that the local dev server had stopped, not that the browser workflow was inherently unavailable. Future sessions should keep any started dev server running, verify the server is still reachable before diagnosing browser/controller failure, then recover/restart/reopen the browser workflow when possible. If the UI workflow still cannot be restored, they should stop and report the blocker instead of substituting server/API generation for UI verification.

## Verification Commands
- `node --import tsx --test src/lib/planning-prompts.test.ts src/lib/prd-document.test.ts src/lib/mvp-plan-document.test.ts src/lib/document-sections.test.ts`
- `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx`
- `node --import tsx --test src/lib/intake-question-generation.test.ts src/lib/intake-required-questions.test.ts`
- `node --import tsx --test src/lib/mockup-design-plan.test.ts`
- `npm run typecheck`

All listed commands passed.

## Code Review
- Finding: Product Plan section 3 still used timeline language even though the visible content is team shape and milestones.
  - Status: fixed.
  - Remediation: renamed the current generated heading and UI nav/display label to `Team and Milestones` / `Team & Milestones`, while keeping parser aliases for older generated documents.
- Finding: First Version Plan validation split feedback questions and suggested metrics into separate blocks even though they overlapped as a research plan.
  - Status: fixed.
  - Remediation: changed the generated validation contract to one `Research plan` table and reused the Product Plan dependency-style numbered visual structure for validation research activities.
- Finding: The intake parser previously validated raw model question count before required-platform normalization, allowing a 4-question raw set to collapse into 3 visible questions and fail later on create.
  - Status: fixed.
  - Remediation: validate normalized question count, add UI guard, and add regression tests for parser and duplicate platform-question collapse.
- Finding: Product Plan and First Version Plan prompt changes changed stored markdown contracts, which can break render parsing if aliases are not updated.
  - Status: fixed.
  - Remediation: parser aliases, document-section nav, renderer tests, and mockup plan extraction were updated for the new section labels.
- Finding: Removing AI Build Guardrails from the generated First Version contract could leave stale current-navigation entries.
  - Status: fixed.
  - Remediation: current AI Prompts navigation no longer includes AI Build Guardrails, while legacy content remains parseable through existing markdown fallback behavior.

## Security Review
- No database schema, RLS, auth, webhook, billing, or secret-handling changes were made.
- The after-capture fallback uses local service-role access for QA artifact generation only, with credentials loaded from existing environment files and not printed.
- The new intake UI guard fails closed when generated question sets are invalid, which reduces stale/bypassed-client risk.

## Residual Risk
- The after-project generation is slow and depends on external AI/image services. If a required UI generation/verification run times out or browser navigation fails, first verify the dev server is still running and reachable. If the server is down, restart it and continue the UI flow. If the UI workflow cannot be restored after that, stop and report the blocker instead of continuing through lower-level API/server fallbacks.

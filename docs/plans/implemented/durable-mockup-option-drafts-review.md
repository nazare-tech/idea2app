# Review: Durable Mockup Option Drafts

## Scope
- Added `mockup_option_drafts` migration, generated type entry, and draft persistence helper.
- Wired draft persistence into manual single-option generation, direct all-option generation, and Generate All document generation.
- Updated recovery, image proxy authorization, finalization cleanup, and workspace refresh recovery.

## Verification
- `node --import tsx --test src/lib/mockup-option-drafts.test.ts`
- `node --import tsx --test src/lib/mockup-option-recovery.test.ts src/lib/mockup-option-drafts.test.ts src/lib/openrouter-image-mockup-pipeline.test.ts src/components/ui/mockup-renderer.test.tsx`
- `node --import tsx --test src/lib/openrouter-image-mockup-pipeline.test.ts`
- `node --import tsx --test src/components/ui/mockup-renderer.test.tsx`
- `npm run typecheck`
- `npm run lint` passed with existing `output/playwright/prod-full-flow.mjs` unused-variable warning.
- `npm test`
- `git diff --check`
- In-app browser checked `/dev/mockup-renderer-preview` at desktop and mobile widths: the draft preview shows Concept 1 ready and Concepts 2/3 generating; mobile storyboard width is contained inside horizontal scroll, with no page-level overflow.

## Fresh-Eyes Self Review
- Pass 1 reviewed the new migration, helper, route integrations, and workspace recovery effect. Found that `option_json` could contain `undefined` properties from optional option fields; fixed by JSON-serializing before upsert.
- Pass 2 reviewed authorization boundaries for draft image access and finalization. No additional code changes required after confirming draft proxy access requires a matching draft row and finalization validates exact project/run option paths.

## Code Review Findings
- No blocking findings.
- Cleanup failures after canonical mockup save are logged but non-blocking; this is intentional because the canonical document is already saved and draft rows are disposable after finalization.
- Follow-up code review found that partial draft rows could hide additional uploaded Storage-only images during recovery. Fixed by merging DB draft options with Storage fallback for missing labels and adding a regression test.
- Follow-up code review found the new `updated_at` trigger function lacked a fixed search path. Fixed the original draft-table migration for fresh databases and added `20260629192000_harden_mockup_option_drafts_trigger.sql` for databases where the earlier migration was already applied.
- Real UI verification found that canonical full mockup saves could persist draft image proxy URLs with `draftRunId` after all three images completed. Fixed by rebuilding saved canonical option URLs from `storagePath` without `draftRunId` while keeping draft URLs for in-progress progressive display.

## Security Review Findings
- Draft image proxying now requires authenticated ownership plus an exact `mockup_option_drafts` row match for the requested project/run/path.
- RLS policies on `mockup_option_drafts` require `auth.uid() = user_id` and ownership of the target project for select/insert/update/delete.
- Finalization rejects options outside exact `projectId/runId/option-{a,b,c}-storyboard` paths and rejects SVG content types.
- No secrets or new external dependencies were introduced.

## Remediation Checklist
- [x] Strip undefined fields before JSONB draft writes.
- [x] Keep draft cleanup non-blocking after canonical save.
- [x] Merge partial DB draft recovery with Storage-discovered missing labels.
- [x] Harden the draft table timestamp trigger function search path.
- [x] Strip `draftRunId` from future canonical full-generation mockup content.
- [x] Verify focused tests, full tests, lint, typecheck, and UI preview.

# Backend Change History

Use this file as the durable human-readable history for backend, database, Supabase, auth/RLS, webhook, persistence, and data-shape changes. Supabase and git may store technical history, but this log explains intent, verification, and recovery in one place.

Do not record secrets, tokens, passwords, private keys, or raw credential values.

## Entry Template

```markdown
## YYYY-MM-DD: <change title>

- Plan:
- Review:
- Durable source of truth:
- Schema or data-shape changes:
- Auth, RLS, or permission changes:
- Runtime/API behavior changes:
- Migration or deployment steps:
- Verification:
- Rollback or recovery:
- Follow-ups:
```

## Entries

## 2026-07-02: Architecture review mockup draft remediation

- Plan: [docs/plans/architecture-review-remediation-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/architecture-review-remediation-plan.md)
- Review: [docs/plans/architecture-review-remediation-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/architecture-review-remediation-review.md)
- Durable source of truth: `src/lib/openrouter-image-mockup-pipeline.ts`, `src/lib/mockup-option-drafts.ts`, `/api/mockups/recover-options`, `/api/mockups/generate`, and `src/lib/document-generation-service.ts`.
- Schema or data-shape changes: None. `mockup_option_drafts` and canonical `mockups` rows keep their existing shapes.
- Auth, RLS, or permission changes: None. Cleanup and recovery continue to scope draft rows by `project_id`, `user_id`, and `run_id`; Storage path validation still requires the exact draft storyboard path shape.
- Runtime/API behavior changes: Option-progress draft callbacks are best-effort after Storage upload, Storage recovery uses insert-only draft backfill so placeholders cannot overwrite richer live rows, and new manual/queue mockup generation opportunistically removes stale abandoned draft rows plus unreferenced draft Storage objects while preserving finalized canonical mockup images.
- Migration or deployment steps: None.
- Verification: Focused tests passed with `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx src/lib/document-generation-display-status.test.ts src/components/ui/mockup-renderer.test.tsx src/lib/mockup-option-drafts.test.ts`; full verification is recorded in the review artifact.
- Rollback or recovery: Revert the remediation changes to return to prior draft behavior. No migration rollback is needed. If cleanup were suspected of removing a still-needed draft object, canonical finalized mockup rows are unaffected because referenced runs and paths are skipped.
- Follow-ups: Consider a dedicated scheduled cleanup job or retention setting if abandoned mockup drafts need a guaranteed cleanup SLA independent of future generation requests.

## 2026-07-01: Intake question parser-failure retry

- Plan: [docs/plans/intake-question-retry-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/intake-question-retry-plan.md)
- Review: [docs/plans/intake-question-retry-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/intake-question-retry-review.md)
- Durable source of truth: `src/lib/intake-question-generation.ts` owns intake-question generation, parsing, and retry behavior; `/api/intake/questions` remains the authenticated route entrypoint.
- Schema or data-shape changes: None.
- Auth, RLS, or permission changes: None.
- Runtime/API behavior changes: `generateIntakeQuestions()` now retries once with a stricter repair prompt when `parseIntakeQuestionSet()` rejects model output, including cases where platform-question normalization leaves fewer than four questions. Provider/runtime failures still return the existing retryable error without a parser retry.
- Migration or deployment steps: None.
- Verification: `node --import tsx --test src/lib/intake-question-generation.test.ts`; `npm run typecheck`; `npm run lint` with one unrelated existing warning in `output/playwright/prod-full-flow.mjs`; real `/projects/new` UI creation for Idea 1.1 produced `Signal To Roadmap`.
- Rollback or recovery: Revert the retry helper/test changes to return to one-shot intake-question generation. Existing created projects are unaffected.
- Follow-ups: None required.

## 2026-06-29: Durable mockup option draft recovery hardening

- Plan: [docs/plans/durable-mockup-option-drafts-plan.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/durable-mockup-option-drafts-plan.md)
- Review: [docs/plans/durable-mockup-option-drafts-review.md](/Users/Mukul/Documents/GitHub/2026 projects/5_idea2app/docs/plans/durable-mockup-option-drafts-review.md)
- Durable source of truth: `mockup_option_drafts` rows store completed mockup option drafts before canonical `mockups` finalization; Supabase Storage remains the image blob store.
- Schema or data-shape changes: Hardened the new draft table timestamp trigger function to use `public.update_mockup_option_drafts_updated_at()` with `SET search_path = public`. Future canonical `mockups.content` rows from full OpenRouter generation now save image proxy URLs without `draftRunId`; draft rows and in-progress previews can still use `draftRunId` until canonical finalization. Table shapes are unchanged.
- Auth, RLS, or permission changes: No RLS policy changes in this follow-up. Existing draft policies remain owner-scoped by `user_id` and project ownership.
- Runtime/API behavior changes: `/api/mockups/recover-options` now treats DB draft rows as authoritative but scans Storage when fewer than three draft labels exist, backfills missing Storage-only labels into `mockup_option_drafts`, and returns the merged A/B/C-ordered option set. Full mockup generation now emits progressive draft URLs through the option callback, then rebuilds canonical saved option URLs from Storage paths after all three options complete.
- Migration or deployment steps: Apply `supabase/migrations/20260628000000_create_mockup_option_drafts.sql` in environments that do not already have the draft table. Apply `supabase/migrations/20260629192000_harden_mockup_option_drafts_trigger.sql` in environments where the prior draft migration was already applied.
- Verification: `node --import tsx --test src/lib/mockup-option-recovery.test.ts src/lib/mockup-option-drafts.test.ts src/lib/openrouter-image-mockup-pipeline.test.ts src/components/ui/mockup-renderer.test.tsx`; `npm run typecheck`; `npm run lint`; `npm test`; `git diff --check`.
- Rollback or recovery: Revert the route/helper/test changes to return only DB drafts or Storage fallback. If needed, replace the trigger function with the previous unqualified definition, though the hardened version is safer and table-compatible.
- Follow-ups: None required from this remediation pass.

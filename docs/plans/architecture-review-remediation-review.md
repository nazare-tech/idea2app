# Review: Architecture Review Remediation

## Scope
- Planning document renderers and parser compatibility: `src/components/analysis/planning-document-blocks.tsx`, `src/lib/mvp-plan-document.ts`.
- Mockup draft durability, recovery, status, and cleanup: `src/lib/openrouter-image-mockup-pipeline.ts`, `src/lib/mockup-option-drafts.ts`, `src/app/api/mockups/recover-options/route.ts`, `src/app/api/mockups/generate/route.ts`, `src/lib/document-generation-service.ts`, `src/lib/document-generation-display-status.ts`, `src/components/ui/mockup-renderer.tsx`.
- Landing marquee accessibility: `src/app/page.tsx`.
- Documentation/history: `PROJECT_CONTEXT.md`, `docs/plans/backend-change-history.md`.

## Verification
- `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx src/lib/document-generation-display-status.test.ts src/components/ui/mockup-renderer.test.tsx src/lib/mockup-option-drafts.test.ts` passed.
- `npm test` passed: 381 tests.
- `npm run typecheck` passed.
- `npm run lint` passed with one existing warning in `output/playwright/prod-full-flow.mjs` for unused `pageText`.
- `npm run build` passed after rerunning with network access for Google Fonts; Webpack/chunky vendor guard passed.
- UI evidence:
  - Route: `http://127.0.0.1:3002/`
  - Viewport: default in-app browser viewport, 1280x720 screenshot.
  - Screenshot: `ui-evidence/2026-07-02-architecture-review-remediation/landing-marquee-focused-127-1280x720.png`
  - Accessibility DOM evidence: `ui-evidence/2026-07-02-architecture-review-remediation/landing-marquee-accessibility-127.json`
  - Evidence result: 34 marquee cards, 17 duplicate cards hidden with `aria-hidden`, 34 decorative logo images, and 17 exposed tool names.

## Fresh-Eyes Self Review
- Pass 1: Reviewed renderer and mockup persistence diffs. Found that stale cleanup initially could delete all draft rows for a run when only one row's path was canonical; fixed by protecting the whole run when any canonical path or metadata run reference exists, then added cleanup tests.
- Pass 2: Reviewed final landing, status, recovery, and cleanup diffs after tests. No further code issues found. Build and full tests were rerun after the final cleanup fix.

## Code Review Findings
- Fixed: Product Plan Team and Milestones now renders non-phase H3 checkpoint content alongside Agents and Phase cards.
- Fixed: First Version Plan legacy fallback avoids duplicate consolidated `Core User Flows` tables.
- Fixed: Tactical shortcut sections with prose-only content no longer render empty shortcut cards.
- Fixed: Uploaded mockup option images survive transient draft callback failures; callback errors are logged and generation continues.
- Fixed: Recovery Storage backfill is insert-only and cannot overwrite richer live draft rows.
- Fixed: Terminal mockup error/cancelled states preserve option statuses and previews so missing options can show retry state.
- Fixed: Stale abandoned draft cleanup is opportunistic and skips canonical saved mockup runs/paths.
- Fixed: Landing marquee duplicate items are hidden from assistive tech and logo images are decorative.
- Completed after explicit approval: deleted the dead `BuildMap` component and dedicated CSS after confirming no active `src` usage.

## Security Review Findings
- No auth/RLS weakening introduced.
- Draft recovery still validates owned project/user/run context and exact draft path shape before image proxy access.
- Cleanup scopes by `project_id`, `user_id`, and stale `updated_at`, validates draft storage paths, and protects any run referenced by canonical `mockups.metadata.storage_run_id` or saved mockup content paths.
- Storage deletion is limited to draft option paths gathered from validated draft rows; finalized canonical mockup images are preserved.
- No secrets, keys, credential values, or new environment defaults were added.

## Remediation Checklist
- [x] Preserve PRD Team and Milestones checkpoint content.
- [x] Prevent legacy First Version Plan duplicate consolidated flow tables.
- [x] Suppress empty tactical shortcut cards.
- [x] Make mockup option progress callback best-effort.
- [x] Make recovery backfill insert-only.
- [x] Add stale abandoned draft cleanup that avoids canonical references.
- [x] Preserve mockup option statuses in terminal retry states.
- [x] Fix landing marquee accessibility.
- [x] Update project context and backend history.
- [x] Run focused and full verification.

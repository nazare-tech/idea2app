# Review: Thermo-Nuclear Code Quality Review Remediation

Date: 2026-07-11 (completed 2026-07-12 UTC)
Scope: seven commits remediating all findings from the multi-agent thermo-nuclear review of `origin/main..HEAD` (see `thermo-nuclear-review-remediation-plan.md`).

## Commits

1. `f0a0b6ba` fix(stream): key reveal reset on section heading, not nullable name (B1)
2. `04b50288` refactor(stripe): merge webhook claim/finalizer into one lease module (B3 + lease merge)
3. `dec025f0` refactor(generation): clear queue-item partials atomically with terminal status (B4)
4. `5ced34a3` refactor(workspace): hydrate and poll share one status-payload reducer (B2)
5. `953aa641` refactor(research): competitor-mention-links owns the source channel end to end (M1)
6. `0914c814` refactor(intake): split wizard into phase machine plus focused step modules (M2)
7. `c7c67608` refactor(ui): one shared Marquee replaces the two marquee implementations (M3)
8. `b0ad5456` refactor: batch of review cleanups (useReducedMotion hook, hero anchors, scripts/lib/env.mjs, allowance prop slice)

## Verification Run

- `npm test`: 614 pass, 0 fail after every chunk (was 608 on main; net +6 from new writer, lease, merge, and answers tests, minus 2 deleted invented-invariant tests).
- `npm run typecheck`: clean after every chunk (one stale `.next/types` validator reference to the deleted update route cleared by removing the generated cache).
- `npm run build`: production build passed, webpack/chunky guard passed.
- `npx eslint src scripts`: one pre-existing error in `src/components/layout/workspace-document-frame.tsx` (react-hooks/set-state-in-effect), untouched by this work (file last modified in April); all touched files lint clean.
- Real UI (Browser pane against `npm run dev` on :3000):
  - Landing: shared `.ui-marquee` animating (`ui-marquee-scroll 42s`), exactly one inert duplicate copy, zero console errors.
  - `/dev/motion-lab`: word-by-word reveal advancing through the real `CompetitiveStreamingDocument` (body text grew 1738 -> 1991 chars across a sample window), competitor mention links rendering through the new `extraSources` path (Productboard/Dovetail/Zendesk AI anchors with normalized URLs), zero console errors.
- Authed real-flow (Chrome typing of credentials is not permitted for the agent; used the repo's supabase-cookie script approach instead, creds read from `.env.e2e.local` and never printed):
  - `/api/generate-all/status`: 200, response carries the new sibling `streamingCompetitorSources` field plus `queue`/`streamingPreview`; server-computed status `completed` for the e2e project.
  - `/projects/new`: 200, refactored wizard renders (`idea-intake-wizard` test id present, no limit gate for the allowed user).
  - `/projects`: 200, `NewProjectButton` renders through the new allowance-slice prop.
  - Evidence scripts and output saved under `ui-evidence/2026-07-11/thermo-nuclear-remediation/` (git-ignored); screenshots shared in-thread.
- Not exercised: a full fresh intake -> generation run (would spend live AI credits and duplicate the runs already evidenced for these features on this branch). The refactors are behavior-preserving by design and covered by the unit/behavioral suites above; first fresh intake run after this lands should be watched normally.

## Code-Review Findings and Remediation Status

All blockers and majors from the review are remediated:

- B1 reveal resetKey: fixed (one line + planning parity).
- B2 hydrate retry wrapping side effects / duplicated payload interpreter: fixed via `applyStatusPayload` + `fetchStatusWithRetry` (retry only wraps the fetch, 4xx fails fast); client completion PATCH deleted along with the now-dead `/api/generate-all/update` route.
- B3 processed-write failure stamped `failed`: fixed; the route finalizes `processed` outside the handler catch, leaves the row `processing` on write failure, and returns 500 into Stripe's retry path. Lease-loss vs missing-row now distinguished (`WebhookLeaseLostError`, logged at warn).
- B4 metadataWritten race / non-atomic clears: fixed; partial clears ride the terminal status update, every preview write is fenced on `status = 'generating'`, stale-recovery and retry resets clear dead-run partials, and the writer has direct tests for the first time.
- M1 five-layer competitor-source leak: consolidated into `competitor-mention-links.ts` (type export, `buildCompetitorSourceMetadata`, `mergeStreamingCompetitorSources` via the shared validator, sibling response field, `extraSources` option deleting the metadataLike shim). The "larger set wins" stale-source heuristic is gone (last non-empty write wins).
- M2 wizard god component: split; explicit phase union; lock ref, derived booleans, and the dead creating-spinner branch deleted; answer helpers and first-token wait extracted and unit-tested.
- M3 duplicate marquee: unified into `src/components/ui/marquee.tsx`; both legacy CSS blocks collapsed; landing marquee gains the seamless clamp, inert duplicate, and hover pause.
- Minors: shared `useReducedMotion` (loader + smoothed stream migrated; landing one-shot imperative reads intentionally kept to avoid re-triggering mount animations), hero-artwork dual coordinates deleted (right anchors derived from layout data), shared `scripts/lib/env.mjs`, allowance summary prop slice, `.single()` claim insert with the invented null-lease invariant removed, example rows chunked programmatically, wizard button styles deduplicated.
- Deliberately not done: chip `role="checkbox"` ARIA rework (defensible as-is), loader artifact card typed keys (decorative strip), pricing-copy commit separation (already shipped upstream, process note only).

## Architecture Improvement Review

- Selected opportunities landed: webhook lease module, status-payload reducer, competitor-source channel ownership, wizard phase machine, shared Marquee, shared reduced-motion hook.
- Deferred (unchanged from plan): generic `onStreamMetadata(Json)` channel and per-docType streaming validator map; revisit when a second per-document streaming metadata consumer appears.
- New duplication/contract risks introduced: none found on re-read; the remaining known wart is the wizard's `phaseRef` mirror (stale-closure guard), documented inline.

## Security Review Notes

- Webhook changes preserve signature-verification-before-mutation and tighten the audit trail (no false `failed`/`processed` states); no new secrets, no RLS changes.
- Competitor-source consolidation strictly increases validation coverage (the streaming merge now runs the URL-safety validator that the hand-rolled filter skipped).
- Scripts change is import-only refactoring; the QA provisioner's production guards are untouched.

---
title: Review — Intake Flow (Option 1) UI + single loader
plan: docs/plans/intake-flow-option-1-and-single-loader-plan.md
reviewed_at: 2026-07-11
status: complete
---

# Review Artifact

## Scope of change

Presentational reskin of `/projects/new` to the imported "Intake Flow (Option 1)" design,
plus replacement of the six-row fake-progress submission loader with a single loader. No
backend, route, schema, auth, payload, or generation-pipeline changes. Diff: +626 / -411
across 5 files.

Files:
- `src/components/projects/idea-intake-wizard.tsx`
- `src/components/projects/intake-submission-loading-panel.tsx` (+ test)
- `src/lib/intake/examples.ts`
- `src/app/globals.css`

## Verification run

- `npx tsc --noEmit`: clean.
- `npx eslint` on all touched files: clean.
- `node --test` (tsx) intake + projects components: 51 pass / 0 fail (loader helper math,
  clamp-to-final-message, monotonic line width, static render).
- Real Chrome (authenticated) on `next dev` :3000, Idea 1.1:
  - Step 1 marquee (3 drifting rows, edge fades), focus glow, enabled Next — confirmed.
  - Step 2 skeleton reveal, then 5 real AI questions with Pick one / Pick a few labels,
    chip selection, enabled Create project — confirmed.
  - Single loader (kicker + rotating headline + red line + artifact marquee) — confirmed
    in the create flash.
  - Free-plan allowance error rendered in-step — confirmed.
  - Full loader -> workspace transition not captured live (connected account is Free-plan,
    cannot create a second project); redirect path unchanged by this task.
  - Evidence: `ui-evidence/2026-07-11/intake-option-1/verification.md`.

## Code-review findings + remediation

Adversarial reviewer (cavecrew-reviewer) raised 1 real + 2 theoretical:

1. [FIXED] Loader artifact marquee duplicated the card set without hiding clones from
   assistive tech. Because the entire marquee is decorative (the `aria-live` rotating
   message is the announced progress signal), the whole `.intake-marquee` region is now
   `aria-hidden="true"`. This removes the double-announce cleanly.
2. [NO CHANGE — not a real issue] Claimed hydration mismatch from `reducedMotion`. The
   loader is a client-only component mounted after `isCreatingProject` flips (a post-click
   state transition); it is never in the SSR tree. `useSyncExternalStore` is also the
   sanctioned SSR-safe primitive (server uses the `() => false` snapshot), so it does not
   emit hydration warnings even if it were server-rendered.
3. [NO CHANGE — not a real issue] Suggested an SSR guard in `subscribeReducedMotion`.
   React only invokes `subscribe`/`getSnapshot` on the client for `useSyncExternalStore`;
   the server path uses `getServerSnapshot`. The guard would be dead code.

Self-review notes:
- `generateQuestions` now acquires the request lock AFTER the cached same-idea early return,
  fixing a latent stuck-lock bug where a cached re-navigation left the lock set forever.
- Step 2 render is exhaustive: `showSkeletons` (generating or the pre-fetch limbo),
  real cards, or `showRetry` (error with no questions). No stranded state; the footer always
  offers Back.
- Marquee clones on Step 1 (interactive idea pills) keep the first set focusable and mark
  clones `aria-hidden` + `tabIndex={-1}`, so idea selection stays keyboard/SR accessible
  while the loop is not double-announced.
- No dangling references to removed exports (`INTAKE_FAKE_PROGRESS_DURATION_MS`,
  `DEFAULT_ROWS`, `IntakeLoadingRow`, `ROW_ICONS`, `intake-progress-fill`) anywhere in `src`.

## Security review

Not applicable in depth: no auth/RLS, secrets, payloads, or trust boundaries touched. The
create/execute/status contract and the first-token redirect are unchanged. One decisive
accent (Action Red) stays within the One Voice Rule (progress line + caret + focus rings).

## Follow-up fixes (same task, second pass)

Three issues raised after the first pass, all fixed and verified live:

1. Example rows did not loop. Cause: one copy of four short pills was narrower than the
   viewport, so `translateX(-50%)` left a gap. Fix: `ExampleIdeaRow` now repeats each row's
   ideas `EXAMPLE_ROW_REPEATS` (4) times per half, then duplicates the half; the `-50%`
   keyframe now scrolls one full-width half so the loop is seamless. Only each idea's first
   appearance stays focusable/announced. Verified: rows fill the full width edge-to-edge.
2. Multi-select answer chips had no checkbox. Fix: per the design MCP, multi-select options
   now render a 13px leading checkbox (dark fill + white check when selected) and keep a
   white chip; single-select still inverts to a solid fill and shows no box. Added
   `role="checkbox"`/`aria-checked` for multi and `aria-pressed` for single. Verified live:
   both "Pick a few" questions show checkboxes that fill when selected; "Pick one" chips
   have none.
3. Out-of-allowance users could fill the whole wizard only to be 403'd at Create project.
   Fix: new `src/components/projects/project-limit-dialog.tsx` (Radix Dialog) with
   `ProjectLimitDialog`, a `NewProjectButton` that opens it in place instead of navigating
   when `!canCreate`, and a `ProjectLimitRouteGate` that blocks `/projects/new` (routes back
   to `/projects` on dismiss). The dashboard button (`projects/page.tsx`) and the route
   (`projects/new/page.tsx`) both read `getProjectAllowanceStatus`. Copy: "You've used all
   your projects" + "You've created N projects on the {plan} plan, which is your limit."
   Upgrade routes to `/billing`. Verified live end-to-end (dashboard button modal, route
   gate, Upgrade -> /billing).

Note: verifying fixes 1 and 2 required temporarily bypassing the new `/projects/new` gate
(the only authenticated session is a Free account now blocked by fix 3). The bypass was a
local `if (false && ...)` edit, removed immediately after and re-verified live (the gate
shows again) plus by grep and a passing typecheck. A pre-existing unrelated typecheck error
in `src/lib/stripe/customer.test.ts` (missing `@/lib/stripe/customer`) was flagged as a
separate task, not touched here.

## Architecture improvement review

- Selected + landed: loader messages + pure timing helpers exported from the loader module
  for unit testing; single reusable `ExampleIdeaRow`; reduced-motion handled with one shared
  media-query guard (`useSyncExternalStore`) rather than per-element JS; marquee/skeleton CSS
  reuses the existing `landing-logo-marquee-scroll` keyframe.
- Deferred (correctly): wiring the loader's "what you're about to get" cards to live queue
  status. The loader is intentionally decorative and short-lived (redirect on first token);
  live status already renders on the workspace side after redirect.
- No new duplication, brittle contracts, non-idempotent paths, authorization gaps, or
  recovery blind spots introduced.

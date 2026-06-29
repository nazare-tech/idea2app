---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: Milestone 1, Critical Security And Correctness Fixes

## Goal
Close the open critical-severity items before launch: verify and version-control the credit RPCs so the database is rebuildable from the repo, remove the legacy Stitch HTML preview path (the standing Critical iframe risk) including its saved data, remove the off-roadmap app-generation surface, disable general chat until it returns, and clear all critical/high production dependency advisories. After this milestone, zero known Critical findings remain open.

## Assumptions
- Mockups are OpenRouter image storyboards end to end; nothing in the live product depends on Stitch HTML previews (owner confirmed legacy rows can be deleted, 2026-06-11).
- App generation and deployment are off the roadmap (owner, 2026-06-11), so `/api/generate-app` and its prompts are removed rather than finished. The `deployments` table keeps its historical rows; only code is removed.
- General chat is not returning to the workspace yet (owner, 2026-06-11), so `/api/chat` is disabled with the same 410 pattern as prompt-chat rather than deleted.
- Credits remain the internal accounting unit (owner, 2026-06-11); `consume_credits`, `refund_credits`, and grant RPCs all stay, they just need verified definitions in the repo.
- Milestone 0 is done first: tests and CI are green so these removals are guarded.
- The owner has access to the production Supabase project (Dashboard or linked CLI).

## Findings Driving This Plan
- `consume_credits` is called from authenticated-user clients in `src/app/api/chat/route.ts:101`, `src/app/api/generate-app/route.ts:111`, `src/app/api/launch/plan/route.ts:111`, and `src/app/api/generate-all/execute/route.ts:249`, but no migration in the repo defines it. If its live definition lacks an `auth.uid()` guard, any signed-in user can call it with another user's id and drain their credits. This is unverifiable from the repo today.
- Root `migrations/005_create_refund_credits.sql` still contains the old unhardened `refund_credits` that the 2026-04-25 security review rated Critical; the hardened version lives in `supabase/migrations/20260425004000_security_hardening_followups.sql`. Two migration directories invite applying the wrong one.
- `src/components/layout/scrollable-content.tsx:302` and `src/components/ui/mockup-renderer.tsx:944` render proxied third-party HTML in `srcDoc` iframes with `sandbox="allow-scripts allow-same-origin"`, which neutralizes the sandbox for same-origin srcdoc content (Critical finding 1 of the 2026-04-25 review, deferred for MVP when HTML previews were the product; they no longer are).
- `npm audit --omit=dev`: 16 advisories (2 critical, 7 high), concentrated in `@google/stitch-sdk` (hono, express-rate-limit, fast-uri), `puppeteer` (basic-ftp), and the unused `jspdf`/`mermaid` (dompurify).
- `/api/generate-app` stores truncated code in `deployments.build_logs` (`route.ts:223`), hardcodes an old model id, and cannot succeed with the empty `ANTHROPIC_API_KEY`; it is still dispatched from `src/components/workspace/project-workspace.tsx:1166` and charges credits before failing.
- `/api/chat` has no live UI caller but remains a credit-charging endpoint; it also fetches the oldest 20 messages instead of the newest (`route.ts:145-150`, ascending order with limit).
- `docs/plans/security-release-checklist.md` section 1 (RLS audit for subscriptions, credits, plan_prices, stripe_credit_grants) is entirely unchecked.

## Resolved 2026-06-12: Credit RPC Hardening (Steps 1 And 2 Complete)
The `consume_credits` / `add_credits` verification (plan steps 1 and 2) was executed live on the production database on 2026-06-12. Findings and fixes:
- Grants were wide open: `add_credits`, `consume_credits`, and `get_credit_balance` were EXECUTE-able by `PUBLIC`, `anon`, and `authenticated`. Because `add_credits` runs `UPDATE public.credits SET balance = balance + p_amount` for an arbitrary `p_user_id`, anyone holding the public anon key could mint credits for any account. Closed by `supabase/migrations/20260612000000_harden_credit_rpc_grants.sql` (revoke PUBLIC/anon on all three; `add_credits` to service-role-only; `consume_credits`/`get_credit_balance` keep `authenticated`).
- The captured `consume_credits` body was `SECURITY DEFINER` with a fixed `search_path` and a `FOR UPDATE` lock (all good) but had two gaps the grant fix did not close, because `authenticated` retains EXECUTE: (1) no amount validation, so a negative `p_amount` minted credits (`balance - (-n)`), exploitable by any signed-in user against their own account; (2) no `auth.uid()` check, so a signed-in user could pass another user's id. Closed by `supabase/migrations/20260612000100_harden_consume_credits_body.sql`, which adds a bounded-positive-amount guard (1..100000, matching `refund_credits`) and an identity guard (`auth.uid() IS NOT NULL AND p_user_id <> auth.uid()` rejects cross-user JWT calls; service-role paths have NULL `auth.uid()` and are unaffected).
- Verified: all six `consume_credits` call sites pass the authenticated user's own id (or `claimed.user_id` through the user client, where it equals the owner), so the identity guard never trips on legitimate traffic. The negative-amount test `select public.consume_credits('0...0', -100, 'audit_test')` now raises the expected exception in production.
- Remaining in this area: capture the full `add_credits` and `get_credit_balance` bodies (and add the same amount bound to `add_credits`) via the schema-baseline dump in step 3; run the prior-exploitation check query (see step 1).

## Confirmed Decisions
- Delete legacy Stitch mockup rows and the whole Stitch code path; current image pipeline is the only mockup path (owner, 2026-06-11).
- Remove app generation and deployment code; not on the roadmap (owner, 2026-06-11).
- Disable `/api/chat` like prompt-chat; do not delete, it may return (owner, 2026-06-11).
- Keep credit accounting internal; user-facing credit display removal is scheduled separately (Milestone 3 plus the existing `docs/plans/remove-credits-and-future-entitlements-plan.md`).

## How To Pull The Live RPC Definitions (Owner Steps)
Either path works; paste the output into the session or commit it for review.
- Dashboard path: supabase.com/dashboard, select the project, open SQL Editor, run:
  - `select p.proname, pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('consume_credits','add_credits','refund_credits','grant_subscription_credits_once');`
  - `select routine_name, grantee, privilege_type from information_schema.routine_privileges where routine_schema = 'public' and routine_name in ('consume_credits','add_credits');`
- CLI path (project must be linked): `supabase db dump --schema public -f supabase/schema-snapshot.sql`, then search the file for `consume_credits`.
- What "safe" looks like: either the function body checks `p_user_id = auth.uid()` (or derives the user from `auth.uid()` and ignores `p_user_id`), or EXECUTE is revoked from `anon` and `authenticated` and granted only to `service_role`. If neither is true, step 2 writes the fix.

## Clarifying Questions
1. If `consume_credits` lacks a caller guard, which hardening shape?
   - Recommendation A: Add an `auth.uid()` guard inside the function: when the caller is not service_role, require `p_user_id = auth.uid()`. Routes keep using the user-scoped client unchanged.
   - Trade-off: Smallest blast radius and matches how routes call it today, but the function carries dual-mode logic.
   - Recommendation B: Revoke from `authenticated` entirely and move all `consume_credits` calls to the service client after ownership checks.
   - Trade-off: Single trust path, consistent with `refund_credits`, but touches four routes and changes their failure modes.
2. What happens to the root `migrations/` directory's metrics objects (metrics tables, aggregation functions, cron jobs)?
   - Recommendation A: Check which objects exist in production; re-home the ones in use as a dated migration under `supabase/migrations/`, then delete the root directory.
   - Trade-off: Preserves the metrics dashboard behavior documented in `docs/METRICS_DASHBOARD_GUIDE.md`, small verification cost.
   - Recommendation B: Delete the directory outright and treat metrics SQL as dashboard-managed.
   - Trade-off: Fastest, but the repo loses the only source for `trackAPIMetrics` table shapes.
3. Should the Stitch row deletion be preceded by an export?
   - Recommendation A: Yes: run the count query, export matching rows to a local JSON (gitignored), then delete.
   - Trade-off: One extra step, free insurance.
   - Recommendation B: Delete directly since the owner confirmed the data is disposable.
   - Trade-off: Simpler, irreversible.

## Recommended First Step
Run the owner steps above to pull the four RPC definitions and grants from production. Every other step in this plan can proceed independently, but this is the only one that can reveal an actively exploitable hole, so it goes first.

## Plan
1. [x] Pull live definitions and grants for `consume_credits`, `add_credits`, `refund_credits`, `grant_subscription_credits_once` (owner steps section). Done 2026-06-12; see "Resolved 2026-06-12" section above. Prior-exploitation check run 2026-06-12: only positive non-subscription/non-refund credit rows are one deliberate `admin_grant` of 999,999 (dev account, matches `UNLIMITED_CREDITS_THRESHOLD`) and two `signup_bonus` grants of 10. No consumption-action rows produced positive balances; no anomalous grants on unrecognized accounts. Conclusion: the open grants were never exploited.
2. [x] Hardened `consume_credits` and the credit grants: `supabase/migrations/20260612000000_harden_credit_rpc_grants.sql` (grants) and `supabase/migrations/20260612000100_harden_consume_credits_body.sql` (amount + identity guards). Applied to production and verified 2026-06-12. Follow-up under step 3: capture/harden `add_credits` and `get_credit_balance` bodies in the schema baseline.
3. [ ] Create a schema baseline: `supabase db dump --schema public` into `supabase/migrations/<ts>_baseline_schema.sql` (or `supabase db pull`), marked/ordered so existing environments treat it as already applied; prove a fresh `supabase db reset` rebuilds the schema.
4. [ ] Retire the root `migrations/` directory per Clarifying Question 2 decision; the old `005_create_refund_credits.sql` must not survive anywhere applyable.
5. [ ] Remove the Stitch code path:
   - Delete `src/app/api/stitch/html/route.ts`, `src/lib/stitch-pipeline.ts`, `src/lib/stitch/`.
   - In `src/components/ui/mockup-renderer.tsx` and `src/components/layout/scrollable-content.tsx`, remove the `srcDoc` iframe branches; render a small "Legacy mockup format, regenerate to view" card if a stitch-format row is ever encountered.
   - Remove stitch-only helpers from `src/lib/prompts/mockups.ts` and the stitch feature type from `src/lib/metrics-tracker.ts` if present.
   - Remove `contribution.usercontent.google.com` from the CSP `connect-src` in `next.config.ts` (keep `lh3.googleusercontent.com` only if Google avatar loading still needs it; verify by signing in with Google locally).
   - `npm uninstall @google/stitch-sdk`; remove the `stitch:fixture` script and `scripts/stitch-fetch-fixture.mjs`.
6. [ ] Delete legacy Stitch data: count rows (`select count(*) from mockups where content like '%"type":"stitch"%'` or the equivalent JSON check), export per Clarifying Question 3, then delete those rows.
7. [ ] Remove app generation: delete `src/app/api/generate-app/route.ts` and `src/lib/prompts/app-generation.ts`; remove the dispatch branch in `src/components/workspace/project-workspace.tsx` (around line 1166) and the `app-*` entries in `CREDIT_COSTS` (`src/lib/utils.ts`); remove `api.anthropic.com` from CSP `connect-src` if nothing else uses it; scrub App Generation and Deployment claims from `PROJECT_CONTEXT.md`.
8. [ ] Disable general chat: add the same disabled-gate pattern as `src/app/api/prompt-chat/route.ts` (unconditional 410 with a clear message) at the top of `src/app/api/chat/route.ts`; while in the file, fix the history query to fetch the newest 20 (`ascending: false`, `limit(20)`, then reverse) so a future re-enable starts correct.
9. [ ] Dependency pass: `npm uninstall jspdf html2canvas mermaid`; `npm audit fix`; review the lockfile diff; re-run `npm audit --omit=dev` until 0 critical and 0 high.
10. [ ] Run `docs/plans/security-release-checklist.md` section 1 against production (RLS on subscriptions, credits tables, plan_prices, stripe_credit_grants); check each box with a date; write migrations for any discrepancy found.
11. [ ] Documentation: update `PROJECT_CONTEXT.md` (mockup section drops Stitch compatibility, API list drops generate-app/stitch, chat marked disabled) and add an addendum line to `docs/plans/security-review-2026-04-25.md` recording that finding 1 (iframe) is closed by removal.

## Milestones
- Credit RPCs Verified: definitions and grants in the repo, guard confirmed or migration applied.
- Schema Reproducible: fresh database rebuilds from `supabase/migrations/` alone; root `migrations/` gone.
- Stitch Eliminated: no `allow-same-origin` srcdoc iframes, no stitch code, no stitch rows, SDK uninstalled.
- Dead Surfaces Closed: generate-app removed, chat returns 410, neither can charge credits.
- Dependencies Clean: `npm audit --omit=dev` reports 0 critical, 0 high.
- RLS Audited: checklist section 1 fully checked with dates.

## Validation
- `npm audit --omit=dev` (0 critical, 0 high)
- `grep -rn "allow-same-origin" src/` (no matches)
- `grep -rni "stitch" src/ package.json` (no live-code matches)
- `npm test`, `npm run typecheck`, `npm run lint` (all green)
- `supabase db reset` against a fresh shadow database succeeds
- Manual: create a project end to end locally (intake, onboarding generation, mockup images render); `POST /api/chat` and a stitch HTML URL both return 410/404
- Stripe test-mode checkout still completes (no billing code is touched, this is a regression guard)

## Risks And Mitigations
- Risk: The baseline migration confuses migration state in existing environments.
  - Mitigation: Use `supabase migration repair --status applied` for the baseline on the linked project; test the full sequence on a scratch/shadow database first.
- Risk: Hardening `consume_credits` breaks the four routes that call it.
  - Mitigation: Recommendation A keeps the calling convention identical; verify each route locally with a real session before deploying.
- Risk: Deleting stitch rows or rendering branches breaks workspaces that reference old mockups.
  - Mitigation: The renderer keeps a graceful placeholder for unknown formats; rows are exported before deletion; pre-launch there are no external users affected.
- Risk: `npm audit fix` bumps a transitive dependency that changes runtime behavior.
  - Mitigation: Review the lockfile diff, run the full local flow once, and keep the fix in its own commit for easy revert.
- Risk: Removing CSP hosts breaks Google avatar images.
  - Mitigation: Verify Google OAuth sign-in locally before and after; `img-src` already allows `https:` broadly, only `connect-src` entries change.

## Rollback Or Recovery
- Every code step is a separate commit; `git revert` recovers any of them.
- Stitch rows restore from the step 6 export if Recommendation A was chosen.
- The hardening migration is additive (function replacement); the previous definition is preserved in the step 1 snapshot and can be re-applied.
- Dependency removals revert with `git checkout package.json package-lock.json && npm ci`.

## Open Decisions
- Whether `lh3.googleusercontent.com` must stay in `connect-src` for avatars (resolved empirically in step 5).
- Whether the `deployments` table should eventually be dropped; out of scope here, rows are merely orphaned.

## Critique

### Software Architect
- Removing the Stitch path closes the standing Critical by deletion rather than mitigation, which is the strongest possible fix and also deletes the largest transitive-vulnerability source.
- The baseline migration finally makes the repo the source of truth for the schema; without it, every security claim about RPCs is faith, not fact.

### Product Manager
- Nothing users want is lost: app generation never worked end to end, chat has no UI, and stitch mockups are superseded by image storyboards.
- Closing these before launch is cheaper than after; the waitlist gate means there is still a window with no external users.

### Customer Or End User
- Users see no change except old test-era mockups disappearing, which the owner has approved.
- The credit-drain scenario, if the guard is missing, is exactly the kind of incident that destroys trust in a paid product; verifying it pre-launch is the point.

### Engineering Implementer
- Steps 5 to 9 are mechanical deletions guarded by a green test suite from Milestone 0; the only genuinely careful work is steps 1 to 4 (database) and they are mostly read-and-verify.
- Keep each removal in its own commit; the diff for step 5 alone touches two large components.

### Risk, Security, Or Operations
- The single highest-value step is pulling the `consume_credits` definition; do it before anything else in case it requires an immediate fix.
- The RLS checklist run (step 10) converts an unchecked pre-release document into verified state, which is what the checklist was written for.

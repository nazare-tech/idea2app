# Plan: Landing Idea Auth Handoff

## Goal
Preserve a landing-page idea through sign in or signup, then take the user directly into the Idea Intake Wizard's Step 2 questions after authentication.

## Assumptions
- The auth modal should open in Sign In mode from the landing `Validate idea` CTA.
- Signup must support both immediate Supabase sessions and email-confirmation flows.
- Raw idea text must never be placed in a URL.
- No database migration or new dependency is required.
- Existing dirty files outside this implementation are user-owned and must not be reverted.

## Clarifying Questions
1. Resolved: Sign In should be the default auth mode for `Validate idea`.
2. Resolved: Signup should support both immediate-session and email-confirmation deployments.
3. Resolved: If `pending_intakes` save fails, continue with a same-tab `sessionStorage` fallback.

## Recommended First Step
Add focused redirect/autostart coverage around `/projects/new?intake=<token>&autostart=1`, then implement the URL and wizard behavior against that contract.

## Plan
1. Add coverage for safe redirects preserving `autostart=1`.
2. Update landing idea capture to store the draft, attempt `pending_intakes`, and route unauthenticated users to Sign In with a safe `next` path.
3. Update `/projects/new` and `IdeaIntakeWizard` to preserve/pass `autostart` and auto-generate Step 2 questions after a recovered idea.
4. Update auth signup handling so immediate sessions invoke the normal success navigation, while confirmation-required signup keeps the check-email state.
5. Run focused tests, typecheck/lint as feasible, and do manual/browser verification where local auth dependencies allow it.
6. Record code review and security review notes, then remediate any findings.

## Milestones
- Branch and plan: feature branch exists and this plan is tracked.
- Handoff contract: redirect URL preserves token and `autostart`.
- Wizard behavior: recovered valid idea auto-generates questions once and moves to Step 2.
- Signup behavior: immediate-session signup navigates; confirmation signup still waits for email callback.
- Verification: tests and review notes are complete.

## Validation
- `npm test -- src/lib/safe-redirect.test.ts`
- `npm run typecheck`
- Manual browser checks for landing auth modal, sign-in redirect, signup redirect, fallback recovery, and missing-token recovery when local Supabase/auth configuration permits.

## Risks And Mitigations
- Duplicate question generation: gate autostart with a ref so it only runs once per page load.
- Idea loss on auth handoff: keep both durable pending-token storage and same-tab `sessionStorage`.
- Unsafe redirects: continue using `sanitizeInternalRedirect` and avoid placing raw ideas in URLs.
- Email confirmation delay: rely on `/callback?next=...` with the pending token preserved.

## Rollback Or Recovery
Revert the branch changes to restore the prior landing behavior. Existing pending intake records are additive and expire naturally.

## Open Decisions
- None.

## Implementation Status
- [x] Branch created as `codex-landing-idea-auth-handoff` after local Git refs blocked the requested `codex/...` namespace.
- [x] Handoff helper and focused tests added.
- [x] Landing `Validate idea` now opens Sign In with `next=/projects/new?...`.
- [x] Signup now continues immediately when Supabase returns an active session.
- [x] `/projects/new` preserves `autostart=1` through auth redirects.
- [x] Idea Intake Wizard auto-generates Step 2 questions once after idea recovery.
- [x] Review and security notes written to `plans/landing-idea-auth-handoff-review.md`.
- [x] Verification completed with focused tests, typecheck, lint, and Puppeteer smoke checks.

## Critique

### Software Architect
- The change should reuse the existing pending-intake and safe-redirect architecture instead of adding a parallel draft system.

### Product Manager
- Opening Sign In first favors returning users, but signup remains one click away and keeps the same idea handoff.

### Customer Or End User
- Auto-starting Step 2 removes repeated typing, but recovery messaging must be clear when the idea cannot be restored.

### Engineering Implementer
- The riskiest edge is coordinating async pending-token load with auto-question generation; state transitions need to be tightly guarded.

### Risk, Security, Or Operations
- The safe path is opaque token plus session storage fallback. Raw idea text must remain out of query strings and logs where possible.

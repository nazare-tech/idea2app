# Research Inbox Implementation Review

## Outcome

The project-agnostic Research Inbox is implemented at `/research`, seeded with a sanitized Maker Compass Last30Days curation. It supports source/status/search filters, seen/save/archive state, user-scoped local persistence, explicit-feedback ranking, draft generation, browser preference, and a human-confirmed posting handoff.

The implementation is not marked complete in plan metadata because required authenticated real-Chrome evidence could not be captured. The configured test session failed with an invalid Supabase refresh token. No auth stub, fixture, or bypass was introduced.

## Delivered Scope

- Provider-neutral research item and state contracts.
- Ten paraphrased curated items from a 56-item raw research pass; X is visibly unavailable for this pass.
- Stable existing-row order and bounded explicit “Find more in this research” batches.
- Transparent tag transfer: replied +8, saved +4, archived -6.
- User-and-workspace-scoped local storage for message state and browser preference.
- Authenticated `POST /api/research/reply` with paid hosted OpenRouter generation.
- Optional exact-user, non-production Codex CLI generation using `spawn`, no shell, bounded output/time, `/tmp` working directory, and an allowlisted child environment.
- Manual copy/open post handoff with exact draft hash, unknown-outcome persistence, retry block, and user reconciliation.
- Dashboard navigation and system/setup/API/backend-history documentation.

## Verification Evidence

- `npm test`: 758 passed, 0 failed.
- `node --import tsx --test src/lib/research/state.test.ts src/lib/read-request-body.test.ts`: 7 passed, 0 failed after security hardening.
- `npm run typecheck`: passed after final code changes.
- Focused ESLint for the route, research modules, and client: passed.
- `git diff --check`: passed.
- `npm run build`: passed outside the sandbox; `/research` and `/api/research/reply` appear in the production route manifest and the chunky/vendor guard passed.
- Build retains one Next/Turbopack NFT warning because the server route contains a dynamic local CLI process spawn. Hosted production cannot execute that branch.

## Real UI Verification

Attempted the required real Chrome flow against the local app. Supabase rejected the configured test session because its refresh token was not found. A clean retry returned to `/auth` with the same blocker.

Consequences:

- No desktop or mobile screenshots were captured.
- Persistence, filter, adaptive reveal, and post-confirmation interactions were not browser-proven.
- The dev server remains available for the maintainer to retry after refreshing `.env.e2e.local` credentials/session state.

## Fresh-Eyes Pass 1 — Product And UX

Finding: selecting a named browser without a connector marked the item as an unknown post even though nothing opened.

Remediation: named-browser mode now copies the draft and shows an actionable connector message without recording an attempt. Unknown state is written only immediately before current-browser opening.

Finding: saved state lacked a visible label change and browser selection reset on reload.

Remediation: the action changes from “Save” to “Saved,” and the browser preference persists in the authenticated workspace namespace.

## Fresh-Eyes Pass 2 — Architecture And Operations

Finding: the initial CLI adapter inherited the repository working directory and full server environment.

Remediation: the child runs in `/tmp` and receives only Codex/auth, shell, proxy, and certificate variables. Application provider and Supabase secrets are not forwarded.

Finding: dynamic process spawning makes Next’s NFT tracer conservatively warn about project tracing.

Decision: accepted for the local-only operator adapter because the production build succeeds and production execution is impossible. A separate local companion service is the clean follow-up before commercial deployment.

## Security Review

- Authentication: required before rate-limited or paid generation.
- Authorization: local Codex requires non-production plus exact `RESEARCH_CODEX_OPERATOR_USER_ID` match.
- Input: production same-origin check, 8 KB streaming cap, type/length bounds, sanitization, secure prompt delimiters.
- Prompt injection: source text is explicitly untrusted; no source content becomes shell syntax.
- Process execution: fixed arguments, `shell: false`, bounded output, 90-second hard kill, restricted environment and working directory.
- Abuse/cost: independent per-user and per-IP hourly limits; paid-plan gate for hosted model use.
- XSS: React text rendering only; no user HTML or `dangerouslySetInnerHTML`.
- External action: no platform credentials and no automatic hosted post; success requires explicit user confirmation.
- Errors: client responses do not expose process stderr, stack traces, tokens, or provider internals.
- Secrets: no hardcoded credentials; local environment files are ignored by Git.

`npm audit --omit=dev --audit-level=high` reports six high and one moderate advisory in existing production dependencies, including the pinned Next version and transitive packages. They were not changed in this feature because a broad dependency upgrade needs its own regression plan. Treat this as a deployment remediation item, not as a Research Inbox-specific regression.

## Remaining Remediation

1. Repair the real Supabase test account/session, then capture authenticated 1440×900 and 390×844 evidence for all critical interactions.
2. Upgrade the audited production dependencies under a dedicated compatibility pass.
3. Move local Codex and named-browser control into an audited companion service before selling automated local execution.
4. Replace finite seed reveal with durable ingestion/jobs before renaming the control to a live new crawl.
5. Add Supabase-backed state if multi-device sync becomes part of the commercial promise.


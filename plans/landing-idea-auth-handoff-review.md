# Review: Landing Idea Auth Handoff

## Scope
- Landing idea CTA handoff URL construction.
- Auth modal/signup continuation behavior.
- `/projects/new` autostart redirect preservation.
- Idea Intake Wizard pending-token/sessionStorage recovery and Step 2 autostart.

## Verification
- `node --import tsx --test src/lib/landing-intake-handoff.test.ts src/lib/safe-redirect.test.ts`: pass.
- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass with 13 pre-existing warnings outside this change.
- Puppeteer smoke check: typed landing idea opens Sign In modal with `next=/projects/new?intake=<opaque>&autostart=1` and same-tab draft stored.
- Puppeteer fail-safe check: forced `POST /api/intake/pending` failure opens Sign In with `next=/projects/new?autostart=1`, preserves `sessionStorage`, and shows fallback warning.

## Code Review Findings
- Finding: Blank landing CTA should not trigger Step 2 recovery messaging. Severity: medium. Status: fixed by only adding `autostart=1` when idea text is present.
- Finding: Duplicate Step 2 generation could happen across rerenders. Severity: medium. Status: fixed with `autoStartAttemptedRef`.
- Finding: Source attribution for sessionStorage fallback could be marked as dashboard. Severity: low. Status: fixed by treating `autoStartQuestions` as landing source.

## Security Review Findings
- Finding: Raw idea text in URL would expose user input in browser history and logs. Severity: high. Status: avoided; only opaque tokens and `autostart=1` are used.
- Finding: Open redirects through auth `next` paths. Severity: high. Status: mitigated by existing `sanitizeInternalRedirect`/`getSafeAuthRedirect`, with focused safe redirect tests passing.
- Finding: Pending token reuse after project creation. Severity: medium. Status: unchanged from existing route; `create-from-intake` verifies unclaimed/non-expired tokens and claims them after creation.

## Remediation Checklist
- [x] Prevent blank `Validate idea` clicks from setting `autostart=1`.
- [x] Guard auto-question generation so it runs once.
- [x] Keep landing-source attribution for pending-token and same-tab fallback flows.

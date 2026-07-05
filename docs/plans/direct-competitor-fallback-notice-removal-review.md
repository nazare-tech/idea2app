# Review: Direct Competitor Fallback Notice Removal

## Summary

The Direct Competitors fallback notice is no longer generated as a module banner, no longer requested from the AI prompt, and is filtered from existing saved Direct Competitors markdown when rendered through module or markdown fallback paths. Fallback competitor candidates remain visible.

## Verification Run

- `node --import tsx --test src\lib\competitive-analysis-v2.test.ts src\lib\competitive-analysis-prompt.test.ts src\lib\analysis-pipelines.test.ts src\components\analysis\competitive-analysis-document.test.tsx`
  - Result: passed, 30 tests.
- `npm.cmd run typecheck`
  - Result: passed.
- `npm run typecheck`
  - Result: blocked by local PowerShell execution policy for `npm.ps1`; rerun successfully with `npm.cmd`.
- Local route check:
  - Route: `http://127.0.0.1:3000/landing-preview/market-research?active=market-research-direct-competitors`
  - Result: served HTML contains `Direct Competitors` and `Productboard`.
  - Result: served HTML does not contain `Verified direct competitor profiles`, `Live competitor research was unavailable`, `evidence-limited candidates`, `Verify company fit`, or `Live competitor profiles unavailable`.
- Screenshot attempt:
  - Attempted with Google Chrome headless at 1440x1200.
  - Files created under `ui-evidence/2026-07-05/direct-competitor-notice-removal/`, but the captured images are blank because this landing-preview route stays hidden until client-side crop measurement completes under the available headless capture path.
  - Not used as successful visual evidence.

## Code Review Findings

- No blocking findings.
- Tests cover new prompt behavior, parser display sanitization, module rendering without the banner, markdown fallback rendering for existing saved notice text, and empty/unusable live-research prompt wiring.
- The landing sample now uses H3 competitor profiles instead of the old unavailable-profile paragraph.

## Security Review Findings

- No auth, RLS, secret, payment, webhook, persistence, or external-call behavior changed.
- The display sanitizer is scoped to Direct Competitors blocks and preserves field-level uncertainty such as `Verification needed`.

## Architecture Improvement Review

- Selected opportunity landed: Direct Competitors fallback disclaimer filtering is centralized in `src/lib/competitive-analysis-v2.ts` and reused by renderer fallback paths.
- Deferred opportunity remains deferred: no data migration rewrites saved `analyses` rows because this is a presentation issue and render-time filtering covers existing projects without touching user data.
- No new authorization gaps or recovery blind spots found.
- Small residual duplication remains in tests by design: old notice strings are repeated as fixtures to prove filtering.

## Remediation Status

- Complete.

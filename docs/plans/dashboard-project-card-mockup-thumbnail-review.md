# Review: Dashboard Project Card Mockup Thumbnail

## Outcome

Implemented and verified. Every `/projects` card now reserves a fixed 16:9 preview area, shows the newest canonical mockup's Version A when available, and otherwise shows a stable empty state. Mockup-query failures are distinguished as “Preview unavailable.”

## Plan Evaluation

- Opposite-model reviewer: local Claude Code, Opus 5 via `opus`, effort medium, tools disabled.
- Evaluations: `dashboard-project-card-mockup-thumbnail-plan-eval.md` and `dashboard-project-card-mockup-thumbnail-plan-eval-v2.md`.
- Accepted: reconstruct authenticated proxy URLs from project-owned Storage paths; select Version A by label from the deterministic newest row; isolate presentation and derivation; verify fixed-aspect contained images in real Chrome.
- Rejected/deferred: A/B/C controls were explicitly deferred by the user; a stored thumbnail derivative adds schema/pipeline/backfill scope and remains a measured performance follow-up.

## Review Findings And Remediation

1. Query failures originally collapsed into the no-mockup state. Remediated by logging the Supabase error and rendering a distinct unavailable state.
2. The existing no-credit fixture uses controlled inline SVGs rather than Storage. Remediated with an exact model, project-scoped path, and SVG-prefix allowlist; persisted URLs remain untrusted for all real mockups.
3. Full-resolution images still pass through the authenticated proxy. Accepted for this iteration because loading is lazy, decoding is async, priority is low, and the proxy caches privately for five minutes. A derivative should be considered if measured dashboard volume warrants it.

## Verification

- Focused Node tests: 14 passed after remediation.
- Full `npm test`: 711 passed after final review remediation.
- `npm run typecheck`: passed after remediation.
- Targeted ESLint across changed source and test files: passed after remediation.
- `git diff --check`: passed after remediation.
- Sweep check: not due (`node scripts/sweep-check.mjs --json`).

## Real UI Evidence

- Authenticated route: `/projects`, using existing account data only; no generation endpoint called and no credits spent.
- Desktop effective viewport: 1349 × 1191. Two-column cards rendered contained Version A previews with readable title, description, date, and delete affordance.
- Narrow effective CSS viewport: 487 × 1055. Cards collapsed to one column; the 449 × 252 preview retained its aspect and containment.
- Existing data contained 23 projects and all 23 had canonical previews. Ten near-viewport images loaded lazily and returned HTTP 200; no real empty-state screenshot was fabricated. The empty and unavailable branches are covered by render tests.
- Card navigation opened the expected project workspace. Application console remained free of app errors.
- Screenshots:
  - `ui-evidence/2026-08-09/project-card-mockup-thumbnail/projects-desktop-generated.png`
  - `ui-evidence/2026-08-09/project-card-mockup-thumbnail/projects-narrow-generated.png`

## Fresh-Eyes, Architecture, And Security Review

- Fresh-eyes passes confirmed the native image is decorative (`alt=""`), lazy, async-decoded, low priority, and falls back without shifting the card.
- Existing card navigation, warmup, deletion gating, and copy are preserved.
- Data access is one bounded server-side query against already-owned project IDs. Derivation filters the same explicit authorized ID set before creating any URL.
- Real images continue through the existing authenticated ownership-checking proxy. No public Storage URL, cross-project path, secret, external request, generation call, or mutation was introduced.
- Documentation and backend change history were updated in the same change.

## Remaining Follow-Up

- Add a generated thumbnail derivative only if production measurements show the lazy full-resolution proxy path is materially expensive.

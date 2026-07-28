# Commit Sweep — 2026-07-28
Same-agent thermonuclear cross-commit audit of f00e7e13..HEAD (25 commits, 80 files, +4,764/-1,940, net +2,824 code lines vs the 1,000 threshold).
Themes: landing v2 (scroll-driven feature section, testimonial band, hero reel arc); four new standalone image/asset scripts; mockup brand-direction bank groundwork; mobile workspace chrome and keyboard avoidance; portable Maker Compass skill; ci-operator/ui-verification skill consolidation.
Method: single-agent pass applying thermo-nuclear-code-quality-review lenses to the range, concentrating on cross-commit duplication among the four new scripts, docs/systems freshness, and per-commit review coverage gaps; findings verified against HEAD before any edit.
Verified fixed this sweep: divergent duplicate escapeHtml across two scripts (merged into scripts/lib/html.mjs), two scripts missing from the scripts/README.md inventory.
Per-commit cross-model reviews covered every code commit except two disclosed input_too_large failures (50f8523c, 14914fb6); no duplicate range reviewer was run per policy.
Triage table at the bottom; marker advanced to the post-remediation code HEAD.
---

## Range

`f00e7e13..HEAD` — 25 commits, 80 files, +4,764 / -1,940, net +2,824 code lines.

Largest contributors: `docs/plans/mockup-brand-bank.json` (+617, generated), `mockup-brand-bank-preview.html` (+574, generated), `scripts/build-mockup-brand-bank.mjs` (+550), `scripts/build-mobile-screen-gallery.mjs` (+426), `src/components/landing/feature-scrollytelling.tsx` (+439), `src/lib/landing-feature-stage.ts` (+418), `scripts/normalize-hero-reel-cutouts.mjs` (+348).

## Findings

### S1 — MAJOR, maintainability — divergent duplicate `escapeHtml` (FIXED)

`scripts/build-mobile-screen-gallery.mjs:89` and `scripts/build-mockup-brand-bank.mjs:396` each defined a private `escapeHtml`, introduced in separate commits (`a2c90043`, `14914fb6`). They were not identical: the gallery escaped `'` to `&#39;`, the brand bank escaped only `& < > "`.

This is the exact failure mode a sweep exists to catch. No single-commit review can see it, because each commit contained only one of the two copies. The divergence is latent rather than live (both scripts render hardcoded constants, not user input), but the weaker copy would become a real escaping hole the first time a value landed inside a single-quoted attribute.

`scripts/lib/` already held `env.mjs` with a header stating it exists "so each script does not grow its own loader", so the precedent and the destination were both already established and had simply been ignored twice.

**Fix:** extracted `scripts/lib/html.mjs` with the stricter five-character version; both scripts import it. Regenerating the brand bank produced byte-identical output, confirming the consolidation is behavior-preserving.

### S2 — MINOR, docs freshness — new scripts missing from the inventory (FIXED)

`scripts/README.md` documents itself as the script inventory and was updated in this range for `build-mobile-screen-gallery.mjs` and `normalize-hero-reel-cutouts.mjs`, but `recolor-mockup-skeletons.mjs` and `build-mockup-brand-bank.mjs` (both added in `14914fb6`) were never listed. Self-healing rule violation introduced inside the range.

**Fix:** both added with purpose and invocation.

### S3 — MAJOR, process — two commits shipped without cross-model review (RECORDED, structural fix proposed)

| Commit | Bytes | Limit | Cause |
|---|---|---|---|
| `50f8523c` | 11,598,883 | 1,500,000 | 20 hero reel PNGs in the same commit as the component |
| `14914fb6` | 1,501,797 | 1,500,000 | 4 recolored skeleton PNGs; over by 1,797 bytes |

Both are `failed / input_too_large`. Neither may be counted as reviewed. `14914fb6` is the more instructive case: it missed the limit by 0.1%, meaning the reviewability of a commit currently depends on incidental binary weight rather than on the size of the code being reviewed.

The generalizable rule is to commit binary assets separately from the code that consumes them, which keeps the reviewable diff small regardless of asset size. Not fixed by rewriting history here, because the commits are already recorded and the repo forbids history rewrites. Deferred to a Linear issue rather than fixed in place.

The affected code is not unexamined: `50f8523c`'s component carries `hero-reel-arc.test.tsx`, and `14914fb6`'s two scripts were reviewed by this sweep (S1 fixed a defect in one of them).

### S4 — MEDIUM, structural — two image toolchains for one job (DEFERRED)

The range added four image/asset scripts using two different engines. `build-mobile-screen-gallery.mjs` and `normalize-hero-reel-cutouts.mjs` shell out to ImageMagick via `execFileSync`; `recolor-mockup-skeletons.mjs` uses `sharp`, already a project dependency. `build-mockup-brand-bank.mjs` needs neither.

The ImageMagick path forced a new system prerequisite into `docs/systems/setup-and-build.md` this batch. `sharp` covers crop, trim, alpha handling, and metadata, so the prerequisite is likely removable.

Deferred rather than fixed: converting two working, validation-heavy scripts is a real piece of work with real regression risk, and neither script is on a product path. Recorded so it is a decision rather than an oversight.

### S5 — LOW, contract drift — generated artifact committed beside its generator (ACCEPTED)

`docs/plans/mockup-brand-bank.json` and `mockup-brand-bank-preview.html` are generated by `scripts/build-mockup-brand-bank.mjs` and committed alongside it, with nothing asserting the two agree. A hand edit to the JSON would silently diverge from the generator.

Accepted for now: both are review artifacts under `docs/plans/`, not runtime inputs, and the pending mockup brand-direction work will freeze the reviewed bank into a TypeScript constant with unit tests. If that work is abandoned, this becomes a real finding.

## Verification

- `npm run typecheck` — clean.
- `node scripts/build-mockup-brand-bank.mjs` — 15 kits, 1 blue of 15, zero contrast failures; output byte-identical to pre-refactor.
- `node --check scripts/build-mobile-screen-gallery.mjs` — clean.
- Pre-commit hook (`eslint --fix` + typecheck) passed on every commit in the batch.

## Fresh-eyes pass

Re-read the range and the remediation twice. The `scripts/lib/html.mjs` extraction introduces no new indirection beyond the existing `scripts/lib/env.mjs` precedent, adds no dependency, and changes no output. No fix in this sweep introduced duplication, a brittle contract, an authorization gap, or a non-idempotent path. S3 and S4 remain open by decision, both recorded above with the reason.

## Triage

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| S1 | MAJOR | Divergent duplicate `escapeHtml` in two scripts | Fixed — `scripts/lib/html.mjs` |
| S2 | MINOR | Two scripts missing from `scripts/README.md` | Fixed |
| S3 | MAJOR | `50f8523c` and `14914fb6` unreviewed (`input_too_large`) | Recorded; Linear issue for the separate-binaries convention |
| S4 | MEDIUM | ImageMagick and sharp both used for image work | Deferred; Linear issue |
| S5 | LOW | Generated bank artifacts committed without a drift guard | Accepted; superseded by the pending TypeScript freeze |

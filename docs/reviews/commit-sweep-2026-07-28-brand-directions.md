# Commit Sweep — 2026-07-28 (brand directions)
Same-agent thermonuclear cross-commit audit of 4d4d5fe0..a4999822 plus the sweep-fix commit (9 commits, net +1,893 code lines vs the 1,000 threshold).
Themes: mockup brand-direction feature (runtime module, generated bank, pipeline integration, tests, docs); brand-variety validation batch tooling and its review-driven hardening; landing scrollytelling fixes from a parallel session.
Method: single-agent pass with thermo-nuclear lenses focused on cross-commit contract drift (bank schema vs consumers), duplication, per-commit review coverage, and docs freshness; findings verified against HEAD before edits.
Verified fixed this sweep: brief generator interpolated the now-object archetype field as [object Object], a cross-commit break between the bank schema change and its script consumer that no single-commit review could see.
Landing commits bc2755c9/bd70c796 carried two MINOR findings already remediated inside their own commit chain (doc heal 3255e04c, listener removal in bc2755c9 itself); verified at HEAD, no action.
Per-commit cross-model reviews: all nine code commits reviewed; feature-commit MAJOR rejected as outdated with the suggested asset-existence test adopted anyway; batch-driver findings fixed across three remediation commits ending in a pass.
---

## Range

`4d4d5fe0..HEAD` — 9 commits, ~30 files, +2,507/-202 (net +1,893 code lines).

## Findings

### B1 — MAJOR, contract drift — bank schema change broke a script consumer (FIXED)

`0904fd4c` changed `archetype` from a string to `{desktop, mobile}` in the generated bank.
`scripts/build-brand-variety-briefs.mjs` (committed in `d60727a6`, one commit later) still
interpolated `${kit.archetype}`, which renders `[object Object]` into every generation brief.
Classic cross-commit break: each commit was individually coherent. Fixed; the brief now prints
both platform archetypes, and a regeneration smoke run confirms zero `object Object` occurrences.

### B2 — triaged elsewhere, re-verified — deliberate triad-selection duplication (ACCEPTED)

`scripts/lib/brand-triad.mjs` (author tooling) and `src/lib/mockups/brand-directions.ts`
(runtime) implement the same seeded-shuffle selection. Already triaged in
`docs/plans/mockup-brand-direction-variety-review.md`: the script cannot import TS and the
runtime must not import from `scripts/`. Re-checked; both sides match; unit tests pin the runtime.

### B3 — parallel-session commits (VERIFIED, NO ACTION)

`bd70c796`, `bc2755c9`, `3255e04c` (landing scrollytelling) came from another session. Their two
MINOR review findings (doc describing removed scroll listeners; duplicate render on scroll) were
already remediated within that chain. Verified against HEAD: `product-overview.md` describes the
single rAF loop; the duplicate listeners are gone.

## Verification

- `npm test`: 673 pass / 0 fail. `npm run typecheck`: clean.
- Brief regeneration smoke run under the scratchpad; kit distribution unchanged (all 15 kits used,
  max 3 slots).
- Review statuses: 0904fd4c findings (1 MAJOR rejected as outdated, guard adopted), d60727a6
  findings (5, fixed in 02661628), 02661628 findings (1, fixed in 21284e30), 21284e30 findings
  (1, fixed in a4999822), a4999822 passed, sweep-fix commit passed.

## Triage

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| B1 | MAJOR | Brief generator renders `[object Object]` for archetypes | Fixed |
| B2 | MEDIUM | Triad selection duplicated script/runtime | Accepted, prior triage confirmed |
| B3 | MINOR x2 | Landing scrollytelling doc/listener findings | Already remediated in-range; verified |

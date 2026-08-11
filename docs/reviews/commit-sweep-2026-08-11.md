# Commit Sweep — 2026-08-11 (mockups, project dashboard, portable skills)
Cross-commit audit of `bbae9cae..3f80163f`: 10 commits, 36 code files, +3,622/-224 code lines (net +3,398; sweep threshold 1,000).
Themes: Pro Max mockup style triads, project-dashboard card redesign and rename flow, portable skill/starter-kit refreshes, and marketing/design references.
Finders: three parallel read-only subagents covered structure/duplication, contracts/correctness, and tests/dead-code/docs; the dispatching agent covered product/UX and verified every lead.
Findings: seven MINOR findings accepted and fixed; two MINOR abstraction suggestions rejected with concrete dependency and cohesion rationale.
No BLOCKER or MAJOR findings; no secrets were found in the committed material.
Verification: 746 tests, 36 Pro Max Python tests, typecheck, focused ESLint, catalog guard, two authenticated project-card browser tests, and both fresh-eyes passes succeeded.
---

## Range

`bbae9caea8993de487e626db0582e42a090ed952..3f80163f11a875a4913603cc5c22a62a4991148c`.

## Findings and triage

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| S1 | MINOR | Strict design-plan parsing and nullable transport reconstruction have similar selection-field parsing | Rejected: they enforce different trust-boundary semantics; merging through the selector would create a circular dependency, while the shared types and caps are already canonical |
| S2 | MINOR | `StyleAwareMockupDesignPlan` was an identity alias of `MockupDesignPlan` | Fixed: removed the alias and casts; callers use the canonical type directly |
| S3 | MINOR | The generated catalog version was repeated and `PRO_MAX_CATALOG_VERSION` was unused | Fixed: centralized the generator version and removed the dead export |
| S4 | MINOR | `ProMaxStyleSelectorContext` and `getMockupStyleTreatment` were orphaned exports | Fixed: removed both and their unused imports |
| S5 | MINOR | Three dashboard dialogs repeat Radix shell structure | Rejected: close behavior, pending-state rules, body layout, and footer actions differ materially; a wrapper would be a thin abstraction without removing a demonstrated defect |
| T1 | MINOR | The browser test queried nonexistent DOM wedge nodes even though the dot field renders to canvas | Fixed: expose the runtime wedge count on the canvas and assert the real rendered field state |
| T2 | MINOR | API documentation omitted `generate-option` and `finalize` | Fixed: documented bodies, ownership checks, server-resolved plan precedence, persistence, and failure behavior |
| T3 | MINOR | Portable-skill bundle hashes were stale after whitespace-normalized vendoring | Fixed: recomputed root and starter-kit bundle hashes and corrected the pinned Pro Max script hash/provenance |
| P1 | MINOR | The Pro Max generator repeated one catalog-version literal three times | Fixed with S3 through a single `CATALOG_VERSION` constant |

Contracts/correctness finder: `NO FINDINGS`.

The suggested generic hash-validation utility was not added: exact bundle hashes were recomputed and verified, while a new repository-wide mechanism would expand this remediation beyond the demonstrated drift.

## Verification

- `npm test`: 746 pass / 0 fail, including the generated Pro Max catalog guard.
- Pinned Pro Max Python suite: 36 pass / 0 fail.
- `npm run typecheck`: clean.
- Focused ESLint over all remediated source, test, and generator files: clean.
- `git diff --check`: clean before staging and after both fresh-eyes passes.
- Authenticated Playwright project-card checks: 2 pass / 0 fail against an isolated MakerCompass dev server. The first default-port attempt was invalid because another local app occupied port 3000; no product failure was observed.
- Bundle hashes were recomputed for the root and starter-kit skill copies and matched the recorded manifests.

## Review coverage note

An on-demand cross-model range review was not run because this task requested local commits, not a push. The range touches authenticated mockup API paths, so the repository's required opposite-model diff review remains a before-push gate.

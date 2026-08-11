# UI/UX Pro Max Mockup Styles Review

## Outcome

Maker Compass now resolves a product-aware UI/UX Pro Max triad for every fresh mockup run. A is the restrained Foundation direction, B is a materially different Distinctive direction, and C is the boldest product-safe Experimental direction. The same resolved three-style system is used for mobile and desktop treatments and persisted through the existing draft/final design-plan JSON so retries cannot silently change style.

The previous hand-authored bank remains a whole-triad fallback and a deployment rollback path. No database migration, API envelope, billing, auth, queue, storage-key, or customer-facing workflow changed. No OpenRouter or other live image-provider request was made during implementation or verification.

## Source And Selection Design

- Vendored UI/UX Pro Max v2.14.1 at commit `abb7f2fd5a083fa1ff55c326a963ff0d95c33f99`, with MIT license, provenance, and machine-checked source hashes.
- Ran the pinned upstream `search.py <query> --design-system --json` workflow offline for all 192 catalog products and froze its raw design-system results.
- Generated a reviewed 79,105-byte TypeScript runtime catalog; build/test freshness checks fail if the generated output or pinned sources drift.
- Runtime classification uses stable product context and controlled category hints. It never puts raw user prose or arbitrary upstream CSV prose into the image prompt.
- A/B/C enforce distinct style IDs, accent/primary colors, heading families, density, layout, and effects. Achromatic palettes receive a deterministic contrast-safe fallback.
- Primary CTA accent is consistent across both storyboard screens. Green is reserved for completed success unless green is the treatment's actual primary accent, correcting the ScopeSignal inconsistency visible in the earlier evaluation image.

## Persistence And Trust Boundaries

- `MockupDesignPlan.styleSelection` is optional and backward compatible. Valid selections require an exact A/B/C triad, controlled enums/hex values, bounded arrays/text, and an 8 KB payload ceiling.
- Draft rows are the authoritative source for option generation and finalization. All non-null draft plans must agree before canonical metadata is written.
- Browser-transported selections are accepted only when they exactly reconstruct from server catalog constants for the same project and current flags; forged or instruction-shaped payloads are stripped.
- `MOCKUP_PROMAX_ENABLED=0` routes fresh runs to the legacy bank. `MOCKUP_BRAND_DIRECTIONS_ENABLED=0` disables style enrichment for fresh or transported plans. Server-persisted selections remain authoritative for sibling consistency.
- Unclassifiable fresh plans fall back as one complete legacy triad and emit only the content-free `mockup_promax_fallback` diagnostic.

## Plan, Code, Security, And Architecture Review

Five cross-model plan evaluation rounds are preserved beside the plan. Their accepted findings drove the pinned offline workflow, whole-triad persistence, prompt caps, source hashes, rollback flags, independent catalog validation, exact platform handling, and explicit provider-evidence limitation.

Three read-only implementation reviewers covered architecture/runtime, correctness/recovery, and security/trust boundaries. Remediated findings included:

- Replaced a loose catalog interpretation with frozen outputs from the exact upstream design-system command.
- Kept product classification stable across mobile and desktop runs by including original product context.
- Added deterministic catalog/fixture drift checks to both build and test entry points.
- Closed client-forgery paths in option generation and orphan finalization.
- Made draft metadata authoritative and required triad agreement across rows.
- Removed prompt-facing raw catalog prose in favor of locally reviewed bounded guidance.
- Added content-free fallback logging and exact provenance/source hash checks.
- Fixed Prompt Lab's planner-only/live mismatch by enriching one parsed plan before either branch.
- Added exhaustive 192-product A/B/C diversity invariants and kill-switch transport checks.

No new dependency or runtime Python process was added. Vendored source and frozen fixtures remain outside `src/`; production receives only the compact generated module. This is simpler and safer than invoking the upstream Python search engine per request.

## Verification

- Full unit suite: 732 passed, 0 failed, 0 skipped.
- Focused Pro Max/mockup/Prompt Lab suite: 74 passed during implementation.
- TypeScript: passed.
- Production build: passed, including 74 static pages and the webpack/chunky/vendor bundle guard.
- Generated runtime catalog: current and 79,105 bytes, below the 100 KB ceiling.
- Scoped ESLint for every integration source/test/script file: passed.
- `git diff --check`: passed.
- Upstream snapshot tests: 36 passed; upstream data validation covered 12 domains, 22 stacks, and UI-reasoning data.
- Commit-sweep check: not due (`net: 0`) because the sweep evaluates committed code ranges and this work remains uncommitted.

Repository-wide ESLint still reports one unrelated existing error in `src/components/layout/workspace-document-frame.tsx` (`react-hooks/set-state-in-effect`) plus unrelated warnings. This task did not modify that file; scoped lint proves the Pro Max integration is clean.

## Visual Verification

The existing 10-idea evaluation gallery and its 20 no-OpenRouter mobile/desktop Pro Max images remain at `output/ui-ux-pro-max-evaluation/2026-08-09-v1/`. The ScopeSignal mobile sample was inspected directly and confirms the prior blue-versus-green CTA inconsistency that motivated the new semantic rule.

Automated browser inspection of the local `file://` gallery was blocked by the in-app browser's URL policy, so no safety workaround was attempted. Prompt Lab construction, catalog invariants, saved evaluation assets, and build regression provide local evidence only. They do not prove that the live image provider follows the new treatment prompt.

## Remaining Limitation

Primary-provider visual adherence remains intentionally unverified because the user prohibited OpenRouter calls. The Pro Max-only switch allows immediate rollback for fresh runs if later provider sampling shows weak adherence. There is also a narrow crash window before the first completed option can persist its draft plan; controlled reconstruction recovers the selection when the transported plan and current pinned catalog still agree.

## Final Disposition

Accepted work is complete. Fresh A/B/C mockups now use different Pro Max visual systems, retries and sibling screens stay coherent, CTA semantics are explicit, old data remains compatible, and rollback remains available. Existing unrelated worktree changes were preserved.

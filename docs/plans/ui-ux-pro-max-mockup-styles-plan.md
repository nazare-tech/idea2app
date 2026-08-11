---
implemented: true
implemented_at: 2026-08-10T05:56:20Z
implementation_summary: Replaced fresh mockup styling with deterministic UI/UX Pro Max Foundation, Distinctive, and Experimental triads; persisted controlled selections through existing JSON; retained whole-triad legacy and pre-style rollback paths; verified without provider calls.
---

# Plan: UI/UX Pro Max Mockup Styles

## Goal

Replace Maker Compass's active hand-authored 15-kit mockup style bank with product-aware visual treatments sourced from UI/UX Pro Max v2.14.1. Preserve the existing two-screen storyboard, A/B/C layout directions, generation providers, option recovery, storage, billing behavior, and user flow.

## Assumptions

- “Use Pro Max visual styles” means production mockup generation, not only the portable Codex skill or Prompt Lab.
- Maker Compass should still generate three comparable concepts automatically; no pre-generation style picker is required in this phase.
- Existing saved mockups remain unchanged. Only new mockup generations use Pro Max.
- OpenRouter must not be called during implementation or verification in this task. Prompt tests and Codex built-in image generation may be used instead.
- The current worktree contains unrelated user changes, including skill and system-document work. This implementation must avoid overwriting or reverting them and must isolate overlapping edits.
- Any server-side change requires explicit user approval before implementation. No database, API contract, Supabase schema, billing, auth, or queue change is proposed.

## Clarifying Questions

1. How should Pro Max run in production?
   - **Recommendation A:** Vendor a pinned Pro Max snapshot and use its upstream Python engine offline to generate a small reviewed `(product category × platform × direction role)` TypeScript lookup for the existing Node prompt builder.
   - Trade-off: Faithful local source with no production search engine, network, Python, or large bundle; requires a maintained generation/review script.
   - **Recommendation B:** Execute Pro Max's Python search script at request time.
   - Trade-off: Closest to upstream implementation, but adds a production Python/process dependency that is brittle on Vercel and harder to secure and observe.
   - **Selected:** Recommendation A. Implementation blocked until user approves server-side prompt changes.

2. How should three styles be chosen?
   - **Recommendation A:** Product-aware triad: Foundation, Distinctive, Experimental. Rank Pro Max candidates from MVP context plus each planner direction's tone/motifs; filter landing-only or product-incompatible treatments; enforce three distinct style categories.
   - Trade-off: Better fit and useful contrast; selector needs explicit safety rules and parity fixtures.
   - **Recommendation B:** Use the top three raw Pro Max BM25 results.
   - Trade-off: Smaller implementation, but near-duplicate or misclassified results can ship without curation.
   - **Selected:** Recommendation A.

3. Should style choices be persisted or exposed in new UI?
   - **Recommendation A:** Persist one optional capped `styleSelection` object inside the existing design-plan JSON: source, catalog version, and resolved treatments for A/B/C. No new table, column, migration, or customer-facing picker.
   - Trade-off: Exact retries and cross-deploy recovery; additive parser/data-shape work in existing JSON.
   - **Recommendation B:** Recompute treatment IDs for every option request.
   - Trade-off: Smaller implementation, but paid retries or in-flight deployments can mix visual systems within one project.
   - **Selected:** Recommendation A, explicitly approved by the user on 2026-08-09. Picker deferred.

4. How should upstream code and data be embedded?
   - **Recommendation A:** Pin v2.14.1 / commit `abb7f2fd5a083fa1ff55c326a963ff0d95c33f99`, vendor the required source data plus MIT license and provenance, then generate checked-in TypeScript runtime data.
   - Trade-off: Reproducible builds and auditable updates; adds roughly 0.4–1.8 MB depending on whether the full agent skill or only production-relevant data is vendored.
   - **Recommendation B:** Install or download the latest Pro Max package during builds.
   - Trade-off: Automatic updates, but non-reproducible production behavior and a new supply-chain/network dependency.
   - **Selected:** Recommendation A.

5. What should happen when Pro Max cannot produce three safe matches?
   - **Recommendation A:** Fall back to the existing deterministic brand-kit bank and log a content-free diagnostic containing only controlled category/style IDs.
   - Trade-off: Paid generation still succeeds; some projects temporarily retain old styling.
   - **Recommendation B:** Fail generation and ask the user to retry.
   - Trade-off: Strict provenance, but converts a style-selection miss into a costly customer-visible failure.
   - **Selected:** Recommendation A.

## Recommended First Step

Backend approval is complete. Create the compact generated lookup and pure TypeScript selector before touching the image prompt. Prove deterministic product/style/color/type matches for the ten evaluation ideas and adversarial plans, then replace the active prompt block behind a Pro Max-only rollback flag.

## Proposed Design

### Source snapshot

- Add a pinned UI/UX Pro Max source snapshot with upstream MIT license and a provenance note.
- Production-authoring inputs: `styles.csv`, `colors.csv`, `typography.csv`, `products.csv`, and `ui-reasoning.csv`.
- Keep upstream data immutable. A local generator invokes the pinned upstream search offline, records raw results in frozen fixtures, applies reviewed allowlists, and emits a checked-in runtime lookup containing only required fields.
- Record upstream version, commit, source URL, and file hashes. Updates are manual and reviewed.
- License gate result: upstream repository declares MIT for the project and includes no separate catalog-data exception found in the pinned source. Preserve the upstream license beside the vendored CSVs. If a future snapshot adds separate data terms, do not vendor it; generate and commit only derived category/style IDs with upstream citations.

### Runtime selector

- Do not port BM25 into production. Generate a compact reviewed lookup offline from pinned upstream output.
- Input for first selection: design plan and primary platform. Output is immediately attached as `styleSelection` before any option image call.
- Match the design plan against allowlisted product-category keywords emitted from Pro Max `products.csv`; use stable content hashing only for exact ties. Retries read persisted IDs and do not reclassify.
- Output: exactly three capped `ProMaxVisualTreatment` objects containing stable IDs, concise style guidance, palette, typography, effects, density, surface, and anti-pattern IDs. Persist resolved payloads so retired catalog IDs remain reconstructable.
- Offline filters use named upstream fields: `Do Not Use For`, `Accessibility`, `Mobile-Friendly`, `Best For`, `Light Mode ✓`, `Dark Mode ✓`, `Anti_Patterns`, and `Severity`.
- Runtime never concatenates arbitrary CSV prose. Generated fields are allowlisted, normalized, length-capped, and rendered as structured key/value lines.
- Triad roles:
  - A / Foundation: highest product-fit, restrained variance.
  - B / Distinctive: product-safe secondary style with materially different structure/type/surface.
  - C / Experimental: boldest still-usable product treatment; never forced when catalog guidance marks it inappropriate.
- Product action semantics override decorative palette guidance: primary actions use the selected accent consistently; success green denotes completed state, not an uncompleted CTA.

### Prompt integration

- Extend `MockupDesignPlan` additively with optional `styleSelection`; old plans parse unchanged, while new plans receive a validated selection before image generation.
- Replace the current `MockupBrandKit` prompt block with a Pro Max treatment block at the existing `generateAndStoreOption()` seam.
- Use the same selector in planner-only Prompt Lab output and single-option regeneration.
- Keep the current brand bank as a persisted whole-triad fallback source.
- Flag precedence for new runs: `MOCKUP_BRAND_DIRECTIONS_ENABLED=0` short-circuits all style enrichment and restores pre-bank prompts/skeletons. Otherwise `MOCKUP_PROMAX_ENABLED=0` selects the current bank; with both enabled, Pro Max is primary and the current bank is whole-triad fallback. Existing runs with persisted selection always honor it across flag changes so siblings stay coherent.

## Runtime and Change-Impact Analysis

### Repeated Work

- Selection runs once per run before the first paid image call. The enriched design plan is passed in memory to all three options and saved in existing `mockup_option_drafts.design_plan` and final `mockups.metadata.design_plan`. Single-option retry reads those IDs.
- Expected volume: one selector call per new mockup generation; worst case includes manual retries.
- Work per call: tokenize one compact design-plan summary and score fewer than 200 category keyword rows; no network, filesystem, process spawn, or model call.
- Acceptance threshold: generated runtime lookup below 100 KB uncompressed; vendored data/generators remain outside `src/` and unreachable from server route bundles; application build guard passes during Phase 2.

### Ownership, Scope, And Lifetime

- New state: immutable Pro Max catalog module plus an optional validated style-selection object inside existing design-plan JSON.
- Owner: `src/lib/mockups/`; request lifetime only. No module-global unbounded cache.
- Consumers: queued/onboarding generation, manual option generation, and Prompt Lab prompt-only previews through the shared prompt builder.
- Retry/restart: manual A/B/C generation stores the enriched plan in client state/localStorage and draft rows; option recovery reuses it. Queued generation enriches one plan and passes it to all three in-memory calls. Cross-deploy retries prefer persisted source/version/IDs, so catalog updates do not alter sibling styles.
- Legacy/in-flight plan without `styleSelection`: if it belongs to an existing partial run, preserve legacy-bank mode for the entire remaining run; only a fresh plan with no existing options receives Pro Max selection.

### Boundary And Cache Semantics

- Client/server payload envelope: unchanged; existing opaque design-plan JSON gains optional validated fields.
- Database/storage schema: unchanged. Existing JSON columns store the enriched plan. No migration or historical rewrite.
- Queue and option-draft contracts: unchanged.
- Image cache/storage keys: unchanged; old images remain valid.
- Rollout: new generations use Pro Max when enabled; mixed old/new saved projects are supported.
- Catalog freshness: pinned snapshot changes only through explicit regeneration and review. Persisted resolved treatments do not depend on future catalog membership.

### Failure And Recovery

- Zero/unsafe matches: persist current-bank IDs/source for the entire triad before any paid image call; never mix Pro Max and legacy treatments within a run.
- Malformed generated catalog: build/unit tests fail; runtime module never parses CSV.
- Partial option generation: existing option-draft recovery remains authoritative.
- Kill switches: `MOCKUP_PROMAX_ENABLED=0` restores the current hand-authored bank; `MOCKUP_BRAND_DIRECTIONS_ENABLED=0` restores pre-bank prompts and skeletons. Read both once per request/run; change them only through a deployment, never as a live mid-run toggle.
- Blast radius: visual instructions and additive design-plan JSON for new mockups only. No auth, billing, permissions, schema migration, or historical-row rewrite.

### Risk-Matched Verification

| Risk | Evidence | Acceptance threshold |
|---|---|---|
| Generated lookup drifts from upstream | Generator runs pinned upstream v2.14.1 and commits raw output plus reviewed accepted/rejected mapping before runtime code | Frozen raw outputs match generator inputs; accepted/rejected set is explicit and cannot self-bless |
| Three concepts collapse visually | Triad invariants across ten prior ideas and adversarial plans, asserted on formatted treatment fields | Three distinct style IDs; dominant hue families, type families, density, surface, and effects each differ across at least two pairs |
| Product misclassification | Ten-idea fit fixtures with accepted and rejected candidates | Every idea returns an allowed product style; recorded bad matches excluded |
| Selector silently falls back | Ten prior ideas plus 30 adversarial plans: empty, short, non-English, off-catalog, and near-duplicate directions | 0 fallback for the ten ideas; fallback is whole-triad and expected only for deliberately unclassifiable adversarial inputs; emit counted `mockup_promax_fallback` diagnostic |
| Retry changes style | Parser, draft, finalize, recovery, and cross-catalog-version tests | Persisted A/B/C IDs and source win over recomputation; legacy partial runs remain legacy |
| CTA color semantics regress | Prompt snapshot tests including ScopeSignal | Primary CTAs use one treatment accent; success color reserved for completed status |
| Prompt growth raises paid-path latency/truncation | Prompt invariants and size assertions | Treatment block at most 1,600 characters per option; complete image prompt delta at most 1,800 characters |
| Generated lookup contains unsafe prose | Independent invariant test over committed lookup and persisted selection | Enums and hex fields valid; every field within cap; no control characters, role markers, URLs, code fences, or instruction-pattern denylist matches; selection JSON below 8 KB |
| Existing paths break | Focused mockup, Prompt Lab, typecheck, and build tests | Zero failures; design-plan/API payload snapshots unchanged |
| Visual provider ignores guidance | Built-in image-generation sample against existing skeletons; no OpenRouter | Two-frame contract passes; three treatments visibly differ. OpenRouter-specific adherence remains an explicitly unverified risk |

## Architecture Improvement Opportunities

| Opportunity | Benefit | Trade-off | Boundary | Status |
|---|---|---|---|---|
| Compact generated lookup plus typed selector | One deterministic implementation shared by all generation paths without runtime BM25 | New module and tests | `src/lib/mockups/` | **Selected** |
| Pinned vendor snapshot, frozen raw fixtures, and generator | Auditable provenance and repeatable updates | Repository size and update procedure | skill data + scripts | **Selected** |
| Additive style selection in existing design-plan JSON | Exact retry and cross-deploy consistency without migration | Parser/persistence tests required | prompt/draft/final metadata boundary | **Selected** |
| Two rollback flags plus whole-triad fallback | Restore current bank or pre-bank behavior without code changes | Flag changes require deployment discipline | prompt boundary | **Selected** |
| Product-action semantic layer | Prevents green “success” actions before success and stabilizes CTA language | Overrides some raw palette recommendations | prompt formatter | **Selected** |
| Pre-generation customer style picker | Founder control and transparency | UI, payload, recovery, analytics, and persistence scope | client/server | **Deferred** |
| Runtime Python execution | Maximum upstream code reuse | Unsupported deployment/process dependency | server runtime | **Rejected** |
| Runtime upstream fetch/update | Always latest catalog | Nondeterministic output and supply-chain risk | build/runtime | **Rejected** |

## Architecture Critique

Current style seam is good: one pure prompt block controls queued, manual, retry, and Prompt Lab paths. Replacing the bank there avoids schema fan-out. Main risk is claiming “Pro Max” while implementing a loose reinterpretation. Frozen upstream outputs, reviewed accepted/rejected mappings, pinned source data, and explicit provenance constrain that risk. Production should consume a small generated lookup, not a copied search engine.

## Product And Customer Critique

Automatic product-aware triads improve the founder's choice without adding a setup step. However, a recommendation engine cannot fully replace taste judgment. “Experimental” must remain product-safe, and the raw catalog's landing-page advice must not leak into working screens. A future visible picker may be valuable, but it should follow evidence that founders want pre-generation control rather than post-generation comparison.

## Engineering Implementation Critique

The tempting shortcuts are invoking Python at runtime or porting BM25 into the server bundle. Both create maintenance cost without customer benefit. Use pinned Python only during authoring, then ship a compact generated lookup. Avoid hand-editing a second style bank; frozen raw output and reviewed mapping must make upstream provenance real.

## Risk, Security, And Operations Critique

- Confirm upstream MIT license covers the CSV catalog files specifically; record finding in provenance.
- Catalog data is trusted vendored code only after license/provenance review; runtime design-plan text remains untrusted product context and is used only for token matching.
- Selector output uses generated allowlisted fields, strict length caps, and structured formatting; it never executes or directly pastes catalog content.
- Logs contain controlled style/category IDs only, never MVP text or user prompts.
- No new secrets, network calls, subprocesses, database access, authorization paths, billing logic, or production writes.
- Existing draft/final writes carry additional controlled JSON fields; no new queries, tables, columns, permissions, or ownership paths.
- Existing paid generation cost is unchanged. No OpenRouter verification call is permitted for this task.
- Primary-provider adherence therefore remains blocked evidence, not a passing QA claim. Pro Max is enabled per the user's explicit product request; final review must label this unverified risk and the Pro Max-only flag provides immediate rollback for new runs.

## Implementation Phases

### Phase 1: License gate, vendor, provenance, reproduction

- [x] Confirm upstream repository MIT license and no separate catalog-data exception in the pinned snapshot; future snapshots fail closed if terms differ.
- [x] Add pinned Pro Max source data, MIT license, provenance, and hashes without overwriting existing skills.
- [x] Run pinned upstream Python offline for fixed category/platform queries and commit raw output fixtures.
- [x] Commit exact query set, upstream script hashes, and one-command reproduction script; rerun independently and compare outputs before runtime integration.
- [x] Add CI/test reproduction that regenerates the runtime lookup from pinned inputs and fails on diff; vendored sources and fixtures remain outside `src/`.
- [x] Add/update a deterministic generator for a compact production TypeScript lookup.
- [x] Validate source row counts and named filter columns.

### Phase 2: Red-green selector

- [x] Freeze accepted/rejected upstream results before implementation.
- [x] Add failing determinism, product-fit, triad-diversity, accessibility-filter, fallback, and semantic-action tests.
- [x] Add an independent committed-lookup validator test for enums, lengths, colors, control characters, URLs, role markers, code fences, and instruction-shaped text.
- [x] Implement compact category matching and Pro Max treatment selection from persisted design-plan fields.
- [x] Enforce the 100 KB runtime-table limit, prove vendored sources are unreachable from route bundles, and run the build guard in this phase.
- [x] Add optional `styleSelection` parser/types with strict source/version/three-ID validation and backward-compatible fallback.
- [x] Persist capped resolved payloads, not IDs alone; require three concrete treatments and an 8 KB JSON ceiling.

### Phase 3: Prompt integration

- [x] Add `MOCKUP_PROMAX_ENABLED`, default on per explicit user request; `0` restores the current bank.
- [x] Resolve and attach one whole triad before the first option; persist it through existing draft design-plan and final metadata paths.
- [x] Make manual/queued retry, recovery, Prompt Lab, and planner-only paths prefer persisted IDs and preserve legacy partial runs.
- [x] Replace active bank selection with Pro Max lookup and whole-triad legacy fallback behind the two rollback flags.
- [x] Enrich queued, manual, retry, and Prompt Lab prompts through the shared seam.
- [x] Preserve existing design-plan, client payload, storage, and recovery contracts.
- [x] Measure today's brand-kit block and full prompt sizes, then set and assert caps no larger than 1,600 characters per treatment block and 1,800 characters of total delta.
- [x] Add semantic prompt invariants rather than self-blessing golden blobs.
- [x] Add four-case flag matrix; persisted selections override later flag changes, while flags choose the source only for fresh runs.
- [x] Verify Prompt Lab supplies a real parsed design plan and assert its Pro Max branch, not fallback, is exercised.

### Phase 4: Documentation and verification

- [x] Update mockup system, setup, key-files, scripts, and test-inventory docs while preserving unrelated user edits.
- [x] Append the approved additive backend JSON change, verification, flags, and rollback to `docs/plans/backend-change-history.md`.
- [x] Run focused tests, full tests, typecheck, scoped lint, build, and portability audit; record the unrelated repository-wide lint failure separately.
- [x] Verify Prompt Lab construction and the existing mobile/desktop evaluation assets as regression evidence only; local `file://` browser automation was policy-blocked and is not provider evidence.
- [x] Retain and inspect the existing no-OpenRouter visual samples generated during this evaluation.
- [x] Record that primary-provider visual adherence remains unverified because the user prohibited OpenRouter calls; do not present fixture or built-in evidence as provider coverage.

### Phase 5: Review and remediation

- [x] Record plan evaluation, code review, security review, architecture-opportunity review, and verification in a sibling review file.
- [x] Remediate accepted findings and rerun relevant verification.
- [x] Run sweep check if net code growth reaches the repository threshold; the committed-range check reports not due while this work is uncommitted.
- [x] Mark this plan implemented only after all accepted work is complete.

## Milestones

1. Backend approval received.
2. Vendored catalog, frozen upstream fixtures, reviewed mapping, and selector tests pass.
3. All mockup prompt paths use deterministic Pro Max treatments behind rollback flags.
4. Built-in visual sampling, browser regression QA, and code/security review pass; primary OpenRouter adherence remains explicitly unverified under user constraint.

## Test Strategy

- Unit: category mapping, candidate filters, distinct triads, fallback, prompt formatting, size caps, CTA semantics.
- Contract: old design plans remain valid; new `styleSelection` validates exactly three A/B/C assignments; request envelopes remain unchanged.
- Integration: queued/manual/draft/finalize/recovery helpers retain persisted IDs across catalog-version and flag changes; Prompt Lab matches production prompt building.
- Bundle: generated runtime lookup below 100 KB; vendored sources absent from route graph; build guard passes.
- Browser: existing fixture-mode mockup workspace plus Prompt Lab prompt-only output; 1440px desktop and 375px mobile; no paid generation.
- Visual: built-in image generation only, using existing skeletons and representative prompts. OpenRouter adherence intentionally unverified under the user's no-OpenRouter constraint.

## Rollback And Recovery

- Set `MOCKUP_PROMAX_ENABLED=0` in a deployment to make new runs use the current hand-authored bank. In-flight runs honor their persisted source/treatments for sibling consistency.
- Set `MOCKUP_BRAND_DIRECTIONS_ENABLED=0` in a deployment to restore the pre-bank prompt and skeleton behavior.
- Keep prompt-swap edits isolated from vendoring/generated-data edits so a code revert can restore the current bank without touching saved mockups or design plans.
- Existing partial runs without style metadata remain on the legacy bank. New runs persist source/version/A/B/C assignments before image generation. Catalog refreshes cannot change persisted assignments.
- No migration, historical data rewrite, or cleanup required.

## Open Decisions

- **Backend approved:** user approved server-side prompt changes on 2026-08-09; database/API/Supabase/billing/queue/client-state scope remains excluded.
- **External plan review approved and completed:** first successful evaluation found two blockers, seven major findings, and four minor findings. Accepted: compact offline-generated lookup, frozen upstream fixtures, prompt size caps, named filter columns, structured allowlisted fields, whole-triad fallback, stable design-plan inputs, and provider-verification caveat. Initial persistence rejection was superseded after the reviewer demonstrated a cross-deploy paid-retry bug and the user explicitly approved additive JSON persistence. Real OpenRouter verification remains rejected because the user prohibited OpenRouter calls.
- **Second/third evaluation:** accepted Pro Max-only rollback flag, persisted A/B/C source/version/IDs, one-triad-per-run resolution, fallback-rate evidence, independent lookup validation, license gate, reproducible upstream fixture command, Prompt Lab branch assertion, adversarial plan set, relative prompt caps, and isolated prompt swap. Rejected default-off rollout and real-provider call because they conflict with the user's explicit requests to use Pro Max in product and not call OpenRouter.
- Legacy-bank removal criterion: keep the bank as an intentional rollback dependency until a separately approved real-provider verification and explicit removal review; this task adds no analytics-based threshold.
- **Additive persistence approved:** user approved storing source, catalog version, and A/B/C style assignments in existing JSON metadata on 2026-08-09. Resolved capped treatment payloads implement that approval without migration or API-envelope change.
- **Final evaluation disposition:** accepted resolved-payload persistence, persisted-run precedence across flags, concrete rendered-field divergence, committed-lookup invariant tests, exact platform source (`primaryPlatform`), generator-drift reproduction, upstream-row citations, and 8 KB selection ceiling. Rejected default-off rollout because user explicitly requested activation while prohibiting OpenRouter verification; risk and rollback remain explicit. Rejected “user reroll needs a new style” because product exposes recovery/retry for missing or failed options, not reroll of a completed option. Rejected mandatory secure-builder routing because treatment output contains only generated allowlisted constants and never echoes the user-derived classifier input; instruction-shaped text is independently denied. Fixture mode remains regression-only evidence as expressly allowed by repository mockup UI policy, never provider evidence.
- After production evidence, decide whether to expose Pro Max style names or a pre-generation picker.
- After upstream release changes, decide whether to refresh beyond pinned v2.14.1 through a separate reviewed task.

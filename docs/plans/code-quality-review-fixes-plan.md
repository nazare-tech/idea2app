---
implemented: false
implemented_at: null
implementation_summary: null
---

# Code Quality Review Fixes (Thermo-Nuclear Review 2026-07-06)

## Goal

Implement the accepted findings from `docs/reviews/thermo-nuclear-code-quality-review-2026-07-06.md` (F1-F7) with zero behavior change: replace the hand-rolled billing normalization layer with the generated database types, derive workspace containment from the nav registry instead of copy-pasted literals, replace the timing-dependent two-phase scroll with a render-then-scroll model, unify the landing capture manifest, extract the visibility-aware poller, deduplicate the preview frame chrome, and clean up small hygiene items. F8 (decomposing pre-existing >1000-line files) is intentionally out of scope; it is a ratchet on future PRs.

## Assumptions

- The Supabase server/browser clients are typed with `Database` from `src/types/database.ts` (verified: `createServerClient<Database>` / `createBrowserClient<Database>`), so query results for `plans`, `plan_prices`, and `subscriptions` are compile-time typed.
- `plan_prices` Row columns used by the billing UI (`unit_amount_cents`, `interval_unit`, `interval_count`, `checkout_enabled`, `is_active`, `sort_order`, `label`) are non-nullable in the generated types (verified), so no runtime defaulting is needed.
- `tsconfig.json` has `allowJs: true` (verified), so a plain `.mjs` manifest module can be imported by both Next.js TS components and the plain-Node export script.
- No behavior change is intended anywhere; existing tests (`scrollable-content.test.tsx`, `workspace-document-frame.test.tsx`, `generate-all-store.test.ts`, `project-allowance.test.ts`) must stay green unmodified except where a test asserts an implementation detail that legitimately moved.

## Clarifying Questions

### Q1: Scroll-into-contained-document fix — reframe or patch?

- **Recommendation A (reframe)**: Replace the two-phase rAF scroll with a `pendingScrollTarget` state + `useLayoutEffect` that scrolls after React commits the `activeDocument` change (containment removed). Deletes `shouldTwoPhaseScroll`, `getNavKeyForScrollTarget`, and the rAF re-query; ordering is guaranteed by React's effect timing instead of frame timing. Trade-off: slightly larger diff in one hook, needs careful manual verification of anchor navigation.
- **Recommendation B (patch)**: Keep the heuristic; add `CSS.escape`, a why-comment, and shared target resolution. Trade-off: small diff but keeps the unguaranteed commit-before-rAF timing dependency.
- **Selected: A** (per review recommendation; B preserves the structural defect the review exists to remove).

### Q2: `ProjectAllowanceClient` cast cleanup — signature union or per-page fixes?

- **Recommendation A (signature union)**: `getProjectAllowanceStatus`/`canCreateProject` accept `ProjectAllowanceClient | SupabaseClient<Database>` and narrow once internally; delete all 7 `as unknown as` call-site casts. Trade-off: touches 7 files, all mechanically.
- **Recommendation B (page-only)**: Fix only the two dashboard pages in this changeset's blast radius. Trade-off: leaves 5 casts and two idioms for the same call.
- **Selected: A** (one boundary, one narrowing, zero casts at call sites).

### Q3: `getCurrentUser` double-client idiom

- **Recommendation A**: Return `{ user, error, supabase }` from the cached `getCurrentUser` so pages needing both make one call. Trade-off: touches its call sites; explicit.
- **Recommendation B**: Wrap `createClient` itself in React `cache()`. Trade-off: smallest diff but changes semantics for route handlers that also import it, where `cache()` scoping is less predictable.
- **Selected: A** (explicit, RSC-only surface, no route-handler semantics risk).

## Architecture Improvement Opportunities

1. **Typed DB boundary for billing (selected, F1)**: derive `BillingPlan`/`BillingPlanPrice`/`BillingSubscription` from `Database` Row types; delete the `unknown` normalization layer. Benefit: schema drift becomes a compile error instead of silent fallback values. Files: `src/lib/billing-page-data.ts`, `src/app/(dashboard)/billing/page.tsx`.
2. **Registry-driven workspace sections (selected, F2)**: one section descriptor array drives the five deferred `DocumentWrapper` blocks; containment derived from `SCROLLABLE_NAV_ITEMS.sourceType`. Benefit: removes the hidden `"mvp"` literal coupling; adding a document becomes a registry entry. Files: `src/components/layout/scrollable-content.tsx`.
3. **Render-then-scroll model (selected, F3)**: pending-scroll-target state + layout effect. Benefit: deletes the timing heuristic. Files: `src/components/workspace/use-workspace-scroll-sync.ts`.
4. **Single landing capture manifest (selected, F4)**: `src/lib/landing-preview-captures.mjs` (plain JS so the plain-Node export script can import it; `allowJs` lets TS import it too) consumed by both the component and the script; loud failure on lookup miss. Files: new manifest, `feature-product-preview.tsx`, `scripts/export-landing-sample.mjs`.
5. **Reusable visibility-aware poller (selected, F5)**: `src/lib/visibility-aware-poller.ts` with `schedule/stop`; store keeps domain logic. Benefit: testable scheduler, reusable for other polling surfaces. Files: new module + test, `src/stores/generate-all-store.ts`.
6. **Shared `PreviewFrame` (selected, F6)**: extract the duplicated frame chrome. Files: new `src/components/landing/preview-frame.tsx`, both preview components.
7. **Deferred**: F8 file-size decomposition (ratchet, not scheduled); transactional RPC for intake creation (tracked elsewhere).
8. **Rejected as over-engineering**: generalizing the section registry into a cross-page framework; converting the export script to TypeScript.

## Phased Plan

- [ ] **Phase 1 (F1)**: Rewrite `billing-page-data.ts` on generated Row types; update `billing/page.tsx`; widen `project-allowance.ts` signatures and delete all 7 casts. Verify: `npm run typecheck`, `npm test` (project-allowance tests untouched).
- [ ] **Phase 2 (F4 + F6)**: Add `landing-preview-captures.mjs` manifest + loud-miss lookup; consume from `feature-product-preview.tsx` and the export script; delete dead `cropToId` read; extract `PreviewFrame` used by static + live previews. Verify: typecheck, build.
- [ ] **Phase 3 (F2)**: Registry-driven deferred sections in `scrollable-content.tsx`; containment derived from `SCROLLABLE_NAV_ITEMS`. Verify: `scrollable-content.test.tsx` green unmodified.
- [ ] **Phase 4 (F3)**: Pending-scroll-target reframe in `use-workspace-scroll-sync.ts`. Verify: typecheck + manual browser check of anchor navigation if feasible.
- [ ] **Phase 5 (F5)**: Extract `createVisibilityAwarePoller` (+ unit test, red-green); rewire `generate-all-store.ts` to use it and drop `(set, get)` threading in `doPoll`. Verify: new poller test + existing store test green.
- [ ] **Phase 6 (F7)**: Fix stale hero-artwork comment; `getCurrentUser` returns `supabase`; update call sites that currently double-create clients. Verify: typecheck.
- [ ] **Phase 7**: Update `PROJECT_CONTEXT.md` (new modules, billing data flow); full `npm run typecheck && npm run lint && npm test && npm run build`; browser spot-check landing + workspace if a dev server is available; mark plan implemented.

## Milestones

1. Billing boundary typed, casts gone (Phase 1).
2. Landing capture single source of truth (Phase 2).
3. Workspace containment registry-driven (Phase 3).
4. Scroll model deterministic (Phase 4).
5. Poller extracted and tested (Phase 5).
6. Hygiene + docs + full verification (Phases 6-7).

## Validation / Test Strategy

- Existing node:test suites must pass unmodified: `scrollable-content.test.tsx` (containment per section), `workspace-document-frame.test.tsx`, `generate-all-store.test.ts` (poll backoff), `project-allowance.test.ts` (structural client fakes must still satisfy the widened signature).
- New: `src/lib/visibility-aware-poller.test.ts` (schedule fires poll after delay; stop cancels; SSR-safe without `document`).
- `npm run typecheck`, `npm run lint`, `npm run build` (includes chunk guard).
- Browser: landing page renders static captures (public route, verifiable); workspace anchor navigation needs an authenticated project so manual verification may be limited to what the preview server allows.

## Risks

- **F3 is the only behaviorally sensitive change**: anchor navigation into contained documents. Mitigation: preserve the early target-existence bail, keep the programmatic-scroll suppression flag semantics, verify in browser where possible.
- **F1 type drift**: if any billing UI consumer relied on the old defaulted fields (e.g., `label ?? "Monthly"`), the typed Row makes those real columns; verified non-nullable in schema.
- **F4 `.mjs` import**: Next must bundle a `.mjs` import from a TS component; `allowJs` + bundler resolution supports this, and `npm run build` will prove it.
- **F5 rewiring**: polling regressions would surface as stuck Generate All UI; the poller keeps identical semantics (lazy listener, hidden-tab suppression, immediate poll on refocus).

## Rollback

Each phase is an independent, revertable commit-sized unit; `git checkout` the touched files per phase. No data, schema, or API changes anywhere.

## Open Decisions

None; A selected for Q1-Q3 per review recommendations and session autonomy policy.

## Critique (five perspectives)

- **Architecture**: The changes move knowledge to where it already lives (DB types, nav registry, one manifest) rather than adding layers; the only new abstractions (poller, PreviewFrame, section registry) each replace concrete duplication. No new coupling introduced.
- **Product/customer**: Zero intended user-visible change; the one guarded behavior improvement is that a missing landing capture now fails loud instead of showing a wrong screenshot. Scroll navigation must feel identical — that is the acceptance bar for Phase 4.
- **Engineering implementation**: Phase order puts mechanical, compiler-verified work first and the sensitive scroll change late with maximum context. The section registry must not become a knob farm — cap it at the two overrides the ai-prompts/mockups sections genuinely need.
- **Risk/security/ops**: No auth, RLS, payment, or webhook logic changes. Widening the allowance signature keeps the same runtime queries; the narrowing cast moves server-side into one audited location. The billing query itself is untouched in this pass.
- **Testing**: The weakest coverage is the scroll hook (no unit test surface, DOM-heavy); compensate with build + browser verification and by keeping its public API identical.

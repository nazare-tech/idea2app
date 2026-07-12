# Review: Project Page Mobile and Tablet Layout

Plan: `project-page-mobile-plan.md`. Implemented 2026-07-12.

## What shipped

- Mobile (< `lg`): slim header (back, truncated name, profile; no overflow menu), curved-top bottom peek bar with active-document status, documents bottom sheet listing every document and subsection with live generation status, hide-on-scroll chrome, composer as FAB + bottom sheet (free-plan upgrade sheet preserved), safe-area padding.
- `lg+` (desktop, landscape tablets): unchanged two-column layout, verified by regression checks.
- Foundations: `viewport-fit=cover` viewport export, `h-dvh` shells, shared `nav-status.tsx` primitives, `[scroll-padding-top]` so section jumps land under the mobile header.

## Plan deviations

- D3 (shared `MobileBottomSheet` primitive): the documents sheet inlines its overlay/sheet markup and the composer integrates sheet styling into its existing card, because the composer's card is also its desktop form factor; a wrapper primitive would have split one card across two DOM shapes. Two bespoke implementations share the same tokens/animation idiom instead.
- Sheet height fixed at `60dvh` (not content-driven with `max-h`) so the FAB's ride height above the open sheet is deterministic; the design's FAB-over-sheet behavior requires it.

## Verification

- `npm run typecheck` clean; `npx eslint` clean on all touched files (one `react-hooks/set-state-in-effect` finding during development fixed by deriving the disabled state instead of setting it).
- Focused runner suite unaffected (`node --import tsx --test src/lib/post-commit-review.test.ts` 17/17 pre-existing scope).
- Real-browser Playwright pass against the live dev server, signed in as the e2e user via the supabase cookie approach (creds never printed): 34/34 checks across 375x812, 768x1024 (mobile treatment), 1133x744 and 1440x900 (desktop treatment). Covers: chrome hide/return deltas, peek-bar label scroll-sync, sheet documents + subsections, subsection jump (hash `#prd-goals`, sheet close, chrome restore), FAB above open sheet, composer bottom sheet with chips, FAB restore, upgrade gating untouched (Internal Dev plan account exercises the paid path), no console errors, no horizontal overflow.
- Evidence: `ui-evidence/2026-07-12/project-page-mobile/01..09*.png`.
- Browser-pane caveat recorded: the in-app preview tab reports `visibilityState: "hidden"`, which suspends rAF-timed scroll event dispatch; scroll behaviors were therefore verified through Playwright (visible-page semantics) rather than the pane.

## Findings during implementation

- Fixed: opening the composer focused the textarea and scrolled the overflow-hidden workspace wrapper, dragging the mobile sheet off-screen (`focus({ preventScroll: true })`).
- Residual risk (accepted): iOS keyboard overlap with the composer input relies on browser-native focused-input scrolling; true-device verification not available this session.

## Per-commit cross-model review (Codex on 09fd0466)

- Fixed, major: the mobile sheet dropped the rail's Generate/Retry actions, leaving idle pending documents unstartable on phones (in-content `EmptyState` has no button either, confirmed). Sheet rows now render the same action policy as `AnchorNavTab`.
- Fixed, minor: the aria-modal documents sheet did not manage focus. Added initial focus, a Tab cycle within the sheet, and focus restoration to the opener.
- No change needed, minor: "architecture.md still describes the horizontal rail" was already addressed by the docs commit (`d943d3de`) that landed immediately after the reviewed code commit.

## Sweep + follow-up rounds (2026-07-12)

The same-day commit sweep (docs/reviews/commit-sweep-2026-07-12.md) and the per-commit reviews of its fixes touched this feature further: upgrade CTA variants became mount-gated by breakpoint (phantom `upgrade_cta_viewed` fix), both composer sheets gained shared modal focus semantics via `use-sheet-modal-focus` (extracted from the documents sheet), close now restores focus to the opener FAB, nav status/action policy moved into shared `nav-status` helpers, and AI-prompts readiness parsing is memoized. Browser suite re-ran green (34/34) after each round.

## Architecture improvement review

- Landed: status primitives extracted to `nav-status.tsx` (one source for rail + mobile chrome, removes drift risk the sweep would flag).
- Landed: hide-on-scroll isolated in a dedicated hook with a `suppress()` seam for programmatic jumps instead of overloading `useWorkspaceScrollSync`.
- Deferred: generic bottom-sheet primitive (see plan deviation; revisit if a third sheet appears).
- No new authorization surfaces, data shapes, or endpoints; composer API contract untouched.

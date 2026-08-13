# Dashboard Project Card Carousel Redesign Review

## Outcome

Implemented ordered A/B/C project-card mockup previews with strict project-scoped path validation, Figma-aligned 500px card geometry, desktop hover controls, keyboard-operable dots, touch swiping, unconditional project actions, and updated durable documentation.

## Verification

- Full `npm test`: 748 passed, 0 failed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with two warnings confined to ignored `output/` and `ui-evidence/` files; no tracked lint errors.
- Focused component/helper tests: 14 passed.
- `git diff --check`: passed.
- Authenticated browser evidence exists under `ui-evidence/2026-08-12/project-card-carousel-redesign/` for desktop option A, option B controls, and kebab menu.
- Playwright source covers desktop hover visibility, ordered A/B/C movement, dot-keyboard focus, URL stability, exact coarse-pointer self-check, CDP touch swipe, vertical/details gesture rejection, subsequent card navigation, and touch action-menu opening.
- Final focused Playwright rerun on 2026-08-12 did not reach carousel assertions: real sign-in returned `Request rate limit reached`, and both tests timed out waiting for `/projects`. This is an authentication-environment blocker, not a passing run or observed carousel failure; no repeated sign-in retry was attempted.

## Review Findings And Remediation

1. Pre-push review found the plan metadata still said `implemented: false` despite completed implementation. Metadata now reflects implementation.
2. The plan overstated four narrow browser checks: hybrid coarse-plus-hover input, clicks beside overlays, arrow focus retention, and authenticated image-request observation. Those checks are now explicitly left open rather than claimed complete.
3. Full lint exposed an already-committed synchronous state update in `WorkspaceDocumentFrame`. The follow-up uses `useDeferredValue` to preserve delayed re-containment without effect-driven state mutation; typecheck, lint, full tests, and focused frame tests pass.
4. Secret-pattern review found no credentials. One fake Stripe key remains intentionally inside a detector test fixture.

## Remaining Verification Gaps

- Add a hybrid-input browser context proving hover controls remain visible when a coarse pointer coexists with hover capability.
- Click known non-control coordinates beside dot/arrow overlays and assert card navigation.
- Prove focus ownership when a pointer-only arrow becomes unavailable at a carousel bound.
- Observe `/api/mockups/image` requests with cache disabled to quantify the accepted in-viewport three-image loading trade-off.

These are test-depth gaps, not known product failures. Core desktop, keyboard-dot, touch, security-path, and navigation behavior has direct coverage.

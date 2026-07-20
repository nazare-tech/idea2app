---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: Structural Work NAZ-134, NAZ-135, and NAZ-136

## Goal

Remove dead streaming paths, establish a tested decomposition pattern for oversized document renderers, and complete the workspace/review-tooling cleanup batch without changing product behavior or visuals.

## Assumptions

- Work stays on the current branch and preserves existing UI/document contracts.
- No database, API payload, billing, auth, or analytics contract changes are required.
- Existing uncommitted work, if any appears, remains user-owned and must not be overwritten.

## Clarifying Questions

1. How broadly should the renderer decomposition run?
   - Recommendation A: Fully decompose `first-version-plan-blocks.tsx`, apply the same boundary to one sibling, and leave the remaining monoliths as follow-up work.
   - Trade-off: Satisfies NAZ-135 with a reviewable pattern while limiting regression surface.
   - Recommendation B: Decompose all four oversized renderers now.
   - Trade-off: Completes more debt at once but creates a much larger visual-regression surface.
   - Selected: Recommendation A, per repo default and ticket acceptance criteria.
2. Should Motion Lab preserve removed competitive streaming variants?
   - Recommendation A: Remove the dead variants and make Motion Lab use the production `live-fill` behavior.
   - Trade-off: One truthful implementation; dev-only comparisons disappear.
   - Recommendation B: Copy legacy variants into Motion Lab.
   - Trade-off: Retains experiments but preserves dead complexity elsewhere.
   - Selected: Recommendation A; no evidence the legacy experiments remain valuable.
3. Should NAZ-136 land as one edit?
   - Recommendation A: Implement product cleanup first, then review-tooling dedup with its ledger/schema note and focused tests.
   - Trade-off: Easier verification and rollback; more checkpoints.
   - Recommendation B: Apply all items together.
   - Trade-off: Faster editing but mixes UI, intake, and git-hook risks.
   - Selected: Recommendation A.

## Recommended First Step

Lock production streaming behavior with focused tests, then remove unreachable variant branches and share the skeleton primitive.

## Runtime and Change-Impact Analysis

### Repeated Work

- Streaming documents rerender on queue polling (roughly every three seconds) plus local smoothed-tail ticks. Parsing remains memoized by raw content; smoothing remains owned by the leaf component.
- Workspace scroll/nav logic runs during scrolling and layout changes. Removing dead mobile branches must not alter large-screen rail behavior.
- Post-commit review runs once per code/workflow commit. Patch-id dedup adds one bounded git calculation and ledger lookup per run.

### Ownership, Scope, And Lifetime

- Streaming parse state remains local to each streaming renderer and dies when the saved document replaces it.
- Shared skeleton markup becomes a stateless analysis primitive.
- Layout dimensions become global CSS custom properties consumed by workspace chrome only.
- Review dedup state stays in the existing per-repository review ledger; no external persistence is introduced.

### Boundary And Cache Semantics

- No server/client, persistence, or generated-document contract changes.
- Renderer extraction changes module boundaries only; public component exports remain compatible except removal of the dev-only competitive variant prop.
- Review ledger gains a backward-compatible optional patch-id field; old entries remain readable.

### Failure And Recovery

- Renderer mistakes could hide or reorder document sections. Focused server-render tests plus real browser comparison detect this.
- CSS variable mistakes could shift mobile sheets/FAB/header offsets. Multi-viewport browser evidence detects this.
- Patch-id mistakes could skip a materially different review. Tests must prove identical diffs dedupe while changed diffs do not.
- Rollback is file-level; no data migration or irreversible state exists.

### Risk-Matched Verification

| Risk | Evidence | Acceptance threshold |
|---|---|---|
| Streaming content or skeleton regression | Focused streaming unit/component tests | All focused tests pass; production `live-fill` snapshots/markup unchanged except removed dev controls |
| Renderer extraction changes output | Existing renderer tests plus added parser/derive tests | Existing assertions pass; extracted logic covers current-format and legacy fallbacks |
| Workspace visual/layout regression | Real Chrome at mobile, tablet, desktop viewports | Sheets, FAB, header, rail, and generated document match prior visible behavior |
| Intake cleanup changes answers | Focused intake unit tests | Supported single-select behavior unchanged; removed unreachable branch has no remaining caller/test |
| Review dedup skips novel diffs | Post-commit review integration tests | Same stable patch skips; any content-changing patch reviews; legacy ledger still works |

## Architecture Improvement Opportunities

- Shared streaming skeleton primitive — selected. Removes duplicated visual markup with no behavior change; affects planning/competitive streaming components and shared analysis blocks.
- Parser/derive modules for document renderers — selected. Shrinks component files and gives pure logic direct tests; first-version plus one sibling only to contain risk.
- Shared workspace layout tokens and sheet animation/overlay styles — selected. Removes cross-file literals; affects `globals.css` and workspace chrome.
- Generic mobile bottom-sheet component — deferred. Third usage now exists, but focus-trap/opener differences make extraction larger than this mechanical cleanup.
- Full decomposition of every 1,000-line renderer — deferred. Valuable, but disproportionate regression surface for this batch.
- New review-ledger database or global cache — rejected as over-engineering. Repository-local ledger already owns this state.

## Plan

1. NAZ-134: add/adjust focused tests; collapse competitive streaming to production behavior; make shipping planning component consume the tested assembly path; share skeleton primitive; run focused tests and typecheck.
2. NAZ-135: extract pure parsing/derivation and cohesive block groups from First Version Plan; apply documented boundary to one sibling; add unit coverage; run renderer tests and typecheck.
3. NAZ-136 product cleanup: centralize sheet animation/overlay/layout tokens; remove dead anchor-nav, fallback, and intake branches; update affected tests/docs; run focused tests and real UI verification.
4. NAZ-136 tooling cleanup: document ledger schema, add stable patch-id dedup and shared code-path classification, red-green integration tests, then full test/typecheck/lint.
5. Fresh-eyes passes, architecture/bug/security review, remediation, final full verification, browser evidence, and plan/review completion.

## Milestones

- Streaming truthful: only shipped behavior remains and tests exercise it.
- Renderer pattern proven: target under roughly 600 lines and one sibling follows the same boundary.
- Cleanup complete: all six NAZ-136 groups resolved with behavior unchanged.
- Verification complete: unit/type/lint/browser checks and review remediation recorded.

## Validation

- Focused Node tests after each phase, then `npm test`, `npm run typecheck`, and lint/build commands supported by the repo.
- Real authenticated Chrome verification using existing dev server/session at representative mobile and desktop viewports; evidence saved under `ui-evidence/2026-07-12/structural-work-naz-134-136/`.
- Review-tooling integration tests use temporary repositories and fake reviewer scripts; no real reviewer calls during test execution.

## Risks And Mitigations

- Large file moves obscure behavior changes: keep moves mechanical, preserve exports, compare rendered tests before/after.
- Concurrent edits overlap: assign agents non-overlapping file groups and integrate sequentially.
- Review patch-id collisions or amend semantics: use `git patch-id --stable`, scope lookup to successful reviews, test message-only and content-changing commits.
- Visual cleanup accidentally redesigns UI: no class/value changes beyond named equivalents; verify screenshots.

## Rollback Or Recovery

- Revert each phase independently. Optional ledger fields require no migration; removing them restores prior behavior. No persisted product data changes.

## Open Decisions

- None. Recommendation A selected per repository policy.

## Critique

### Software Architect

- Three tickets span unrelated layers. Phase boundaries are essential; full renderer decomposition in one pass would be hard to review and recover.

### Product Manager

- User value is indirect: lower regression risk and faster future document work. Visual redesign would dilute that goal and is excluded.

### Customer Or End User

- Success means no visible change except fewer latent bugs. Browser comparison matters more than new UI assertions.

### Engineering Implementer

- Mechanical extraction can still alter import cycles and client boundaries. Pure modules should avoid React/client imports where possible.

### Risk, Security, Or Operations

- Product security surface is unchanged. Review dedup must fail open to performing a review when patch identity cannot be computed or ledger state is ambiguous.

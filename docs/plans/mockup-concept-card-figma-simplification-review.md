# Review: Mockup Concept Card Figma Simplification

## Scope
- `src/components/ui/mockup-renderer.tsx`
- `src/components/ui/mockup-renderer.test.tsx`
- Figma node `344:10105` in `MakerCompass`

## Verification
- Red state: `npm test -- src/components/ui/mockup-renderer.test.tsx` failed because the old renderer still displayed screen-caption chips (`Intake complete`, `Capture context`).
- Green state: `npm test -- src/components/ui/mockup-renderer.test.tsx` passed. The repo script ran 348 tests.
- `npm run typecheck` passed.
- `npm run lint` passed with one unrelated pre-existing warning in `output/playwright/prod-full-flow.mjs`.
- `git diff --check` passed.
- UI evidence: blocked. The Next dev server could not be started normally due sandbox port binding (`EPERM`). An escalated dev start found ports/processes already present but the workspace `.next/dev/lock` was held; shell `curl` could not reach ports 3000 or 3001. The Codex in-app browser rejected `localhost`, `127.0.0.1`, and the reported network address with `net::ERR_BLOCKED_BY_CLIENT`. Playwright fallback was also unavailable because its browser profile was already in use by another session. No screenshot was captured.

## Fresh-Eyes Self Review
- Pass 1: Reviewed the OpenRouter storyboard renderer branch after the patch. No issue found; the visible screen-chip branch was removed while keeping stored `screens` metadata untouched.
- Pass 2: Reviewed the focused test and renderer again for accidental Option label regression, download/lightbox breakage, or empty rationale rendering. No issue found.

## Code Review Findings
- None.

## Architecture Improvement Review
- Selected opportunity landed: compatible typed content shape was preserved. `screens` remains parsed/stored but is no longer rendered as a separate chip grid in the simplified concept card.
- Deferred opportunities remain deferred: extracting a dedicated concept-card component is not necessary for this small branch; prompt-level rationale normalization is not required because the renderer handles existing saved descriptions.
- No new duplication, brittle storage contract, non-idempotent path, authorization gap, or recovery blind spot was introduced.

## Security Review Findings
- None. This is a presentational renderer change. Existing authenticated image proxy URLs, download behavior, and lightbox behavior are unchanged.

## Remediation Checklist
- [x] Remove visible screen-caption chips from OpenRouter storyboard cards.
- [x] Match Figma card spacing/border/header/image/rationale treatment.
- [x] Preserve existing stored mockup content compatibility.
- [x] Update focused renderer test.
- [x] Record browser verification blocker.

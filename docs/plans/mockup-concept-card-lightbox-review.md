# Review: Mockup Concept Card Lightbox

## Scope
- `src/components/ui/mockup-renderer.tsx`
- `src/components/ui/mockup-renderer.test.tsx`
- OpenRouter storyboard mockup rendering only; no backend, storage, auth, or generation pipeline changes.

## Verification
- Red state confirmed first: `npm test -- src/components/ui/mockup-renderer.test.tsx` failed because the renderer still showed Option A/B/C labels and lacked the image lightbox trigger.
- Green state: `npm test -- src/components/ui/mockup-renderer.test.tsx` passed. The repo script runs all `src/**/*.test.ts(x)` files plus the requested file; 374 tests passed.
- `npm run lint` passed with one pre-existing warning in `output/playwright/prod-full-flow.mjs` for unused `pageText`.
- `npm run typecheck` passed.
- Browser verification through the in-app browser on `http://localhost:3000/dev/mockup-renderer-preview` confirmed:
  - Concept 1 card uses Concept copy and no visible Option A text in the card text.
  - Export Image remains visible.
  - Image trigger cursor computes to `zoom-in`.
  - Clicking the image opens a modal dialog labeled `Concept 1 mockup preview`.
  - Close button is present and dismisses the dialog.
  - Escape also dismisses the dialog.
- UI evidence:
  - `ui-evidence/2026-07-01-mockup-lightbox/preview-concept-card-unified.png`
  - `ui-evidence/2026-07-01-mockup-lightbox/preview-lightbox-open.png`

## Verification Limitation
- The user-selected project route required auth/session recovery during browser verification. It loaded successfully afterward, but exact-route screenshot capture timed out twice in the browser controller. The interaction was therefore verified on the local renderer preview route that uses the same `MockupRenderer` component, while the server logs confirmed the project route and mockup image proxy requests were serving successfully.

## Fresh-Eyes Self Review
- Pass 1 reviewed the changed renderer and tests. Found a JSX indentation readability issue around the image button and fixed it.
- Pass 2 reviewed the final diff after the cleanup. No additional issues found.
- Reran focused test suite, lint, and typecheck after the cleanup.

## Code Review Findings
- No blocking findings.
- Internal A/B/C option labels are still preserved for data lookup and download filenames, while visible card labels are derived from render index as Concept 1/2/3. This avoids unnecessary storage/data-shape changes.
- The old fixed `min-w-[960px]` image wrapper was removed so the image fits inside the unified card; lightbox handles closer inspection.

## Security Review Findings
- No security findings.
- The lightbox only renders already-authorized image URLs already present in the mockup data. No auth, RLS, persistence, external API call, secret handling, or user input parsing changed.

## Remediation Checklist
- [x] Remove duplicate visible Option/Command Center header above the image.
- [x] Move image into the concept card.
- [x] Rename visible card labels to Concept 1/2/3.
- [x] Add zoom cursor and click-to-lightbox behavior.
- [x] Add close button and Escape close behavior.
- [x] Verify with tests, lint, typecheck, and browser evidence.

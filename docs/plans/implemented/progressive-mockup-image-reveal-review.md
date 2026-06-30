# Review: Progressive Mockup Image Reveal

## Scope
- Progressive draft mockup rendering in `ProjectWorkspace`, `ScrollableContent`, and `MockupRenderer`.
- Draft image URL/path authorization in `/api/mockups/image`.
- Queue run-id threading for Generate All/onboarding mockup storage recovery.
- Dev preview and tests for partial storyboard rendering.

## Verification
- `node --import tsx --test src/lib/openrouter-image-mockup-pipeline.test.ts`
- `node --import tsx --test src/components/ui/mockup-renderer.test.tsx`
- `npm run typecheck`
- `npm run lint` — passes with one existing warning in `output/playwright/prod-full-flow.mjs`.
- `npm test`
- `git diff --check`
- Browser visual verification at `http://localhost:3000/dev/mockup-renderer-preview`: partial preview showed three concept cards, one rendered image, and two generating placeholders.

## Fresh-Eyes Review
- Pass 1 reviewed draft URL generation, image proxy authorization, queue run-id threading, and draft renderer props. Fixed draft SVG content-type rejection and updated `PROJECT_CONTEXT.md`.
- Pass 2 reviewed UI state flow from recovered options to renderer placeholders. Added a renderer test and dev preview partial state for visual verification.

## Code Review Findings
- No blocking findings.
- Low residual risk: Generate All/onboarding still starts all three image calls in parallel; progressive reveal depends on each option uploading before the overall `Promise.all` returns. That is true in the current `generateAndStoreOption` implementation.

## Security Review Findings
- No blocking findings.
- Draft image proxy remains authenticated and project-owner scoped.
- Draft paths are constrained to exact `projectId/runId/option-{a,b,c}-storyboard.{png,jpg,jpeg,webp}` storage paths.
- Draft SVG responses are rejected even if a stored object reports `image/svg+xml`.

## Remediation Checklist
- [x] Keep canonical `mockups` finalization strict at three options.
- [x] Add draft run id to draft image proxy URLs.
- [x] Add exact draft path validation.
- [x] Add progressive concept placeholders and draft option rendering.
- [x] Add test coverage for draft URL/path validation and partial renderer placeholders.
- [x] Update project context documentation.

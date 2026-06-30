# NAZ-87 Explainable Terms Review

## Scope
- Added static glossary copy in `src/lib/explainable-terms.ts`.
- Added reusable tooltip affordances in `src/components/analysis/explainable-term.tsx` and `src/components/ui/tooltip.tsx`.
- Integrated section-level icon buttons and inline dotted-label treatment into structured artifact renderers.
- Removed the obsolete static animation prototype route and docs because it did not validate the real onboarding/workspace path.
- Added a real-environment verification rule to `AGENTS.md`.

## Review Notes
- Tooltip text is rendered as React text, not HTML, so generated artifact content is not injected into tooltip markup.
- Section-level controls are icon-only but include `aria-label` and `aria-expanded`.
- Repeated risk labels only expose Impact/Mitigation help on the first risk row to avoid visual noise.
- `ScrollableContent` now has a timeout fallback for deferred section rendering so below-the-fold artifact sections do not remain stuck if `requestAnimationFrame` does not fire promptly.

## Verification
- `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx src/components/analysis/competitive-analysis-document.test.tsx`
- `npm run typecheck`
- `npm run lint` passed with the existing unrelated warning in `output/playwright/prod-full-flow.mjs`.
- Real dev server used `.env.local`; stale `.next/dev/lock` was removed after confirming port 3000 was not reachable.
- The removed static animation prototype route returned `404 Not Found` before the server was stopped.
- Real e2e Supabase data confirmed current structured artifacts exist for the checked project, and authenticated browser debug confirmed explain controls render in the actual workspace.

## Residual Risk
- Full click-and-screenshot verification against the heavy real Product Plan page was flaky in headless Chromium, even though the real page rendered the controls and component tests cover click-open tooltip behavior.

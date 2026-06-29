# Review: Project Dashboard Scroll Sync

## Scope
- `src/components/layout/anchor-nav.tsx`
- `src/components/workspace/project-workspace.tsx`
- `src/app/globals.css`
- `src/lib/workspace-scroll-sync.ts`
- `src/lib/workspace-scroll-sync.test.ts`
- `src/components/analysis/planning-document-blocks.tsx`
- `src/components/analysis/planning-document-blocks.test.tsx`

## Verification
- Red test first: `npm.cmd run test -- src/lib/workspace-scroll-sync.test.ts` failed because `workspace-scroll-sync` did not exist yet.
- Focused green test: `node --import tsx --test src/lib/workspace-scroll-sync.test.ts` passed.
- Full test suite: `npm.cmd run test` passed, 215 tests.
- Lint: `npm.cmd run lint` passed with existing warnings, no errors.
- Build: first `npm.cmd run build` failed because sandboxed network could not fetch Google Fonts. Reran with approved network access and build passed, including the chunky/vendor guard.
- Headless browser check: Puppeteer reached `http://localhost:3000/dashboard`, but the route redirected to `/auth?redirect=%2Fdashboard`, so a real authenticated project dashboard visual pass could not be completed in this session.
- Console warning fix: `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx` passed after adding duplicate user story ID coverage.

## Code Review Findings
- No blocking findings.
- The hidden scrollbar CSS is scoped to `.workspace-anchor-nav`, so global scrollbars remain unchanged.
- The nav rail keeps wheel/touch/keyboard scroll behavior while hiding scrollbar chrome.
- The active-target selection now uses deterministic nearest-above-marker logic instead of depending on observer entry order.
- The rail auto-scroll aligns the active main section to the top of the rail. Subsections can remain highlighted, but they do not become the top-aligned rail target.
- PRD user story cards now use a render-position suffix in their React key, so repeated generated IDs like `US-002` keep their visible labels without causing duplicate-key warnings.

## Security Review Findings
- No security findings. The change is client-side presentation and scroll state only.
- No authentication, authorization, secrets, payments, API routes, database reads/writes, or external service calls were added.
- URL hash updates remain local browser history updates and do not introduce server trust boundaries.

## Remediation Checklist
- [x] Remove stale observer comment after replacing the observer implementation.
- [x] Verify build after the sandbox font-fetch failure with approved network access.
- [x] Document the visual verification limitation caused by the protected dashboard route.
- [x] Adjust rail-follow behavior from reveal-only to top alignment.
- [x] Refine rail top alignment to use the main section, not the active subsection.
- [x] Fix duplicate React key warning for repeated generated PRD user story IDs.

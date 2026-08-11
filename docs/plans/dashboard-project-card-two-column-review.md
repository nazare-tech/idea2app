# Review: Two-Column Project Dashboard Cards

## Outcome

Implemented and verified. `/projects` now renders at most two fluid cards across the fixed desktop content area, while narrow screens retain one contained card. Card geometry matches the updated Figma master closely: 500px total height, 162px details, and approximately 297px of padded media canvas.

## Scope

- Grid minimum changed from 420px to 430px inside the existing `auto-fill`/`minmax(min(100%, ...), 1fr)` rule.
- Card height changed from 430px to 500px.
- Details panel and aligned action overlay changed from 188px to 162px.
- Thumbnail canvas cap changed from 200px to 300px; live layout resolves to 296.758px after border and padding.
- Architecture, component-test inventory, and authenticated smoke geometry were synchronized.

## Plan Evaluation

- `dashboard-project-card-two-column-plan-eval.md`: reviewer outage; zero-byte response.
- `dashboard-project-card-two-column-plan-eval-v2.md`: reviewer outage on retry; zero-byte response.
- No cross-model plan coverage is claimed.

## Verification

- Red phase: focused component run produced three expected failures against old 188px/200px geometry.
- Focused components: 10 passed.
- TypeScript: `npm run typecheck` passed.
- ESLint: touched source, component tests, and E2E spec passed.
- Full unit suite: 746 passed, 0 failed.
- Focused authenticated Playwright: project-card rename/delete test passed, including new desktop/narrow geometry assertions.
- `git diff --check`: passed.

## Real UI Evidence

- Route: `http://localhost:3000/projects` in connected Chrome, existing authenticated account, 23 existing projects, no generation or credit spend.
- Desktop CSS viewport: 2000×1250. Grid: `648.008px 648.008px`; column/row gaps: 32px; card: 648.008×500px; details: 161.992px; canvas: 296.758px; no horizontal overflow.
- Narrow CSS viewport: 390×844. Grid/card width: 352.383px; one column; card: 500px; details: 161.992px; canvas: 296.758px; no page or card horizontal overflow.
- Screenshots:
  - `ui-evidence/2026-08-11/project-card-two-column/projects-desktop.png`
  - `ui-evidence/2026-08-11/project-card-two-column/projects-narrow.png`
- Chrome logged only browser-extension message-channel closure errors; no app layout/runtime error was observed.

## Fresh-Eyes Code Review

- Independent read-only reviewer: NO FINDINGS.
- Confirmed 430px × 3 plus two 32px gaps requires 1354px, exceeding the 1328px content maximum; two tracks resolve to 648px.
- Confirmed 162px details content math fits with approximately 1.2px slack and the existing browser containment assertion covers every panel.
- Confirmed action-overlay alignment, narrow `min(100%,430px)` containment, and E2E tolerances.
- Architecture improvement review: selected existing-grid threshold adjustment and synchronized details/action height landed. Dimension-module and container-query ideas remain correctly rejected/deferred.

## Security Review

- No auth, authorization, secrets, input, persistence, API, billing, analytics, or external-call boundary changed.
- Security remediation: none required.

## Remaining Risk

- None known. Visual proportions depend on current 1px border and 20px media padding; the E2E geometry guard will fail if those drift.

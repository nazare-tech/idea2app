---
title: Landing and Projects Cartographic Theme Trial
status: complete
implemented: true
implemented_at: 2026-08-13T05:38:05Z
implementation_summary: Scoped the cartographic editorial theme to `/` and exact `/projects`, preserved landing content, and verified the result in real Chrome.
date: 2026-08-12
---

# Goal

Apply the approved Newsreader-led, paper/ink/ultramarine visual direction to the public landing page and the `/projects` dashboard so it can be judged in the real product. Preserve every landing-page word, conditional copy branch, link target, and section order.

# Assumptions and decisions

- “Project page” means the `/projects` dashboard, not an individual `/projects/[projectRef]` workspace.
- Recommendation A: scope theme variables to `/` and exact `/projects`. This creates a reversible visual trial without changing workspace, auth, billing, or informational pages.
- Recommendation B: replace global brand tokens. Rejected because it would silently restyle product surfaces outside requested comparison.
- Typography: Newsreader for display headings, Public Sans for body and interface text, JetBrains Mono for technical labels.
- Palette: paper `#F4F1E8`, surface `#FCFBF7`, ink `#18202A`, muted ink `#4F5966`, ultramarine `#2457E6`, dark blue `#173BA4`, hairline `#D8D2C4`.
- UI UX Pro Max database confirmed Newsreader as an editorial/readable heading family and recommended `next/font`; its generic AI-purple result is intentionally rejected because the user explicitly chose the cartographic blue direction.
- Cross-model plan evaluation skipped: bounded iterative styling only, no architecture, data, auth, billing, migration, or persistence boundary.

# Implementation

1. Register Newsreader, Public Sans, and JetBrains Mono through `next/font` at root layout.
2. Add one scoped theme class with semantic color and font overrides.
3. Apply that class to landing root and exact `/projects` dashboard shell.
4. Replace relevant hard-coded white/warm surfaces in landing artwork and project cards with semantic tokens where needed for the scoped theme to render coherently.
5. Preserve existing dimensions, responsive layout, interactions, accessibility labels, and landing content.

# Verification

- Focused landing/component tests; update exact styling contracts only when semantic tokenization replaces equivalent hard-coded classes.
- Typecheck and lint.
- Diff audit confirming landing copy and section structure are unchanged.
- Real Chrome, Plasma profile: `/` and authenticated `/projects` at desktop and narrow viewport; screenshots under `ui-evidence/2026-08-12/landing-projects-cartographic-theme/`.
- Confirm no horizontal overflow, visible focus states, readable contrast, and unchanged project-card geometry/interaction.

# Rollback

Remove the two scoped theme class applications, scoped variables, and new font registrations. Semantic surface tokens can remain because their default values match prior colors.

# Critique and change impact

- Product/customer: stronger editorial authority and a more ownable planning aesthetic; risk is serif headings feeling less tool-like. Real-page comparison is the intended decision input.
- Engineering/architecture: scoped CSS variables keep change reversible and avoid duplicated page-specific utility rewrites. No runtime/data-flow changes.
- Accessibility: selected ink/blue pairs target AA contrast; real browser inspection still required.
- AI generation, queues, polling/streaming, shared state, payloads, caches, billing, persistence: unaffected.

## Architecture improvement opportunities

- **Selected:** scoped semantic theme boundary. Benefit: reusable, reversible experiment. Trade-off: a small pathname condition in dashboard shell.
- **Selected:** convert local hard-coded surfaces to semantic tokens where default rendering stays equivalent. Benefit: theme inheritance and fewer color exceptions.
- **Deferred:** global brand-token migration. Too broad for requested trial.
- **Rejected:** new theme provider/dependency. Existing CSS variables already provide sufficient isolation.

# Implementation review

- Final read-only review found no route-scope or landing-content regressions.
- Remediated review findings: darkened small-label ink from `#657180` to `#5E6875` (5.01:1 on paper, 4.62:1 on secondary), completed the approved JetBrains Mono pairing, and synchronized system docs.
- Security: no auth, ownership, persistence, billing, external-call, or secret boundary changed. No security-specific review required.
- Architecture: selected scoped theme boundary landed; global token migration remains deferred. No new dependency or provider was introduced.

# Verification results

- `node --import tsx --test ...`: 24 focused tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: 0 errors; two pre-existing warnings in ignored evidence/output files.
- `git diff --check`: passed.
- Real Chrome, Plasma profile:
  - `/`, 1440×900: paper background, Public Sans interface, Newsreader hero, ultramarine actions, no horizontal overflow.
  - `/`, narrow responsive viewport: themed hero and idea capture fit without document overflow.
  - Authenticated `/projects`, desktop and narrow responsive viewport: scoped palette/type, blue controls and mark, preserved white mockup canvases, project grid responsive, no horizontal overflow.
  - Individual `/projects/[projectRef]`: theme marker absent; default Hanken/Warm Horizon rendering retained.
- Evidence: `ui-evidence/2026-08-12/landing-projects-cartographic-theme/landing-desktop-1440x900.png`, `landing-mobile-390x844.png`, `projects-desktop-1349x1121.png`, and `projects-mobile-390x844.png`.
- Remaining low risk: final review's JetBrains Mono and darker muted-token refinements were validated by typecheck/lint and computed contrast after Chrome evidence was finalized; screenshots show the preceding Fira/small-label rendering, while layout and primary palette are final.

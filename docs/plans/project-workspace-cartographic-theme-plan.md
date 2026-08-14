---
title: Project Workspace Cartographic Theme Trial
status: complete
implemented: true
implemented_at: 2026-08-13T06:08:00Z
implementation_summary: Extended the scoped cartographic theme to valid project workspaces, semanticized visible workspace chrome and shared document surfaces, and added a theme-only compatibility layer for legacy planning-document neutrals.
date: 2026-08-12
---

# Goal

Extend the approved Newsreader, Public Sans, JetBrains Mono, paper, ink, and ultramarine visual trial from the landing page and `/projects` dashboard to individual `/projects/[projectRef]` workspaces. Keep `/projects/new` and all non-project routes on the established Warm Horizon theme.

# Decisions

- Reuse the existing `.makercompass-editorial-theme` semantic-token boundary; do not add a provider or dependency.
- Mount the theme marker on the existing `ProjectWorkspace` root, which only valid `/projects/[projectRef]` pages render; `/projects/new` cannot inherit it.
- Replace visible workspace-specific warm literal utilities with semantic color tokens so both themes remain coherent.
- Keep status colors, generated mockup imagery, project data, copy, layout, interactions, generation, billing, and persistence unchanged.
- Cross-model plan evaluation skipped: this is a bounded visual extension with no data, auth, billing, migration, or architecture change.

# Implementation

1. Add the theme marker to the existing individual-project workspace root.
2. Use the blue MakerCompass mark in the workspace header.
3. Tokenize the document rail, mobile document sheet, document mastheads, and Market Research surfaces that still encode the old palette.
4. Synchronize the visual-system documentation.

# Verification

- Run focused workspace/component tests, typecheck, lint, and `git diff --check`.
- Run one read-only implementation review.
- Verify an authenticated workspace in real Chrome at desktop and narrow widths.
- Confirm Newsreader headings, Public Sans UI text, JetBrains Mono labels, paper/ink/blue tokens, no horizontal page overflow, usable mobile chrome, and no theme marker on `/projects/new`.

# Rollback

Restore the exact `/projects` marker condition, the default workspace logo, and the workspace color literal classes. No data rollback is required.

# Verification results

- 23 focused workspace/document tests passed.
- Full test suite passed: 748 tests, 0 failures.
- `npm run typecheck` passed.
- `npm run lint` passed with 0 errors and two pre-existing warnings in evidence/output files.
- `git diff --check` passed.
- Final review findings were remediated: all legacy planning-document neutrals now translate through the scoped theme, small legacy muted labels use the accessible theme token, and explicit mono/sans headings are excluded from the Newsreader heading rule.
- Real Chrome verification was attempted with the required Plasma profile and real `.env.e2e.local` account. Supabase returned `429 Request rate limit reached`; the existing browser refresh token was also expired. Per UI verification policy, no auth bypass or fixture was used, so authenticated desktop/mobile screenshot evidence remains blocked until the provider limit clears.
- Local dev server remains available at `http://localhost:3000`.

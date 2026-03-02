# Duplicate Styles Consolidation TODO

## Goal
Reduce repeated inline style patterns (colors, spacing, typography, and class bundles) found across the codebase into shared tokens, variants, and reusable primitives.

## 1) Palette / color token consolidation
- [ ] Add canonical color tokens in `src/app/globals.css` (or existing design token layer).
  - [ ] `--color-text-primary: #0a0a0a`
  - [ ] `--color-text-secondary: #666666`
  - [ ] `--color-text-muted: #999999`
  - [ ] `--color-text-accent: #00d4ff`
  - [ ] `--color-border-subtle: #e0e0e0`
  - [ ] `--color-border-strong: #e5e5e5`
  - [ ] `--color-accent-primary: rgba(0,212,255,0.15)`
  - [ ] `--color-accent-primary-light: rgba(0,212,255,0.4)`
  - [ ] `--color-surface-soft: rgba(255,255,255,0.03)`
  - [ ] `--color-surface-mid: rgba(255,255,255,0.06)`
  - [ ] `--color-surface-strong: rgba(255,255,255,0.08)`
- [ ] Migrate repeated hex/rgba usages in these files to tokens:
  - `src/app/page.tsx`
  - `src/app/(dashboard)/settings/page.tsx`
  - `src/app/(dashboard)/projects/page.tsx`
  - `src/components/layout/header.tsx`
  - `src/components/layout/sidebar.tsx`
  - `src/components/projects/dashboard-project-card.tsx`
  - `src/components/projects/inspiration-projects-section.tsx`
  - `src/components/analysis/analysis-panel.tsx`
  - `src/components/chat/chat-interface.tsx`
  - `src/components/ui/badge.tsx`
  - `src/components/ui/input.tsx`
  - `src/components/ui/textarea.tsx`
  - `src/components/ui/tabs.tsx`
- [ ] Keep rare error/success accent colors local unless reused elsewhere (`ff3b30`, `f472b6`, `ff6b8a`, etc. are currently lower-duplication).

## 2) Typography token cleanup
- [ ] Centralize repeated text utility tokens through global classes or shared component props:
  - [ ] `text-sm` + `text-muted-foreground`
  - [ ] `font-semibold`
  - [ ] `font-medium`
  - [ ] `text-xs`
  - [ ] `tracking-tight`
  - [ ] `font-mono`
- [ ] Replace hard-coded font declarations in generated code paths:
  - [ ] `font-weight: 600` in `src/app/api/generate-pdf/route.ts` and `src/app/globals.css`
  - [ ] `line-height`, `font-weight: 700`, and related one-off declarations where semantically similar.
- [ ] Audit repeated class combinations and move into shared helpers/components:
  - [ ] `text-lg font-bold tracking-tight` (currently reused in app header/sidebar and analysis headings)
  - [ ] `text-sm font-semibold uppercase tracking-[0.14em] text-primary` (used on multiple marketing section labels)

## 3) Spacing/padding pattern consolidation
- [ ] Create reusable spacing variants for the most repeated utility groupings.
  - [ ] `px-4`
  - [ ] `p-4`
  - [ ] `px-3`
  - [ ] `px-8`
  - [ ] `py-2`
  - [ ] `py-3`
  - [ ] `py-1.5`
  - [ ] `px-6`
- [ ] Replace recurring full class bundles with semantic primitives/components in:
  - [ ] `src/app/(auth)/forgot-password/page.tsx`
  - [ ] `src/app/(auth)/login/page.tsx`
  - [ ] `src/app/(auth)/reset-password/page.tsx`
  - [ ] `src/app/(auth)/signup/page.tsx`
  - [ ] `src/components/layout/content-editor.tsx`
  - [ ] `src/components/ui/input.tsx`
  - [ ] `src/components/ui/textarea.tsx`
  - [ ] `src/components/ui/inline-ai-editor.tsx`
  - [ ] `src/components/ui/markdown-renderer.tsx`

## 4) Extract repeated class bundles into reusable components
- [ ] Replace repeated exact bundles:
  - [ ] `h-4 w-4` (icon sizing)
  - [ ] `text-sm text-muted-foreground`
  - [ ] `flex items-center gap-3`
  - [ ] `flex items-center justify-between`
  - [ ] `flex items-center gap-2`
  - [ ] `space-y-2` / `space-y-6`
- [ ] Candidate extraction targets:
  - [ ] `src/components/analysis/analysis-panel.tsx` (highest cluster density)
  - [ ] `src/app/(dashboard)/settings/page.tsx`
  - [ ] `src/app/page.tsx`
  - [ ] `src/components/layout/sidebar.tsx`

## 5) Add migration safety checklist
- [ ] Replace class strings using token variables in each touched file.
- [ ] Keep behavior identical (visual diffs should be only noise-level)
- [ ] Add TODO markers for any style that must remain intentionally unique.
- [ ] Run a final scan for duplicated patterns not covered above.

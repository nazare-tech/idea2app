---
title: Editorial Fonts with Warm Horizon Palette
status: complete
implemented: true
implemented_at: 2026-08-13T20:30:00Z
implementation_summary: Restored Warm Horizon color inheritance and the default red mark while retaining scoped Newsreader, Public Sans, and JetBrains Mono typography across landing, projects dashboard, and valid project workspaces.
date: 2026-08-13
---

# Goal

Restore MakerCompass's established Warm Horizon colors on `/`, exact `/projects`, and valid `/projects/[projectRef]` workspaces while retaining Newsreader for display headings, Public Sans for interface/body text, and JetBrains Mono for technical labels.

# Decisions

- Preserve commit `ba6cef4a` as the blue cartographic checkpoint.
- Replace the old theme marker with a typography-only marker so its scope is honest.
- Remove all scoped paper/ink/ultramarine token overrides; inherited root tokens become the visual source of truth again.
- Restore the default Action Red brand mark by removing blue logo overrides. Keep the committed blue SVG on disk as a reversible checkpoint asset; do not delete it without approval.
- Keep semantic-token conversions. Remove the cartographic compatibility layer so surviving authored Warm Horizon literals render exactly as before.
- Preserve all content, layout, interaction, auth, generation, billing, and persistence behavior.

# Verification

- Focused landing/workspace component tests, full typecheck, lint, and `git diff --check`.
- Read-only implementation review.
- Real Chrome check on the landing page; authenticated dashboard/workspace check if the real test account rate limit has cleared.
- Confirm red primary actions/mark, established warm neutrals, Newsreader headings, Public Sans body/UI, JetBrains Mono labels, and no horizontal overflow.

# Rollback

Revert this follow-up diff or restore the color overrides and blue-logo props from `ba6cef4a`.

# Verification results

- Current blue cartographic state was checkpointed first as `ba6cef4a feat(ui): apply cartographic visual theme`.
- 29 focused landing/workspace/document tests passed.
- `npm run typecheck` passed.
- `npm run lint` passed with 0 errors and two pre-existing warnings in evidence/output files.
- `git diff --check` passed.
- Real Chrome, Plasma profile, landing desktop 1349×1121: `--primary: #DC2626`, `--background: #FAFAFA`, default `/maker-compass-mark.svg`, Public Sans body, Newsreader H1, JetBrains Mono labels, no horizontal overflow.
- Narrow responsive Chrome check: same fonts and red primary, no horizontal overflow. Browser reported an effective 487×1055 viewport after the requested narrow override.
- Evidence: `ui-evidence/2026-08-13/editorial-fonts-warm-horizon/landing-desktop.png` and `landing-narrow-487x1055.png`.
- `/projects` redirected to real auth because the stored session remains expired; authenticated dashboard/workspace verification is still blocked without another login attempt while the provider rate limit is active. No auth bypass or fixture was used.

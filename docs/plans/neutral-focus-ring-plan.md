---
implemented: true
implemented_at: 2026-07-19T03:20:00Z
implementation_summary: All focus indicators moved from Action Red to warm dark gray (--ring #4A4040 + soft/faint variants) across globals.css, 16 component/preset files, DESIGN.md, and DESIGN.json; verified with live focus screenshots under ui-evidence/2026-07-19/neutral-focus-ring/.
---

# Plan: Neutral Focus Rings (Action Red Reserved for Primary Actions)

## Goal
Focus indicators stop using Action Red. `#DC2626` outlines/rings/glows on inputs, chips, links, and buttons become a warm dark gray so red appears only on primary actions and commit affordances. Applies project-wide, including the design guideline files that currently sanction red focus.

## Assumptions
- User decision overrides DESIGN.md line 133 ("the `:focus-visible` ring" listed under Action Red) and line 219 ("controlled red-tinted glow"); both guideline files update in the same change.
- Target color from the existing warm-neutral palette: `#4A4040` (`--text-secondary`, the system's warm dark gray). Chosen over near-black `#1C1917` so the ring stays distinguishable from selected-chip borders, and over cool grays which would clash with the tinted-neutral palette.
- Every current red-focus surface is light (workspace rail, header, cards, wizard all render on white/warm white), so one dark-gray ring token works globally; no dark-surface override needed today.
- Text selection highlight (`::selection`, red 20%) is a brand highlight, not an outline; out of scope unless the user asks.
- Link text color (`text-primary` on competitor mentions) is a deliberate brand choice; only its focus ring changes.

## Clarifying Questions
1. Ring color?
   - Recommendation A: `#4A4040` (existing `--text-secondary` warm dark gray) via the `--ring` token; soft/faint alpha variants for the input glow recipe.
   - Trade-off: cohesive with palette; slightly less contrast than pure black (still >5:1 on white).
   - Recommendation B: `#1C1917` (text-primary near-black).
   - Trade-off: maximum contrast but visually collides with selected-chip borders and reads black, while the user asked for "a little bit of a gray or dark gray".
   - Selected: Recommendation A (matches the user's stated gray/dark-gray intent).
2. Keep the input focus "glow" recipe (ring + border + faint bg) or flatten to a plain ring?
   - Recommendation A: keep the recipe, swap the three red tokens for neutral equivalents (`--ring`, `--ring-soft`, `--ring-faint`).
   - Trade-off: preserves the designed "quiet at rest, assertive when focused" feel with minimal diff.
   - Recommendation B: flatten to the global 2px outline.
   - Trade-off: simpler but visibly regresses input focus affordance.
   - Selected: Recommendation A.

## Plan
1. `globals.css`: `--ring: #DC2626` → `var(--text-secondary)`; add `--ring-soft: rgba(74,64,64,0.35)` and `--ring-faint: rgba(74,64,64,0.03)`; map `--color-ring-soft`/`--color-ring-faint` in `@theme`. Global `:focus-visible` outline inherits via `var(--ring)`.
2. `input.tsx` / `textarea.tsx`: swap `accent-primary-light/mid/faint` focus classes for `ring-soft` ring, `ring` border, `ring-faint` bg.
3. Mechanical sweep: `focus-visible:ring-primary[/nn]` → `focus-visible:ring-ring[/nn]`, `focus-visible:border-primary` → `focus-visible:border-ring` across `src` (~16 files, incl. `ui-style-presets.ts`).
4. Guidelines: DESIGN.md 133/219 rewritten (focus = warm dark gray, red reserved for commitment); DESIGN.json `ds-btn-primary`, `ds-btn-outline`, `ds-input` focus snippets + description updated.
5. Verify in real browser: keyboard-tab focus on landing idea textarea, CTA buttons, sign-in modal fields; screenshots to `ui-evidence/2026-07-19/neutral-focus-ring/`.

## Runtime and Change-Impact Analysis
Pure CSS token/class swap: no state, timers, contracts, or data-shape changes. Blast radius is visual focus styling only; failure mode is a low-contrast or missing ring, caught by screenshot verification. Rollback = revert the commit.

## Validation
- Grep proves zero remaining `focus-visible` utilities referencing `primary`/`accent-primary`.
- Browser screenshots of focused states on light surfaces.
- `npm run test` (no unit surface for CSS; guards against accidental TSX breakage), lint on touched files.

## Open Decisions
- None.

## Critique
- Architect: token indirection (`--ring` chain) keeps future re-theming one-line; adding only two alpha variants avoids token sprawl.
- Product: red focus rings diluted the "red = commit" principle; this restores it. Risk: keyboard users lose a highly salient ring; dark gray at 2px offset remains clearly visible on all current surfaces.
- Implementer: sed-style sweep risks touching non-focus `ring-primary` strings; the replace patterns anchor on the `focus-visible:` prefix to avoid `border-primary/30` chips in stacked-tab-nav.
- Risk/Ops: none beyond visual regression; a11y contrast of #4A4040 on white ≈ 7:1, passes non-text contrast easily.

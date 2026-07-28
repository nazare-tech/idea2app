# Mobile Project View Chrome Fixes

**Date**: 2026-07-26
**Status**: Implemented (verified 2026-07-26)
**Scope**: Mobile (below `lg`) project workspace chrome — header, document peek bar, composer sheet.

## Goal

Four reported mobile defects in `/projects/[id]`:

1. Slim mobile header: the project name truncates flush against the profile avatar, no breathing room.
2. The bottom document peek bar (which names the section currently in view) scrolls away with the header, so the user loses their place indicator.
3. Opening the "Ask this project" composer puts the textarea underneath the on-screen keyboard; the sheet is also only 70dvh tall, so there is little room for the conversation.
4. The two suggestion chips wrap into a vertical stack on narrow viewports, eating vertical space.

## Assumptions

- "Twice the size" for the header padding refers to the current 4px (`gap-1`) separation around the title; the fix gives the title 8px of its own horizontal padding.
- "Almost a page" for the composer sheet means it should fill the viewport minus the mobile header band.
- Chips only need the horizontal treatment below `lg`; the desktop command bar keeps wrapping.
- Keyboard avoidance must work on both Chrome Android (layout viewport resizes) and iOS Safari (layout viewport does not resize; only the visual viewport shrinks).

## Decisions

### A. Header title padding (Recommendation A)
Give the mobile title span `px-2` and keep the container `gap-1`. Chosen over widening the header's own `pr-3` because the avatar button already carries its own hit area; padding on the title is what controls where the truncation ellipsis lands.

### B. Peek bar always visible (Recommendation A)
Stop passing the hide-on-scroll state into `MobileDocumentBar` and into the composer FAB, and delete the now-dead `hidden` / `chromeHidden` props. The header keeps hide-on-scroll (`useHideOnScrollChrome` still drives `ProjectHeader`), so the reading area still grows on scroll down, but the section indicator is permanent.

Alternative rejected: keep the prop and pass `false`. That leaves a prop nothing can ever set, which reads as a bug to the next maintainer.

### C. Composer keyboard avoidance (Recommendation A)
Two coordinated mechanisms:

- `interactiveWidget: "resizes-content"` on the root `viewport` export. On Chrome Android this shrinks the layout viewport when the keyboard opens, so `dvh` and `bottom: 0` already land above it.
- A `useKeyboardInset` hook that watches `window.visualViewport` and writes `--workspace-keyboard-inset` on `document.documentElement`. On iOS Safari (which ignores `interactive-widget`) this is the keyboard height; on Chrome Android with `resizes-content` it computes to ~0, so the two mechanisms do not double-count.

The composer sheet then anchors at `bottom: var(--workspace-keyboard-inset, 0px)` and clamps its height to `min(sheet-height, 100dvh - keyboard-inset - mobile-header-height)`.

Alternative rejected: `position: fixed` + `env(keyboard-inset-bottom)`. The VirtualKeyboard API is Chromium-only and requires `navigator.virtualKeyboard.overlaysContent = true`, which would break the Android path that `resizes-content` handles more simply.

### D. Sheet height
`--workspace-composer-sheet-height` 70dvh -> 92dvh, clamped by the calc in C so it never slides under the header or the keyboard.

### E. Chips horizontal below `lg` (Recommendation A)
Single non-wrapping row with horizontal overflow scroll and `shrink-0` chips below `lg`; `lg:flex-wrap` restores desktop behavior. Scrollbar hidden with a shared `.hide-scrollbar` utility (extracted from the existing `.workspace-anchor-nav` rule so the pattern is not copy-pasted a third time).

Alternative rejected: shrinking chip type so both fit. Labels run to ~30 characters; the type would have to drop below the design system's minimum readable size.

## Phases

1. `globals.css`: bump composer sheet height, add `--workspace-keyboard-inset: 0px`, add `.hide-scrollbar` utility and point `.workspace-anchor-nav` at it.
2. `src/app/layout.tsx`: add `interactiveWidget: "resizes-content"`.
3. New `src/hooks/use-keyboard-inset.ts`.
4. `project-header.tsx`: title padding.
5. `project-workspace.tsx` + `mobile-document-bar.tsx` + `project-composer.tsx`: drop the peek-bar/FAB hide wiring.
6. `project-composer.tsx`: keyboard inset anchoring, height clamp, horizontal chips.

## Test strategy

- `npm run lint` and `npm run typecheck`.
- Real-Chrome mobile-viewport verification per `docs/operating-system/ui-verification.md`, evidence under `ui-evidence/2026-07-26/mobile-project-view-chrome-fixes/`: header spacing, peek bar surviving a long scroll, composer sheet height, textarea above a simulated keyboard inset, chips in one row.
- No unit tests exist for these components; the change is presentational plus one new hook.

## Verification record (2026-07-26)

`npm test` 654/654 pass, `npx tsc --noEmit` clean, `npm run lint` clean on every touched file (the one remaining repo error, `src/components/layout/workspace-document-frame.tsx:52` `react-hooks/set-state-in-effect`, is pre-existing and untouched).

**Browser**: verified twice, once in Playwright Chromium and once in the real Google Chrome binary (`channel: "chrome"`, headed, Chrome 150.0.7871.184). Both runs hit the real local dev server on :3000, signed in through the real auth modal with `.env.e2e.local`, and used a real existing project. Nothing was stubbed. Every measurement below is identical across the two runs. Evidence: `ui-evidence/2026-07-26/mobile-project-view-chrome-fixes/` (Chromium) and `.../real-chrome/` (Chrome).

**Remaining gap**: the claude-in-chrome extension could not be used (`list_connected_browsers` returned `[]`) because Chrome was not running during verification, so this is the real Chrome *build* driven by Playwright with a fresh profile, not the user's `Plasma` profile with its extensions and session. For chrome geometry that distinction does not affect the result; re-run through the extension if profile-specific behavior is ever suspect.

Route: `/projects/eb326898-…-vetted-event-photographers-on-demand`. Viewport: iPhone 13 (390x844, mobile + touch) for 01-04; 1440x900 for 05. An existing project is adequate here because the change is chrome geometry, not loading/generation/readiness UI, so the fresh-project rule does not bind.

| Check | Measurement | Screenshot |
|---|---|---|
| Header title padding | `padding-left`/`padding-right` 8px each; 12px clear to the avatar and to the back arrow (was 4px) | `01-header-top.png` |
| Peek bar pinned | After scrolling 2400px: peek bar reads "Market Research", flush at viewport bottom, visible; slim header translated fully off-screen | `02-scrolled-peek-bar-visible.png` |
| Sheet height | 611px of a 664px viewport (92%), top edge at y=53, clearing the 52px header | `03-composer-open.png` |
| Chips one row | 2 chips, identical `top` (162), `flex-wrap: nowrap`, `overflow-x: auto` | `03-composer-open.png` |
| Keyboard avoidance | With `--workspace-keyboard-inset: 336px`: sheet spans y=52..328, textarea bottom y=251, fully above the keyboard's top edge (y=328) | `04-composer-with-keyboard-inset.png` |
| Desktop unregressed | Chips `flex-wrap: wrap`, `overflow-x: visible`; command bar 239px tall, 24px off the viewport bottom | `05-desktop-composer-open.png` |

**Known limits of this evidence**: headless Chromium has no on-screen keyboard, so the keyboard case was proven by driving the CSS variable that `useKeyboardInset` writes. That validates the sheet geometry, not the hook's visual-viewport measurement or the Chrome Android `interactive-widget` path; both need a physical device or a real mobile browser to confirm end to end.

## Rollback

Every change is additive or a token tweak. Reverting the commit restores the previous chrome; the `--workspace-keyboard-inset` var defaults to `0px`, so a partial revert of the hook alone still renders correctly.

## Critique

- `interactiveWidget: "resizes-content"` is site-wide, not workspace-scoped. Other pages have no bottom-anchored keyboard-adjacent UI, and resizing content is the friendlier default for the intake wizard's long forms, so the blast radius is acceptable but worth naming.
- `visualViewport` fires frequently during keyboard animation; the hook writes a CSS custom property rather than React state so no re-render storm occurs.
- Making the peek bar permanent costs ~56px of reading height on every scroll. That is the explicit request, and the header still hides, so net reading area is unchanged versus the previous "both hidden" state minus the bar.

## Change impact

- No backend, database, or API change; `docs/plans/backend-change-history.md` is untouched.
- No analytics event shape change.
- `docs/systems/` has no doc describing mobile chrome geometry beyond the CSS token comments, which are updated in place.

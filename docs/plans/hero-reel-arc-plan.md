# Plan: Hero reel arc (giant rotating circle of cards)

Status: superseded by `landing-hero-shortlisted-screens-plan.md`; real reel imagery added 2026-07-26
Date: 2026-07-26
Owner: Claude Code

## Goal

Replicate the reel.farm hero motif on the Maker Compass landing page: a band of
portrait cards riding the top arc of a very large circle, spanning the full
viewport width edge to edge, rotating slowly and continuously. Cards are empty
placeholder rectangles for now; real imagery lands in a follow-up pass.

## Reference measurements (reel.farm, captured 2026-07-26 at 1440x900)

Read straight off the live DOM with Playwright:

- The page ships two bands, one per breakpoint. The one live at 1440 is the
  unscaled variant: band `height: 280px`, wheel `margin-top: 120px`, no scale.
  The other is band 224px / margin-top 96px / `scale(0.8)`.
- Band: `relative w-full flex justify-center items-start overflow-hidden`.
- Wheel: `w-[3000px] h-[3000px]`, `transform-origin: center top`. Circle
  radius = 1500px, confirmed by back-solving two cards' screen positions from
  their rotation angles.
- Spin layer: `absolute inset-0`, inline `transform-origin: 1500px 1500px;
  will-change: transform; transform: rotate(Ndeg)`, driven by JS (no CSS
  animation, no keyframes). Rotation increases over time, so cards travel left
  to right (clockwise).
- Cards: `absolute w-[165px] h-[220px] rounded-md overflow-hidden shadow-lg
  pointer-events-none`, inline `left: calc(50% - 82.5px); top: calc(50% - 1610px);
  transform: rotate(0deg)` for the top card. `1610 = 1500 + 110`, i.e. the card
  centre sits exactly on the circle at the 12 o'clock point.
- Angular step between adjacent cards: 7.2 degrees (50 cards around the ring).
- Measured travel: roughly 200px of horizontal drift over 3s near the top of the
  arc, which is about 3 degrees per second, or a ~2 minute full revolution.

## Approach

New component `src/components/landing/hero-reel-arc.tsx`, plus geometry CSS in
`src/app/globals.css` (calc-heavy, same precedent as `.landing-scrolly`).

Differences from reel.farm, on purpose:

1. **No JS.** The spin is a single CSS keyframe (`reel-arc-spin`) on the spin
   layer. One compositor-only animation beats a rAF loop, and the existing
   global `prefers-reduced-motion` block already neutralises it.
2. **Server component.** Card positions are pure trig, computed once at render.
3. **Landing visual language.** Near-sharp corners (2px) instead of `rounded-md`,
   tinted-neutral placeholder fill with a `--border-subtle` hairline, no
   Action Red. Entrance uses `hero-enter-up` with ease-out-expo.

Geometry chosen for Maker Compass:

| Token | Value | Why |
|---|---|---|
| radius | 1500px | Same as reference; arc is flat enough to read as a horizon |
| card | 168 x 224 | 3:4 portrait, reel-shaped |
| cards | 50 | `2*pi*1500 / 50 = 188px` of arc per card = 168 card + 20 gap |
| step | 7.2 deg | 360 / 50, same as the reference |
| band height | 280px | Centre card fully visible, side cards clipped flat at the bottom edge |
| wheel margin-top | 120px | Centre card top lands 8px inside the band |
| revolution | 110s | Matches the reference drift rate |

Responsive: a single `--reel-scale` on the wheel (`transform-origin: center top`)
shrinks the whole construction at smaller breakpoints, so the trig never changes.

Placement: last child of the existing hero `<section>` in `src/app/page.tsx`,
below the idea-capture CTA and directly above the tool logo marquee, which is
exactly where reel.farm puts it.

## Open question for the user

The hero already carries `HeroArtwork` (scattered sticky notes, desktop only).
Two large decorative systems in one viewport may be one too many. Leaving the
sticky notes in place for now; flagging for a call once the real reel imagery
is in.

## Verification

- `npx tsc --noEmit` and `npx eslint`.
- Playwright capture of the local landing page at 1440x900 and 390x844, two
  frames a few seconds apart to prove the rotation, saved under
  `ui-evidence/2026-07-26/hero-reel-arc/`.

# Plan: Project Page Mobile and Tablet Layout

Status: implemented (2026-07-12, see project-page-mobile-review.md)
Date: 2026-07-12
Source design: Claude Design project `7582cab2-733d-44f9-96fb-74038be8207e`, file `Project Page Mobile.dc.html` ("Mobile project page redesign").

## Goal

Bring the Google-Docs-style mobile pattern from the approved design to the project workspace (`/projects/[projectRef]`) for phones and tablets, while large tablets in landscape (and desktops) keep the existing two-column layout unchanged.

Mobile (< `lg`, 1024px) gets:

1. A slim header: back button to `/projects`, truncated project name, profile avatar. No overflow menu (explicitly dropped from the design by the user).
2. Documents remain one continuous scroll (already true today).
3. A bottom peek bar naming the document in view with its status marker; tapping opens a documents bottom sheet. The peek bar's top edge is curved like a sheet (user adjustment to the flat-top design).
4. The documents sheet lists every document AND its subsections (user addition; the design mock showed documents only), with status markers/labels from the workspace nav state.
5. Header and bottom chrome hide on scroll down, return on first scroll up, and always show near the top or while a sheet is open.
6. "Ask this project" becomes a floating action button riding above the bottom chrome; it stays visible when the documents sheet is expanded and opens the composer as its own bottom sheet. Free-plan upgrade gating is preserved.
7. Safe-area handling for browser chrome (Safari bottom URL bar): `viewport-fit=cover`, dynamic viewport heights, and `env(safe-area-inset-bottom)` padding on all bottom chrome and sheets.

## Assumptions

- `lg` (1024px) stays the mobile/desktop seam: iPad landscape (1024/1133/1366pt wide) resolves to desktop, iPad portrait and phones resolve to mobile. This matches "large tablets in landscape get desktop".
- No new analytics event types: the sheet and FAB re-trigger existing nav/composer flows (`handleScrollNavigate`, composer send), which carry the existing instrumentation. This is a responsive re-layout of existing flows, not a new flow/entitlement.
- No backend, API, database, or data-shape changes. Frontend-only.

## Decisions (Recommendation A policy applied)

- **D1 — One responsive tree vs a separate mobile page.**
  A (chosen): keep the single `ProjectWorkspace` tree; add mobile-only chrome with `lg:hidden` / `hidden lg:*` seams. B: fork a mobile component tree — rejected: double maintenance, drift risk.
- **D2 — Composer reuse vs rebuild.**
  A (chosen): keep `ProjectComposer` as the one owner of chat state/streaming; restyle collapsed/expanded states responsively (collapsed input row hidden on mobile, replaced by FAB; expanded panel renders as a bottom sheet on mobile). B: extract a chat hook + two shells — rejected for now: bigger refactor, no behavior gain.
- **D3 — Bottom sheet primitive.**
  A (chosen): one small local `MobileBottomSheet` component (overlay + sheet + safe-area padding + reduced-motion aware) used by the documents sheet and the composer sheet, positioned absolutely within the workspace root (no portal; the workspace root is the full-viewport box). B: adopt Radix Dialog/vaul — rejected: new dependency and idiom for two uses.
- **D4 — Viewport height correctness.**
  A (chosen): switch the workspace root (and dashboard shell root if it also pins `h-screen`) to dynamic viewport units (`h-dvh`) so bottom chrome tracks Safari's collapsing URL bar; keep `h-screen` fallback via Tailwind's built-in `dvh` handling. B: JS visualViewport listeners — rejected: complexity, CSS units suffice.
- **D5 — Hide-on-scroll ownership.**
  A (chosen): a small `useHideOnScrollChrome` hook attached to the existing scroll container, with the design's thresholds (delta > 5px hides, delta < -5px shows, always visible under 60px scrollTop or while any sheet is open), suppressed during programmatic scrolls and for reduced-motion users (chrome stays pinned). B: fold into `useWorkspaceScrollSync` — rejected: keeps scroll-sync single-purpose.
- **D6 — Status rendering reuse.**
  A (chosen): extract `AnchorNav`'s status marker/text mapping into a shared module consumed by the rail, peek bar, and sheet so status colors stay in one place. B: duplicate the mapping — rejected: drift risk the sweep would flag.

## Phases

1. **Foundation**: `viewport` export with `viewportFit: "cover"` in `src/app/layout.tsx`; `h-dvh` roots; hide `AnchorNav` below `lg`; mobile slim header (back, name, avatar) with desktop header untouched at `lg+`; mobile content padding (top for slim header, bottom for peek bar + safe area); responsive `scroll-padding-top` so hash/section jumps land under the mobile header.
2. **Peek bar + documents sheet**: shared status module; `MobileBottomSheet`; peek bar (curved top, active doc + status, safe-area padding, hide-on-scroll); documents sheet with documents + subsections wired to `handleScrollNavigate` + active highlight; `useHideOnScrollChrome`.
3. **Composer mobile variant**: FAB (red, sparkle, above bottom chrome, visible over the documents sheet, hidden while composer sheet open); composer expanded state as bottom sheet on mobile; upgrade-gated variant preserved.
4. **Polish + evidence + docs**: ease-out-expo entrances, reduced-motion fallbacks, real-device-shaped verification (375x812, 768x1024 portrait, 1280x800 landscape-tablet/desktop), evidence under `ui-evidence/2026-07-12/project-page-mobile/`, update `docs/systems/architecture.md` workspace-layout section (self-healing rule) to describe the mobile chrome.

## Test strategy

- `npm run typecheck`, targeted lint on touched files (pre-commit re-enforces both).
- Existing unit suites must stay green (`workspace-scroll-sync`, composer-related tests if any).
- Real Chrome verification against the live dev server signed in via `.env.e2e.local`: scroll down/up chrome behavior, sheet open/close, subsection jump, composer send on mobile viewport, tablet portrait = mobile layout, 1024px+ landscape = desktop layout, no horizontal overflow, console clean.
- Screenshots for each state saved as evidence.

## Rollback

Frontend-only commits; revert the implementation commits to restore the current horizontal-strip mobile nav. No data or API surface changes to unwind.

## Critique / risks

- **Scroll-sync interference**: hide-on-scroll must not fight programmatic scrolls or the 22%-marker scroll-spy; mitigated by suppressing during `isScrollingProgrammatically` and testing section jumps.
- **iOS Safari quirks**: `dvh` + `env(safe-area-inset-bottom)` behavior differs between standalone and in-browser; mitigated by `max(12px, env(...))` padding so non-notch browsers keep sane spacing. True-device verification is limited (desktop Chrome device emulation); noted as residual risk.
- **Composer restyle regression risk on desktop**: the responsive class split touches the desktop command bar; desktop verification screenshots required before commit.
- **content-visibility containment**: sheet-driven jumps into contained sections must still render correctly (same path as existing nav clicks, so low risk).
- **Free-plan FAB**: gating must not leak the composer to free users; reuse `upgradeRequired` branch inside the sheet.

# Landing Hero — Mobile Reel Only

## Change

- Removed the inactive landing-page mount for `HeroArtwork`.
- Removed the sticky-note-only left/right entrance keyframes and selectors.
- Kept the former artwork component and raster assets in the repository for possible restoration.
- Kept heading, idea-capture, and mobile-reel animation behavior unchanged.

## Verification

- Route: `http://127.0.0.1:3000/`
- Desktop viewport request: 1440 × 1000
- Mobile viewport request: 390 × 844
- State: public landing page, untouched idea input
- DOM result at both sizes: 0 sticky-note images, 50 reel images, 1 reel band, no horizontal document overflow
- Browser console: no errors or warnings
- Chrome extension control stalled after healthy profile/extension checks, so the screenshots below were captured with the local in-app browser fallback.

Evidence:

- `ui-evidence/2026-07-28/landing-hero-mobile-reel-only/desktop-1440x1000.jpg`
- `ui-evidence/2026-07-28/landing-hero-mobile-reel-only/mobile-390x844.jpg`

## Automated checks

- `node --import tsx --test src/app/page.test.tsx src/components/landing/hero-reel-arc.test.tsx`
- `npx eslint src/app/page.tsx src/components/landing/hero-reel-arc.tsx`
- Full unit suite: 656 passed.
- Repository-wide lint remains blocked by a pre-existing `react-hooks/set-state-in-effect` error in `src/components/layout/workspace-document-frame.tsx`.
- Repository-wide typecheck remains blocked by pre-existing malformed generated declarations in `.next/dev/types/routes.d.ts`.

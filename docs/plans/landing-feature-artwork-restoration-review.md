# Landing Feature Artwork Restoration

## Scope

- Keep the former hero sticky-note artwork unmounted.
- Restore reliable first paint and scroll progression for all five feature-artwork sets.
- Allow the IPv4 local verification origin used when another app owns localhost's IPv6 listener.

## Fix

- Server-render the first feature set and card visibly.
- Paint the feature stage synchronously when its client effect mounts.
- Update stage state directly on scroll and resize as a fallback for throttled `requestAnimationFrame`.
- Add `127.0.0.1` to Next.js `allowedDevOrigins`.

## Verification

- Route: `http://127.0.0.1:3000/`
- Desktop viewport: 1030 × 1000
- Mobile viewport request: 390 × 844; reported CSS viewport 433 × 938
- Desktop scroll activated sets 0–4 in order: Market Research, Product Plan, First Version Plan, Design Mockups, AI Prompts.
- Design Mockups rendered all three local mockup images.
- Mobile first-paint fallback: first set/card visible, no horizontal overflow.
- Sticky-note image count remains zero.
- Browser console: no errors or warnings.

Evidence:

- `ui-evidence/2026-07-28/landing-feature-artwork-restored/persona-feature-1030x1000.jpg`

Automated checks:

- `node --import tsx --test src/app/page.test.tsx`
- `npx eslint src/app/page.test.tsx src/components/landing/feature-scrollytelling.tsx src/components/landing/feature-stage-card.tsx next.config.ts`
- `git diff --check`

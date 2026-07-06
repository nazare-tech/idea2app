---
implemented: true
implemented_at: 2026-07-06
implementation_summary: >
  Added src/components/landing/pricing-section.tsx (client component: Monthly/Yearly
  toggle with 25% yearly discount math, three detailed plan cards, Pro warm-paper
  highlight, CTAs wired to signup modal / waitlist anchor) and replaced the static
  pricing block in src/app/page.tsx. Converted HeroArtwork to a client component with
  pointer parallax + scroll scatter/fade motion (strength 20 / scatter 480, reduced-
  motion guarded), computing scatter vectors from static layer data so directions stay
  correct even when the artwork mounts hidden below the lg breakpoint. Verified in the
  browser: both billing states ($19/$49 -> $14/$37, "billed annually as $168/$444"),
  radial scatter directions, zero console errors, clean tsc + eslint.
---

# Landing Page Design Sync (Claude Design "Landing Page.dc.html")

## Goal

Update the marketing landing page (`src/app/page.tsx` + landing components) to match the
latest Claude Design project export (`Landing Page.dc.html`, project
`33a316ac-e135-4bb9-b17f-0e7ec1681dfe`). A section-by-section diff shows the header, hero
card, trust marquee, five feature sections, testimonial band, bottom CTA, and footer are
already implemented and match the design. Two deltas remain:

1. **Pricing section redesign** — new "Pricing" heading with a Monthly/Yearly segmented
   toggle (25% yearly discount, computed prices and "billed annually as $X" notes),
   three cards with detailed bordered feature rows and check icons, "What's included:" /
   "Everything in Free plus:" / "Everything in Starter plus:" group labels, 52px display
   prices, Starter at 5 projects/mo, and the Pro card in the design's default
   "warm-paper" highlight variant (warm paper background, strong border, red price,
   white "Best Value" pill).
2. **Hero artwork motion** — pointer-follow parallax plus scroll-driven scatter/fade on
   the 16 layered hero images (parallax strength 20px, scatter distance 480px, ease-in
   on scroll progress), disabled under `prefers-reduced-motion`.

## Assumptions

- The landing pricing grid stays static marketing copy (no live Stripe/plan lookup),
  matching both the design file and the current implementation.
- Design prop defaults from the `.dc` file apply: `yearlyDiscount = 25`,
  `billingDefault = monthly`, `proCardStyle = warm-paper`,
  `heroParallaxStrength = 20`, `heroScatterDistance = 480`.
- Pricing card CTAs open the signup auth modal (waitlist mode falls back to `#waitlist`),
  consistent with the rest of the page. The design leaves them unwired; wiring them is a
  bias-to-next-action improvement, not a visual change.
- "App generation + scaffolding" appears in the design's Pro card even though app
  generation is archived in the product; copy is kept as designed (the current page also
  mentions it) and flagged as an open decision.

## Clarifying Questions

**Q: Client component boundary for the billing toggle?**
- **A (Recommended): New `PricingSection` client component** rendering the whole pricing
  grid with local `billing` state. Trade-off: moves static card copy into a client file,
  but keeps `page.tsx` a server component and mirrors existing patterns
  (`TestimonialBand`, `ToolLogoMarquee`).
- B: Keep cards server-rendered and only make the toggle a client island synced via URL
  params. Trade-off: more plumbing for zero user-visible benefit.
- **Selected: A.**

**Q: Hero motion placement?**
- **A (Recommended): Convert `HeroArtwork` to a `"use client"` component** and port the
  design's `setupHeroMotion` rAF loop (lerped pointer parallax + scroll scatter with
  deterministic per-layer depth/rotation). Trade-off: the artwork loses server rendering,
  but it is decorative, `aria-hidden`, and desktop-only (`hidden lg:block`).
- B: Separate overlay script component. Trade-off: split ownership of the same DOM.
- **Selected: A.**

## Architecture Improvement Opportunities

- Plan card copy moves from loose `plans` array into typed per-plan data with feature
  rows, kept in the new component file (single consumer).
- Reuses existing tokens (`--warm-paper`, `--border-strong`, `--primary`, mono kicker
  styles); no new CSS variables or dependencies.

## Plan

### Phase 1 — Pricing section
- Add `src/components/landing/pricing-section.tsx` (`"use client"`): billing state,
  segmented Monthly/Yearly pill toggle, "Save 25% with yearly billing" mono note,
  `perMonth()` rounding math, three cards (Free/Starter/Pro) with bordered feature rows,
  Pro warm-paper variant, CTAs wired to signup modal / `#waitlist`.
- Replace the pricing `<SectionCard>` contents in `src/app/page.tsx` with
  `<PricingSection waitlistMode={waitlistMode} />` and drop the now-unused `plans` array.

### Phase 2 — Hero motion
- Convert `HeroArtwork` to a client component; add pointer/scroll rAF loop with cleanup,
  reduced-motion guard, and `willChange` hints, keeping the existing layer data and
  markup.

### Phase 3 — Verify
- `npx tsc --noEmit` / lint; run dev server via preview tools; screenshot hero and
  pricing (monthly + yearly states), check console for errors.

## Milestones
1. Pricing section matches design in both billing states.
2. Hero parallax/scatter works and respects reduced motion.
3. Type check + browser verification clean.

## Validation
- Browser: toggle Monthly/Yearly (prices $19/$49 → $14/$37, notes "billed annually as
  $168 / $444"), Pro card warm-paper styling, row hairlines; hero images shift with
  pointer and scatter/fade on scroll; no console errors.
- `prefers-reduced-motion` emulation leaves hero static.

## Risks
- rAF loop leaks if cleanup misses → single effect with teardown of listener + frame.
- Rounded yearly prices imply totals ($168/$444) that marketing may want to phrase
  differently later; math matches the design file exactly.

## Rollback
- Revert `page.tsx` pricing block to the previous `plans` map and restore the static
  `HeroArtwork`; both changes are isolated to two components plus one page section.

## Open Decisions
- ~~Pro card keeps "App generation + scaffolding" copy although app generation is
  archived.~~ Resolved 2026-07-06: row removed at user request since app generation is
  off the roadmap.
- Yearly billing toggle is marketing-only; Stripe checkout intervals (monthly/6-month/
  annual) are unchanged.

## Critique (five perspectives)
- **PM**: Pricing copy now promises 5 Starter projects/mo and a 25% yearly discount —
  must stay in sync with actual `plans` table and Stripe prices.
- **Design**: Warm-paper Pro card and hairline rows match DESIGN.md restraint rules; red
  stays ≤10% of the section (price + badge accent only).
- **Engineering**: Both new client components are leaf nodes; no data-flow changes, no
  new deps.
- **QA**: Two visual states (billing toggle) plus motion states need explicit screenshot
  checks; reduced-motion path covered.
- **Security/Perf**: No new network calls; rAF loop is desktop-only and passive
  (`pointermove` listener, no layout thrash beyond transforms/opacity).

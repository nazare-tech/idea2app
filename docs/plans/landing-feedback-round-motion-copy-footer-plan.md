---
implemented: true
implemented_at: 2026-07-06
implementation_summary: >
  Yearly discount set to 15% ($16/$42, billed annually as $192/$504) and the billing
  toggle container lost its outer border. Hero section switched to overflow-x-clip and
  the artwork box unclipped so sticky notes remain visible below the hero (verified: no
  horizontal scrollbar). Feature headings/descriptions shortened and cards moved into
  the new FeatureCard client component with IntersectionObserver reveal (staggered 90ms
  bottom-up text fade, visual fades in scaling 0.8→1, ease-out-expo, imperative styles
  so content stays visible without JS; reduced-motion skips). Testimonial dot is now an
  SVG ellipse with per-frame speed-based elongation, rotation along travel, and
  directional feGaussianBlur, settling round. Added SUPPORT_EMAIL constant,
  InfoPageShell, /contact, /privacy, /terms pages, footer Help column and
  Privacy/Terms bottom-bar links. All verified in the browser; tsc + eslint clean.
---

# Landing Feedback Round: Motion, Copy, Pricing, Footer + Contact

## Goal

Apply the user's landing page feedback round on top of the design sync:

1. **Yearly discount 15%** (was 25%) in `PricingSection`.
2. **Hero artwork un-clipped below the hero** so sticky notes stay visible as they
   scatter past the section edge (keep horizontal clipping to avoid a sideways
   scrollbar).
3. **Shorter feature copy**: headings and subheadings across the five feature cards are
   too long; bullets stay.
4. **Feature card reveal motion**: when a card scrolls into view, its text lines fade in
   staggered with a small bottom-to-top movement; the product image fades in and scales
   from 80% to 100%. Ease-out-expo, reduced-motion respected.
5. **Testimonial dot motion blur**: while the red dot travels the spark path it
   elongates along its direction of travel with a directional blur, then settles round.
6. **Billing toggle**: drop the outer stroke around the pill container; active tab keeps
   the white fill.
7. **Footer + legal/help pages**: add a Help column (Contact link) and Privacy / Terms
   links in the footer bottom bar; create `/contact` (email-us page), `/privacy`, and
   `/terms` public pages.

## Assumptions

- `overflow-x: clip` on the hero section is acceptable (supported in all evergreen
  browsers) so vertical overflow can stay visible.
- Support email placeholder `support@makercompass.com` until the real inbox exists,
  centralized in one constant.
- Privacy/Terms ship as clearly-labeled placeholder policies pending real legal copy.
- Contact page is a styled mailto flow, no new API/table for messages.

## Clarifying Questions

**Q: Where does reveal animation logic live?**
- **A (Recommended): New `FeatureCard` client component** receiving section text +
  the `FeatureProductPreview` visual as a ReactNode child; IntersectionObserver toggles
  a revealed state, CSS transitions with per-child delays. Keeps `page.tsx` server-side.
- B: Global scroll-reveal utility with data attributes. Trade-off: more generic, but
  premature for one use.
- **Selected: A.**

**Q: How to blur the testimonial dot?**
- **A (Recommended): SVG ellipse + `feGaussianBlur` filter** updated per frame from the
  instantaneous speed (stretch rx along travel angle, directional x-blur, rotate around
  the dot center). Settles back to a round dot at the end.
- B: CSS filter blur on the circle. Trade-off: isotropic only, no elongation.
- **Selected: A.**

## Plan

- Phase 1: Pricing tweaks (discount 15, toggle container border removal).
- Phase 2: Hero overflow (`overflow-x-clip` on section, remove `overflow-hidden` on
  artwork box).
- Phase 3: Feature copy shortening + `FeatureCard` reveal component.
- Phase 4: Testimonial dot elongation + motion blur.
- Phase 5: Footer Help column + Privacy/Terms bottom-bar links; `/contact`, `/privacy`,
  `/terms` pages; shared support email constant.
- Phase 6: Verify in browser (screenshots of pricing yearly state, feature reveal,
  footer, contact page), tsc + eslint, update PROJECT_CONTEXT.md.

## Validation

- Yearly prices become $16/$42 with "billed annually as $192 / $504".
- Sticky notes remain visible below the hero boundary while scrolling; no horizontal
  scrollbar at any width.
- Feature cards animate in once per view; reduced motion renders instantly.
- Dot stretches/blurs mid-flight, round at rest; toggle container has no border.
- Footer links resolve to working pages.

## Risks

- Hidden-until-revealed feature text if JS fails → reveal defaults to visible when
  IntersectionObserver is unavailable and under reduced motion.
- Overflowing hero art could cover trust-bar content → art is `pointer-events-none` and
  fades with scroll scatter; visually checked.

## Rollback

Each phase is an isolated component edit; revert individually.

## Open Decisions

- Real support email address (placeholder `support@makercompass.com`).
- Real privacy/terms legal text (placeholder content shipped).

## Critique (five perspectives)

- **PM**: Contact page unblocks a support channel before launch; legal placeholders are
  flagged, not silently fake.
- **Design**: Motion follows DESIGN.md (ease-out-expo entrances, no bounce; staggered
  reveals; restraint kept).
- **Engineering**: All client logic stays in leaf components; no new deps.
- **QA**: Reveal is one-shot per load; verify with scroll in preview; reduced-motion
  paths mirror existing TestimonialBand guard.
- **Security/Perf**: New pages are static server components; observer + rAF cleanup on
  unmount.

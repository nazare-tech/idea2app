---
implemented: true
implemented_at: 2026-07-06
implementation_summary: >
  SiteFooter extracted and shared by the landing page and InfoPageShell (Account column
  removed; Product: Features/Pricing/FAQ, Help: Contact, bottom bar: Privacy/Terms).
  FaqSection added at #faq with six details/summary rows, linked from header nav and
  footer. Bottom CTA aligned to rounded-md. Stripe test mode: created yearly Prices
  starter_yearly price_1TqLqfRZYXj2bJrBIoVTOdjX ($192/yr) and pro_yearly
  price_1TqLqhRZYXj2bJrBS9rqDpB0 ($504/yr); plan_prices updated via service role to
  link monthly and yearly Stripe price ids, correct annual amounts (19400→19200,
  49900→50400), set "Save 15%" labels, enable checkout for Starter/Pro monthly+annual,
  and deactivate both 6-month rows. Verified via DOM inspection (preview screenshot
  capture was glitched); 396/396 tests pass; tsc + eslint clean. Live-mode Stripe
  objects still pending.
---

# Landing Round 3: Shared Footer, FAQ, Button Consistency, Stripe Pricing

## Goal

1. **One footer everywhere**: the contact/privacy/terms pages show a different minimal
   footer than the landing page. Extract the landing footer into a shared `SiteFooter`
   used by both.
2. **Trim the footer**: drop the Account column (Sign In / Get Started); those CTAs are
   already prominent in the header and hero.
3. **FAQ**: new FAQ section on the landing page (after pricing, before the bottom CTA)
   plus a FAQ link in the header nav and footer.
4. **Button consistency**: the bottom CTA is `rounded-none` while every other landing
   button is `rounded-md`. Align on `rounded-md` everywhere on the landing surface.
5. **Stripe pricing sync (test mode)**: create yearly Prices matching the landing
   (Starter $192/yr, Pro $504/yr), link existing monthly Prices ($19/$49) and the new
   yearly Prices to `plan_prices`, correct the annual DB amounts (were $194/$499),
   deactivate the no-longer-advertised 6-month rows, and enable checkout on the
   Starter/Pro monthly + annual rows.

## Assumptions

- The app runs Stripe in TEST mode (`STRIPE_SECRET_KEY=sk_test...` in .env.local), so
  only test-mode Stripe objects are created. Live mode is left untouched and needs the
  same pass before launch.
- Yearly savings label "Save 15%" matches the landing toggle claim; the DB label text
  is cosmetic.
- FAQ uses native details/summary (no JS, accessible), styled with the hairline-row
  pattern.
- One button shape on landing = `rounded-md` (majority already); the design file's
  `sharp` bottom CTA loses to consistency.

## Plan

- Phase 1: `SiteFooter` component (brand + Product: Features/Pricing/FAQ + Help:
  Contact + bottom bar: copyright + Privacy/Terms). Use absolute `/#anchor` hrefs so it
  works from info pages. Swap into `page.tsx` and `InfoPageShell`.
- Phase 2: `FaqSection` with 6 product FAQs; `#faq` anchor; header nav + footer links.
- Phase 3: Bottom CTA `rounded-none` → `rounded-md`.
- Phase 4: Stripe test mode: create `Starter Yearly` (19200/year) and `Pro Yearly`
  (50400/year) prices with lookup keys; update `plan_prices` via service role: link
  stripe_price_ids, fix annual amounts, savings labels, enable checkout for
  monthly/annual Starter+Pro, deactivate 6-month rows.
- Phase 5: Verify in browser + checks; update PROJECT_CONTEXT; commit + push.

## Validation

- Footer identical on `/` and `/contact`; no Account column.
- FAQ renders, expands, anchors from header.
- All landing buttons rounded-md.
- Stripe: `stripe prices list` shows the two yearly prices; DB rows match landing
  numbers with linked price IDs.

## Risks

- Enabling checkout rows changes the billing page offering; amounts now match Stripe
  exactly, and the checkout route validates prices server-side.
- 6-month deactivation: existing subscriptions (if any) are unaffected; only new
  checkout selection is hidden.

## Open Decisions

- Live-mode Stripe objects still need creation before production launch.
- FAQ copy is a first pass; refine with real user questions later.

## Critique

- **PM**: Pricing across landing, billing, and Stripe now tells one story (monthly +
  yearly, 15%).
- **Design**: FAQ follows the hairline-row idiom; single button radius restores
  consistency.
- **Engineering**: Footer extraction removes duplication; DB changes are additive or
  reversible flags.
- **QA**: Checkout flow should be smoke-tested against the new rows before launch.
- **Security**: Service-role DB access used locally only; no secrets committed.

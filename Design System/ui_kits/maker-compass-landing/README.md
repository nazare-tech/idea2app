# Maker Compass — Landing UI Kit

A high-fidelity recreation of the Maker Compass marketing landing page. Sharp corners, declarative voice, one decisive red accent, the signature Build Map.

Open **`index.html`** for the interactive page: the hero idea-capture input and every CTA open the auth modal (prefilled with your idea), the modal switches between sign-in / sign-up, and submitting fires a confirmation toast. The Build Map animates in on scroll (ease-out-expo, honors `prefers-reduced-motion`).

## Files
- **`index.html`** — page entry; loads React 18 + Babel + Lucide, then the JSX below.
- **`kit.css`** — all landing styles, paired with the root `colors_and_type.css` tokens.
- **`components.jsx`** — shared: `Icon` (Lucide wrapper), `Button`, `LandingNav`, `LandingFooter`.
- **`sections.jsx`** — `Hero`, `BuildMap` (signature), `Features`, `HowItWorks`, `Pricing`, `BottomCTA`.
- **`app.jsx`** — page shell: `AuthModal`, toast, and wiring.

## Component notes
- **Button** — `variant`: `primary | outline | ghost`; `size`: `sm | default | lg`; `sharp` for declarative landing CTAs (0 radius, h-56). Primary presses with `scale(0.98)`.
- **Build Map** — dashed Workshop-Black baseline, solid Action-Red progress line drawing over 3s, milestone cards lifting in with a mono `0N` index. The brand's clearest motion statement.
- **Pricing** — the dark "Pro" plan is the only inverted card; its price renders in Action Red and it carries the "Best Value" pill.

## Voice reminders
Sentence-case headlines, mono UPPERCASE kickers, no em dashes, no emoji, no "Powered by AI" anything. Action Red stays under ~10% of the surface.

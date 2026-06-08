---
name: maker-compass-design
description: Use this skill to generate well-branded interfaces and assets for Maker Compass, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# Maker Compass Design

Maker Compass turns a one-line idea into the structured outputs builders ship with (research, PRD, MVP plan, mockups, tech spec). The brand is **"The Builder's Workshop":** tinted-white surfaces, one decisive red accent, type and structure doing the work. Direct, action-oriented, builder-focused.

## How to use this skill

1. **Read `README.md` first.** It holds the full product context, content fundamentals (voice, casing, punctuation), visual foundations (color, type, spacing, motion, corners, shadow), and iconography. The non-negotiable rules live there.
2. **Import the tokens.** Link `colors_and_type.css` in any HTML you build; it defines every color, font, radius, spacing, motion and elevation variable plus semantic type classes (`.mc-display`, `.mc-headline`, `.mc-title`, `.mc-body`, `.mc-label`).
3. **Reuse the UI kits.** `ui_kits/maker-compass-landing/` (marketing) and `ui_kits/maker-compass-app/` (product workspace) are working recreations. Lift components and patterns rather than reinventing them.
4. **Use the real assets.** Brand mark at `assets/maker-compass-logo.svg`; app icon at `assets/maker-compass-app-icon.jpg`. Icons are **Lucide** (CDN: `https://unpkg.com/lucide@latest`). Never hand-draw replacement SVGs or substitute emoji.
5. **Browse `preview/`** for small specimen cards of every token and component.

## If creating visual artifacts (slides, mocks, throwaway prototypes)
Copy the assets you need out of `assets/`, link `colors_and_type.css`, and produce static HTML the user can open. Match the brand exactly.

## If working on production code
Read the rules here to become an expert in the brand, then apply the tokens and component patterns directly. The original product source is `nazare-tech/idea2app` on GitHub (see README for the file map).

## The rules that matter most
- **One Voice Rule:** Action Red `#DC2626` on ≤10% of any screen, only at moments of action, progress, or emphasis.
- **Tinted Neutral Rule:** never pure `#000` / `#FFF`. Every neutral is warm-shifted.
- **Corner split:** sharp on landing, gently rounded inside the product.
- **Mono-Label Rule:** metadata/kickers are Fira Mono UPPERCASE at `0.18em`.
- **Motion:** ease-out-expo (`cubic-bezier(0.16,1,0.3,1)`), no bounce, `transform`/`opacity` only, honor `prefers-reduced-motion`.
- **Flat by default:** the only shadow is Ambient Soft `0 4px 20px rgba(15,23,42,.06)`.
- **No em dashes, no emoji, no "Powered by AI" badges, no purple-blue gradients, no glassmorphism, no nested cards, no colored side-stripe borders.**

If the user invokes this skill without other guidance, ask what they want to build or design, ask a few focused questions, then act as an expert Maker Compass designer who outputs HTML artifacts or production code depending on the need.

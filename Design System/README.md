# Maker Compass — Design System

> A workspace that turns a one-line idea into the structured outputs builders ship with: competitive research, PRD, MVP plan, mockups, technical spec, and generated app scaffolding.

**Creative North Star: "The Builder's Workshop."** A working space, not a showroom. Tools laid out where the hand reaches for them, paper marked up in red, a single confident accent against tinted white. The system reads as utilitarian and unhurried at once. It speaks like a peer who has shipped things, not a vendor selling things.

---

## Product context

Maker Compass (codebase name: `idea2app`) is a full-stack AI business-analysis platform. Its users are **founders, indie builders, and product-minded operators** who have an idea and want to take it from one-line concept to shipped MVP without burning weeks on prep work. Most are technical or technical-adjacent: they can read a PRD, recognize a feature matrix, hand a spec to a coding agent, and tell signal from filler.

They reach for the product at two moments:
1. A fresh idea they want to validate / structure before committing engineering time.
2. The desire to compress weeks of "figuring out what to build and why" into one session, then hand off to Cursor / Claude Code / Lovable / v0 to actually build.

The product collapses the messy front half of building (research → PRD → MVP plan → mockups → tech spec → app scaffold) into hours instead of weeks.

### Surfaces represented
- **Marketing landing** — sticky nav, declarative hero, the signature **Build Map** graphic, features, how-it-works, pricing. Sharp corners, declarative voice.
- **Product workspace** (`/(dashboard)`) — dark sidebar rail, projects grid, the idea-intake flow, a project workspace with long-form generated artifacts (PRD / competitive report / tech spec) and an assistant chat. Gently rounded corners, inhabitable voice.

---

## Sources

This design system was reverse-engineered from the product's own repository. The reader can explore these further to build higher-fidelity Maker Compass designs:

- **GitHub:** [`nazare-tech/idea2app`](https://github.com/nazare-tech/idea2app) (branch `main`)
  - `DESIGN.md` / `DESIGN.json` — the canonical brand + token spec
  - `PRODUCT.md` — voice, users, anti-references, design principles
  - `src/app/globals.css` — the live CSS variables and component utilities
  - `src/app/page.tsx` — the landing page
  - `src/components/ui/*` — button, card, input, badge, tabs primitives
  - `src/components/layout/sidebar.tsx`, `src/components/projects/dashboard-project-card.tsx`, `src/components/chat/chat-interface.tsx` — product surfaces
  - `public/maker-compass-logo.svg` — the brand mark
- **Reference render:** `assets/reference/landing-live-screenshot.png` — a live capture of the deployed landing page.

> Note: the deployed build still shows the legacy name "Idea2App" in a couple of chrome spots; the design spec, brand config (`src/lib/app-brand.ts`), and product copy have all moved to **Maker Compass**. Use Maker Compass.

---

## CONTENT FUNDAMENTALS

**Brand personality: Direct. Action-oriented. Builder-focused.**

The reader should leave a screen with a clearer next step, not a longer to-do list. The brand feels like a peer respecting your time, not a tool begging for attention.

### Voice principles
- **Direct.** No hedging, no marketing speak, no "leverage your synergies." Speaks like a peer who has shipped things. _"Build your startup idea this weekend, not 'someday.'"_ not _"Empower your entrepreneurial journey."_
- **Action-oriented.** Verbs over nouns. Every line nudges toward shipping. Section CTA: _"Stop waiting. Start building."_
- **Builder-focused.** Assumes the reader is technical or close to it. Uses PRD, MVP, GTM, feature matrix as-is, without dumbing them down.

### Casing
- **Headlines / hero / section titles:** Sentence case. _"From idea to momentum, without the usual excuses."_ (Pricing uses Title Case in one spot — _"Plans For Builders At Every Stage"_ — but sentence case is the default.)
- **Kicker labels:** ALL CAPS, mono, wide tracking. `FEATURES` · `HOW IT WORKS` · `PRICING` · `SIGNATURE FEATURE`.
- **Buttons:** Sentence case or Title Case verbs. _"Get Started", "Sign In", "Go Pro", "Talk to Sales", "New Project"._
- **Body:** Sentence case, normal prose.

### Person
- Addresses the reader as **"you / your"** ("Build **your** startup idea", "Turn **your** idea into research"). The product refers to itself as **"Maker Compass"** in the third person, never "we" in marketing voice. In-product status copy is impersonal and instructional ("No project context captured yet.", "Describe what you want to build").

### Tone examples (real copy)
- Hero subhead: _"Turn one idea into research, MVP plan, and actionable mockups in minutes. No fluff. No 'where do I start?' spiral."_
- Workflow signals: _"One intake becomes every core artifact." / "Docs stay tied to the same project context." / "Output is written for builders, not slide decks."_
- Empty state: _"No projects yet. Create your first idea to get started."_
- Chat placeholder: _"Describe your business idea or ask a question…"_

### Punctuation & emoji
- **No em dashes.** Use commas, colons, semicolons, periods, or parentheses. This applies to UI strings, marketing copy, and in-product help text. (Curly quotes `" "` and apostrophes are used.)
- **No emoji.** None in the product, marketing, or brand mark. Metadata is carried by the mono label voice, not by icons-as-decoration.
- **No "Powered by AI" badges, no sparkles.** These are named out as anti-references.

---

## VISUAL FOUNDATIONS

### Color
A tinted-neutral surface carrying **one** strong accent. **Action Red `#DC2626`** is the only brand color allowed saturation, and it appears on **≤10% of any given screen** (The One Voice Rule): primary buttons, the wordmark mark, the live progress line, the focus-visible ring, active progress affordances. Anywhere the user is asked to commit, red appears; anywhere a screen is just informing, red is absent.

- **Pure `#000` and `#FFF` are forbidden** (The Tinted Neutral Rule). Every neutral is warm-shifted: Workshop Black `#1C1917`, Cloud `#FAFAFA`, Card White `#FFFFFF`, Warm Paper `#F5F0EB`.
- Depth comes from **tonal layering** (Cloud bg → Card White surface → Warm Paper chrome) and border-weight, not shadow.
- **Auxiliary accents** (Warm Coral / Sand / Ember) are product-internal only (status, dependency, advisory). They never appear in marketing or the brand mark.
- The logo mark uses a hotter orange-red `#FF4000`; the UI accent is the cooler `#DC2626`. Don't mix them.

### Type
**Hanken Grotesk** carries the entire system (display 800 → body 400); **Fira Mono** handles kicker labels and metadata. No third family. Strong scale + weight + tracking contrast is the brand — flat hierarchy reads as undesigned.
- **Tight Tracking Rule:** Display & Headline track at `-0.05em`, never flat zero. (The live landing pushes to `-0.06em`.)
- **Mono-Label Rule:** metadata/status/kicker labels are Fira Mono UPPERCASE at `letter-spacing: 0.18em`.
- Body line-height is a generous `1.6`; long-form artifacts cap at 65–75ch.

### Spacing
A simple scale: `4 · 8 · 16 · 24 · 40 · 64` px (`xs … 2xl`). Section rhythm on landing is generous (`py-8`/`py-10` blocks inside a `max-w-[1320px]` container with `px-4 → px-14` responsive gutters). Varied spacing rhythm is intentional; uniform spacing reads as undesigned.

### Backgrounds
Tinted flat surfaces, **never** gradients, mesh, glassmorphism, or photography-driven heroes. The global background is Cloud `#FAFAFA`. Hero is clean tinted-white with type doing the work; the only "imagery" is the **Build Map** — an orchestrated line-and-card SVG composition. Footer chrome is Warm Paper. No repeating textures, no patterns, no decorative gradient. Dark is reserved for the product **sidebar** (a deliberate inversion to keep navigation quiet) and select "Best Value" / dark feature panels.

### Corners (the register split)
- **Landing = sharp.** Feature cards, stat cards, pricing cards, the Build Map graphic use `rounded-none`. Sharp corners are part of the declarative voice.
- **Product = gently rounded.** `rounded-md` (6px) buttons, `rounded-lg` (8px) product cards, `rounded-xl` (12px) inputs & modals, `rounded-2xl` chat bubbles, `rounded-full` pills.

### Borders
Hairline `1px` borders in Border Subtle `#EAE0D8` / Border Strong `#E8DDD5`. **Side-stripe accent borders (colored `border-left`/`border-right` > 1px) are forbidden.** Use a full hairline border, a tinted background, or a leading number/icon instead. Cards **never nest** — replace a card-in-card with a tinted background or a top border.

### Elevation / shadow
**Flat by default.** The single sanctioned shadow is **Ambient Soft** `box-shadow: 0 4px 20px rgba(15,23,42,0.06)`, used only under free-floating elements (milestone cards inside the Build Map, hovering controls, modals). If a shadow is noticeable at a glance, it is too strong. No decorative shadows on resting list cards.

### Transparency & blur
**No glassmorphism.** `backdrop-filter: blur()` is forbidden as decoration. The only approved use is a faint legibility backdrop on the sticky landing nav (`bg-white/95 backdrop-blur-sm`). Red is used at low alpha for the focus ring (`rgba(220,38,38,0.4)`), selection (`0.2`), and a faint focus background tint (`0.02`).

### Animation
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) on every entrance. **No bounce, no elastic, ever.**
- **Properties:** animate `transform` and `opacity` only; never `width/height/top/left`.
- **Durations:** 150 / 200 / 300ms for micro-interactions; the Build Map progress line draws over ~3s.
- **Signature motion:** the Build Map — a dashed baseline path with a solid Action-Red progress line drawing across, milestone cards lifting in (`translateY(12px) → 0` + fade), connectors tracing via `stroke-dashoffset`.
- **Reduced motion:** honor `prefers-reduced-motion` everywhere by collapsing to the final static state.

### Hover / press states
- **Primary button hover:** shifts to Action Red Hover `#B91C1C` / `bg-primary/90`. **Press:** `scale(0.98)` for tactile feedback.
- **Outline / ghost hover:** Warm Paper fill at ~50% opacity; ghost text shifts to Workshop Black.
- **Product card hover:** border shifts to `text-primary/20`, background to `muted/20`. No lift on resting list cards.
- **Nav links:** color shift only (Text Primary ↔ Text Secondary), no underline, 200ms.
- **Input focus:** Action-Red light ring `rgba(220,38,38,0.4)`, border shifts to red-mid, background tints `rgba(220,38,38,0.02)` — alive, not alarmed.

### Imagery vibe
Minimal photography, no illustration system. Where imagery appears it is incidental; **type and structure are the brand.** The brand mark is the only consistent graphic. Hierarchy carries the voice.

---

## ICONOGRAPHY

- **Icon set:** [**Lucide**](https://lucide.dev) (React `lucide-react` in the codebase). Clean, consistent **stroke** icons at ~1.75–2px weight. Used at 16px (`h-4 w-4`), 18px (`h-[18px]`), and small 14px (`h-3.5`) in metadata rows. Examples in the product: `LayoutDashboard`, `FolderKanban`, `CreditCard`, `Settings`, `LogOut`, `Coins`, `Trash2`, `ArrowRight`.
- In these HTML kits Lucide is loaded from CDN (`https://unpkg.com/lucide@latest`) so icons match the real product exactly. **Do not** hand-draw replacement SVGs or substitute emoji.
- **Brand mark:** `assets/maker-compass-logo.svg` — a stylized compass: two orange-red `#FF4000` arcs (the bezel) flanking a black compass needle with a center dot. It reads as "find your direction / true north for builders." Pairs with the **"Maker Compass"** wordmark in Hanken Grotesk semibold, tracking ~`0.01–0.05em`. App-icon variant (rounded square, rising arrow on Workshop Black): `assets/maker-compass-app-icon.jpg`.
- **No emoji, no unicode glyphs as icons, no icon font** beyond Lucide. Status is communicated with color + mono label, not iconography.
- **Logo concepts** explored during branding live in `assets/logos/` (reference only — concept 2 uses an off-brand purple blueprint and should NOT be used; the final mark is the compass).

---

## Index / manifest

Root files:
- **`README.md`** — this file. Product context, content + visual foundations, iconography, manifest.
- **`colors_and_type.css`** — all design tokens as CSS variables (colors, type families, radii, spacing, elevation, motion) plus semantic typography classes (`.mc-display`, `.mc-headline`, `.mc-title`, `.mc-body`, `.mc-label`, …). Import this into any HTML you build.
- **`SKILL.md`** — Agent-Skills-compatible entry point for using this system.

Folders:
- **`assets/`** — `maker-compass-logo.svg` (brand mark), `maker-compass-app-icon.jpg`, `google-logo.svg`, `logos/` (branding exploration), `reference/` (live screenshot).
- **`preview/`** — small HTML specimen cards that populate the Design System tab (colors, type, spacing, radii, shadow, components).
- **`ui_kits/maker-compass-landing/`** — high-fidelity marketing landing recreation (hero, Build Map, features, pricing) + JSX components.
- **`ui_kits/maker-compass-app/`** — product workspace recreation (dark sidebar, projects grid, intake, workspace + chat) + JSX components.

Each UI kit folder has its own `README.md` documenting its components.

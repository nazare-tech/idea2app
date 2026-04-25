---
name: Idea2App
description: A workspace that turns a one-line idea into the structured outputs builders ship with.
colors:
  action-red: "#DC2626"
  action-red-hover: "#B91C1C"
  workshop-black: "#1C1917"
  text-primary: "#1C1917"
  text-secondary: "#4A4040"
  text-muted: "#8A8480"
  background: "#FAFAFA"
  card-white: "#FFFFFF"
  warm-paper: "#F5F0EB"
  border-subtle: "#EAE0D8"
  border-strong: "#E8DDD5"
  warm-coral: "#F4A261"
  warm-sand: "#E9C46A"
  warm-ember: "#D95F3B"
  success: "#22C55E"
  info: "#3B82F6"
  destructive: "#C0392B"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.06em"
  headline:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.35rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.06em"
  title:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.18em"
rounded:
  none: "0"
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
  2xl: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.action-red}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.action-red-hover}"
  button-outline:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-outline-hover:
    backgroundColor: "{colors.warm-paper}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  card-product:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.lg}"
    padding: "24px"
  card-landing:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.none}"
    padding: "24px"
  pill-label:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    padding: "6px 12px"
---

# Design System: Idea2App

## 1. Overview

**Creative North Star: "The Builder's Workshop"**

A working space, not a showroom. Tools laid out where the hand reaches for them, paper marked up in red, a single confident accent against tinted white. The system reads as utilitarian and unhurried at the same time. It speaks like a peer who has shipped things, not a vendor selling things. Restraint is not a posture; it is the consequence of every word and pixel earning its place.

The atmosphere is quieter than the Linear / Vercel lane and closer to Stripe's measured calm. Tinted-white surfaces carry the weight. The red accent appears at moments of action, progress, and emphasis, never as decoration. Typography does the heavy lifting: scale contrast, weight contrast, careful tracking. Long-form output (PRDs, competitive reports, tech specs) gets the same craft as the marketing copy, because in this product they are both the artifact.

The system explicitly rejects the **generic AI-tool aesthetic** (gradient hero, glassmorphism, neon, "Powered by AI" badges), the **stock SaaS template** (rounded-card 3-column grid with cartoon hero illustration), the **crypto / web3** look (dark-mode default, neon-on-black, mesh gradients), and **editorial-magazine drift** (display serif + drop caps + broadsheet grid). If a screenshot could be confidently labeled as any of those, it has failed.

**Key Characteristics:**
- Tinted-white surfaces, never `#FFF` flat. Background `#FAFAFA`; warm-paper `#F5F0EB` for muted secondaries.
- One decisive accent (Action Red `#DC2626`), used on ≤10% of any given screen.
- Sharp corners on landing-page composition; gently rounded corners (8px) inside the product workspace.
- Strong scale contrast in typography. Flat hierarchies are the tell of an undesigned page.
- Flat by default. Shadows appear only as ambient elevation under floating elements; never as decoration.

## 2. Colors: The Workshop Palette

A tinted-neutral surface carrying one strong accent. Warm secondary accents (coral / sand / ember) exist for product-internal moments (status, tags, dependency states); they never carry brand identity.

### Primary

- **Action Red** (`#DC2626`, oklch ~57% 0.245 27): The only brand color that earns the privilege of saturation. Used on primary buttons, the wordmark mark, the live-progress line in the Build Map, the `:focus-visible` ring, and the active state of progress affordances. Anywhere the user is being asked to commit, the red appears. Anywhere a screen is just informing, the red is absent.

### Neutral

- **Workshop Black** (`#1C1917`): Body text default; the dark sidebar background; primary headings. A warm-shifted black, not pure black. Always preferred over `#000`.
- **Slate Plum** (`#4A4040`): Secondary text. Where Workshop Black would feel too dominant, this carries the second tier without competing.
- **Ash Mist** (`#8A8480`): Muted text and metadata labels. Quiet, not invisible.
- **Cloud** (`#FAFAFA`): The global background. Tinted off-white that reads as bright but never sterile.
- **Card White** (`#FFFFFF`): Surface white, used for raised-feeling product cards inside `Cloud` backgrounds. The contrast is intentional and small.
- **Warm Paper** (`#F5F0EB`): Hovers, secondary surfaces, footer chrome. Warmer than `Cloud` so the eye perceives a layered surface rather than a stripe.
- **Border Subtle** (`#EAE0D8`) / **Border Strong** (`#E8DDD5`): Hairline boundaries, never colored stripes.

### Accent (auxiliary, product-internal only)

- **Warm Coral** (`#F4A261`): A second-tier highlight for chat / brand-icon moments. Never used in marketing surfaces.
- **Warm Sand** (`#E9C46A`): Dependency / advisory banners (e.g. "this analysis depends on a previous step").
- **Warm Ember** (`#D95F3B`): Reserved. Currently used as a tertiary illustration accent.

### Status

- **Success** (`#22C55E` on `#ECFDF5`): Confirmation pills only.
- **Info** (`#3B82F6` on `#EFF6FF`): Informational banners. Used sparingly; most informational content is a quiet `text-secondary` line.
- **Destructive** (`#C0392B`): Used for destructive actions and form errors. Distinct from Action Red so commitment-positive and commitment-negative don't share a hue.

### Named Rules

**The One Voice Rule.** Action Red appears on at most 10% of any given screen. Its rarity is the point. If you find yourself tinting two unrelated elements red in the same composition, one of them is wrong.

**The Tinted Neutral Rule.** Pure `#000` and pure `#FFF` are forbidden. Every neutral carries a warm tilt (Workshop Black, Cloud, Warm Paper, Card White). The warmth is barely visible at full lightness and structurally important at scale.

**The Auxiliary Accent Rule.** Warm Coral, Warm Sand, Warm Ember exist for product-internal communication (status, dependency, advisory). They do not appear on the landing, in marketing copy, or in the brand mark.

## 3. Typography

**Display Font:** Space Grotesk (with system-ui, sans-serif fallback)
**Body Font:** Sora (with system-ui, sans-serif fallback)
**Label / Mono Font:** IBM Plex Mono (with ui-monospace fallback)

**Character:** A geometric-leaning trio. Space Grotesk carries hero typography with a sharp-but-not-cold display weight; Sora handles body and product copy with humanist warmth; IBM Plex Mono carries kicker labels and metadata with technical authority. The pairing skews toward the tech-minimal lane.

### Hierarchy

- **Display** (Space Grotesk, weight 600, `clamp(2.5rem, 6vw, 4.5rem)`, line-height 0.95, letter-spacing -0.06em): Hero headlines on the landing. One per page.
- **Headline** (Sora, weight 600, `clamp(2rem, 4vw, 3.35rem)`, line-height 0.98, letter-spacing -0.06em): Section headings on landing surfaces; primary page titles in the product. The tightening tracking is intentional; flat tracking reads as undesigned.
- **Title** (Sora, weight 600, 1.5rem, line-height 1.2, letter-spacing -0.02em): Card titles, modal headings, in-page sub-sections.
- **Body** (Sora, weight 400, 1rem, line-height 1.6, letter-spacing normal): Default reading text. Cap line length at 65–75ch in long-form artifacts (PRDs, reports). 1.6 line-height is intentionally generous; this is a tool people read in for minutes, not seconds.
- **Label** (IBM Plex Mono, weight 500, 0.6875rem, line-height 1.2, letter-spacing 0.18em, UPPERCASE): Kicker labels above sections ("FEATURES", "HOW IT WORKS"), navigation rail captions, status pills. The wide tracking and mono font are the system's "metadata voice."

### Named Rules

**The Tight Tracking Rule.** Display and Headline tracking is `-0.06em`, not flat zero. Hero typography with default tracking reads as a wireframe. The tightening makes large type feel intentional.

**The Mono-Label Rule.** Metadata, status, and kicker labels are IBM Plex Mono UPPERCASE with `letter-spacing: 0.18em`. Not Sora small caps, not Sora at smaller weight. The mono shift is the system's way of saying "this is metadata, not voice."

## 4. Elevation

Flat by default. Surfaces sit on the page; depth is conveyed through tonal layering (Cloud `#FAFAFA` background → Card White `#FFFFFF` surface → Warm Paper `#F5F0EB` chrome) and through the difference in border weight, not through shadows.

The single allowed shadow is an **ambient soft shadow** under floating product cards (the milestone cards in the Build Map, hovering controls). It is barely visible. If a shadow can be noticed at a glance, it is too strong.

### Shadow Vocabulary

- **Ambient Soft** (`box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06)`): The only sanctioned shadow. Used on free-floating cards inside graphic compositions and on raised hover states. The `rgba(15, 23, 42, ...)` tint matches Workshop Black so the shadow reads as warm.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only under elements that are not part of the document flow (overlays, floating cards inside SVG compositions). Never on a card that's just sitting in a list.

**The No Glassmorphism Rule.** `backdrop-filter: blur()` is forbidden as a decorative treatment. The only approved use is a faint header backdrop (`bg-white/95 backdrop-blur-sm`) on the sticky landing nav, which is a legibility tool, not a style.

## 5. Components

For each component, lead with character, then specify shape, color, states. Components in the product (`/(dashboard)`) skew rounded; components on landing surfaces skew sharp. This is intentional: the landing voice is more declarative, the product voice is more inhabitable.

### Buttons

A button is a commitment, sized to be obvious from across the screen.

- **Shape:** Gently rounded edges (`rounded-md`, 6px) on default size; sharp corners (`rounded-none`) reserved for landing-page CTAs that want declarative weight.
- **Primary:** `Action Red` background, `Card White` text, `rounded-md` corners, `10px 20px` padding (default size). Hover: shifts to `Action Red Hover` (`#B91C1C`) at 90% opacity. Active: `scale(0.98)` for tactile feedback.
- **Outline:** `Card White` background, `Workshop Black` text, `Border Subtle` border, same shape and padding. Hover: `Warm Paper` fill at 50% opacity.
- **Ghost:** Transparent background, `text-muted-foreground`, no border. Hover: `Warm Paper` fill at 50% opacity, text shifts to `Workshop Black`. Used for navigation and secondary text actions.
- **Destructive:** `Destructive` background, `Card White` text. Reserved for delete / sign-out / abandon actions.
- **Sizes:** sm (h-9, px-3.5, text-xs), default (h-10, px-5, text-sm), lg (h-12, px-8, text-base). Landing CTAs go h-14 px-7 for hero-scale weight.

### Inputs

Inputs are quiet at rest and assertive when focused. The focus state is a controlled red-tinted glow, never an outline.

- **Shape:** `rounded-xl` (12px) — softer than buttons, because inputs are surfaces you live inside while typing.
- **Style:** `surface-soft` (rgba white 3%) background on dark surfaces; Card White on light. `Border Strong` resting border.
- **Focus:** `Action Red` light ring (`rgba(220, 38, 38, 0.4)`), border shifts to `Action Red Mid`, background tints with `rgba(220, 38, 38, 0.02)`. The shift is subtle; the input feels alive, not alarmed.
- **Placeholder:** `Text Secondary`. Disabled: 40% opacity, `cursor: not-allowed`.

### Cards

Two register-locked card flavors. Do not mix.

- **Product Card** (`rounded-lg`, 8px): Used inside `/(dashboard)` for project cards, settings panels, content blocks. `Card White` background on `Cloud` page. `Border Subtle` hairline border. Internal padding 24px.
- **Landing Card** (`rounded-none`, sharp): Used on the landing page for feature cards, stat cards, the Build Map graphic. `Card White` or `Workshop Black` background. `Border Subtle` hairline border. Sharp corners are part of the declarative voice; rounded corners on landing read as soft / generic.

Cards never nest. If the design seems to call for a card-in-card, the inner card is wrong; replace with a tinted background, a top border, or nothing.

### Pill Labels

The kicker label is the system's micro-component for "this is metadata."

- **Style:** `Card White` background, `Border Subtle` border, `rounded-full`, `IBM Plex Mono` text at 11px, weight 500, letter-spacing 0.18em, UPPERCASE.
- **Padding:** 6px 12px.
- **Color:** `Text Secondary` for default; `Text Muted` for tertiary / footer chrome.
- **Where:** kicker labels above sections, "THE BUILD MAP" badge on graphics, "FEATURES" / "HOW IT WORKS" / "PRICING" anchors.

### Navigation

Sticky landing header with `bg-white/95 backdrop-blur-sm`. Items are Sora 14px weight 500. Active state has no underline, only a color shift to `Workshop Black`. Default `Text Primary` with `Text Secondary` hover. The transitions are 200ms.

In-product navigation is a vertical rail with `Workshop Black` background, `Card White` text on active, mono-label captions. Tab order and `:focus-visible` rings respect the keyboard-first audience.

### Build Map (signature component)

A scroll-triggered orchestrated graphic anchored below the landing hero. A dashed Workshop-Black baseline path with an `Action Red` solid progress line drawing across over 3s using `cubic-bezier(0.16, 1, 0.3, 1)` ease-out-expo. Milestone cards lift in (`translateY(12px) → 0` + opacity) as the line reaches each node, stroke-dashoffset connectors trace from each node out to its card. Honors `prefers-reduced-motion` by collapsing to its final static state. This component is the brand's clearest motion statement; copy its idioms (ease-out-expo, no bounce, ambient soft shadow on floating cards, IBM Plex Mono kicker pill) for any future signature graphic.

## 6. Do's and Don'ts

### Do

- **Do** use `Action Red` (`#DC2626`) only at moments of action, progress, or emphasis. The One Voice Rule is non-negotiable.
- **Do** tint every neutral toward Workshop Black. Never `#000`, never `#FFF`.
- **Do** respect the corner-system split: sharp on landing, gently rounded (`rounded-md`, `rounded-lg`, `rounded-xl`) inside the product.
- **Do** use IBM Plex Mono UPPERCASE with `letter-spacing: 0.18em` for kicker labels, status pills, and metadata.
- **Do** ease out with `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) on entrance animation. Match this curve across new motion.
- **Do** honor `prefers-reduced-motion` by showing the final static state. Every entrance animation needs a non-animated fallback.
- **Do** cap body line length at 65–75ch in long-form output (PRDs, reports, tech specs).
- **Do** use the Build Map's idioms (ease-out-expo, ambient soft shadow, mono kicker label) when introducing new signature graphics.

### Don't

- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards, list items, or callouts. Side-stripe borders are forbidden. Use a full hairline border, a tinted background, or a leading number / icon.
- **Don't** use gradient text (`background-clip: text` over a gradient). Solid colors only. Emphasis through weight or size.
- **Don't** ship a "Powered by AI" badge, sparkle emojis, or a purple-blue gradient hero. The generic AI-tool aesthetic is named out of PRODUCT.md and stays out of every screen.
- **Don't** ship a 3-column rounded-card grid of icon + heading + paragraph. The stock SaaS template look is named out of PRODUCT.md and stays out.
- **Don't** default to dark mode. The product is a workshop, lit. Dark is reserved for the sidebar (a deliberate inversion to keep navigation quiet).
- **Don't** drift into editorial-magazine territory: no Cormorant, Playfair Display, or italic drop caps on a builder tool.
- **Don't** use `bounce` or `elastic` easing curves. Ease-out-expo / quart / quint only. No exceptions on entrance animation.
- **Don't** animate layout properties (`width`, `height`, `top`, `left`). Use `transform` and `opacity` only.
- **Don't** nest cards. If your design calls for a card-in-card, one of them is wrong.
- **Don't** introduce a fourth font family. The Space Grotesk / Sora / IBM Plex Mono trio carries the whole system; new fonts dilute the voice. (Note for future redesign: all three are on the impeccable skill's reflex-reject list. If a major rebrand is on the table, this is a lever.)
- **Don't** use em dashes in copy. Use commas, colons, semicolons, periods, or parentheses. This applies to UI strings, marketing copy, and in-product help text.
- **Don't** add accent inflation. Warm Coral / Warm Sand / Warm Ember are auxiliary product-internal accents; they do not appear in marketing or in the brand mark.

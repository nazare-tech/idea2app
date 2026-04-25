# Product

## Register

product

## Users

Founders, indie builders, and product-minded operators who have an idea and want to take it from one-line concept to shipped MVP without burning weeks on prep work. Most are technical or technical-adjacent: they can read a PRD, recognize a feature matrix, hand a spec off to a coding agent, and tell signal from filler.

They reach for Idea2App at two moments:

1. They have a fresh idea and want to validate / structure it before committing engineering time.
2. They want to compress weeks of "figuring out what to build and why" into a single working session, then hand off to Cursor / Claude Code / Lovable / v0 to actually build it.

The blocker is rarely capability. It's analysis paralysis, context-switching across half a dozen tools, and the gap between "I have an idea" and "I have something a coding agent can build."

## Product Purpose

A workspace that turns a one-line idea into the structured outputs builders actually need: competitive research, PRD, MVP plan, mockups, technical spec, and generated app scaffolding. The goal is to collapse the messy front half of building (figuring out what to build, why it matters, how to take it to market) into hours instead of weeks, so the user can spend their time on the part that's actually fun: shipping.

Success looks like a user landing with a vague idea, finishing the prep work in one session, and walking out with everything they need to hand to a coding agent and start building.

## Brand Personality

**Direct. Action-oriented. Builder-focused.**

Voice principles:

- **Direct.** No hedging, no marketing speak, no "leverage your synergies." Speaks like a peer who has shipped things, not a vendor selling things.
- **Action-oriented.** Verbs over nouns. Every line nudges toward shipping. "Build your startup idea this weekend" beats "Empower your entrepreneurial journey."
- **Builder-focused.** Assumes the reader is technical or close to it. Doesn't dumb down concepts (PRD, MVP, GTM are used as-is). Trusts the reader to know what a feature matrix is.

Emotional goals: confidence, momentum, quiet decisiveness. The reader should leave a screen with a clearer next step, not a longer to-do list. The brand should feel like a peer respecting their time, not a tool begging for their attention.

## Anti-references

What this must NOT look like:

- **Generic AI-tool aesthetic.** Purple-to-blue gradient hero, glassmorphism cards, neon accent on dark, "Powered by AI" badges, sparkle emojis. The thing every Y Combinator AI startup ships in their first week.
- **Stock SaaS template.** Rounded-card 3-column grid of icon + heading + paragraph, cartoon hero illustration of diverse people pointing at laptops, blue + white default palette. The Webflow-template look.
- **Crypto / web3 aesthetic.** Dark-mode default, neon-on-black, animated mesh gradients, "futuristic" geometric display type, hero motion that doesn't serve a message.
- **Editorial-magazine drift.** Display serif (Cormorant, Playfair) + italic drop caps + broadsheet grid on a builder tool. Editorial is a real lane, but it isn't this lane.

If a screenshot of this product could be confidently labeled as any of the above, it has failed.

## Design Principles

1. **Practice what you preach.** This is a tool that promises clarity and momentum. The interface itself has to feel quick, clear, and decisive. A laggy or overwrought UI undermines the pitch on the spot.

2. **Show the work, don't sell it.** Trust is earned by the artifacts the product produces (real PRDs, real mockups, real code), not by copy that brags about how it works. No "Powered by AI" badges, no gradient logos, no marketing-team flourishes that the product can't back up.

3. **Bias to the next action.** Every screen makes the next step obvious. Marketing pushes toward signup. Product pushes toward output. No screen is allowed to be a passive read; every surface answers "what do I do here?" within two seconds.

4. **Restraint with one decisive accent.** Tinted neutrals carry the surface. The accent (currently a confident red) earns its place at moments of action, progress, and emphasis. No accent inflation, no decorative color, no gradient when a single tone will do.

5. **Type and structure are the brand.** With no illustration system and minimal photography, hierarchy is the voice. Strong scale contrast, deliberate tracking, varied spacing rhythm. Flat hierarchies and uniform spacing read as undesigned in this lane.

## Accessibility & Inclusion

Target: WCAG 2.1 AA across the product, with particular attention to:

- **Reduced motion.** Honor `prefers-reduced-motion` everywhere; entrance animations and scroll-driven sequences must collapse to their static end states. (The Build Map graphic on the landing already does this; the rest of the site needs an audit.)
- **Color contrast on accent surfaces.** Text on the red accent and on tinted-neutral grays must hit AA at all body sizes and AAA where feasible at large display sizes.
- **Keyboard and screen-reader paths through the workspace.** Power users will spend long sessions inside `/(dashboard)/projects/...`. Tab order, focus rings, and ARIA labels on tab/section navigation must be solid.
- **Cognitive load in long-form output.** PRDs, competitive reports, and tech specs can run thousands of words. Strong section anchoring, in-page nav, and consistent heading hierarchy are an accessibility concern, not a polish concern.

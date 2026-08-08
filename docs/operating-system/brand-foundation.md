# Brand Foundation
Defines the early, runtime-neutral brand step for a new product or company idea.
Canonical brand state lives in `brand/brand.md`; product, UI, copy, and marketing work read it when populated.
The basic foundation requires no paid tools and should happen after the product idea is understandable, before visual or messaging decisions harden.
`build-a-brand` is the optional enhanced route for generated identity assets and must honor its cost gate.
Never block initial validation on a complete visual identity; record unknowns plainly and refine them as evidence arrives.
---

## When To Run

Run this workflow for a new product/company idea, a rebrand, or before the first substantial UI, copy, or marketing pass when no usable brand foundation exists.

Do not force a full brand exercise before the problem and audience are understandable. A concise first pass is enough to give later work a coherent point of view.

## Foundation Pass

1. Read the product overview and the user's source idea.
2. Create or refine `brand/brand.md` with:
   - Brand/product name and one-line description
   - Primary audience and situation
   - Problem, promise, and differentiated point of view
   - Personality and voice
   - Messaging pillars and proof needed
   - Visual direction, including what to avoid
   - Current decisions, open questions, and confidence
3. Mark assumptions as assumptions. Do not invent customer proof, metrics, or research.
4. If a non-placeholder `brand/brand.md` already exists, preserve it and propose scoped edits instead of replacing it.
5. Let product, UI, copy, and marketing work read the foundation; they should not silently redefine it.

## Enhanced Brand Route

Use `.agents/skills/build-a-brand/SKILL.md` when the user wants a richer identity, mood boards, logo assets, design tokens, or a full brand book.

- Quick brand is the default.
- Full brand book is opt-in.
- Paid generation requires the skill's explicit estimate and approval gate.
- Repository-marked projects store generated work under `brand/generated/` and keep `brand/brand.md` canonical.

## Completion

A first-pass foundation is complete when downstream work can answer: who this is for, what it promises, why it is distinct, how it should sound, and what visual territory it should occupy. Unknowns may remain if they are explicit.

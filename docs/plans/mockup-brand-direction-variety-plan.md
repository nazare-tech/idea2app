---
title: Mockup brand direction variety
created: 2026-07-26
implemented: false
area: mockups / AI generation
---

# Mockup brand direction variety

## Problem

Across ten separate Maker Compass ideas, all three generated mockup options came back in the same
narrow visual register: one greenish, one blueish, one nearly identical to both. The three options
read as color reskins of one design rather than three design directions.

## Root cause (verified in source, not assumed)

Four compounding causes, in order of impact:

1. **Color is never specified anywhere in the pipeline.** `MockupDesignDirection`
   (`src/lib/mockups/design-plan.ts:28-38`) carries `layoutStrategy`, `navigationPattern`,
   `density`, `visualTone`, `reusableMotifs`, `consistencyNotes`. There is no palette field, no
   typography field, no radius field, no surface field. Nothing downstream can specify color
   because nothing upstream produces it.

2. **The divergence rule only covers layout.** The planner system prompt
   (`design-plan.ts:112-114`) says *"Every direction must cover the same selected screens, but with
   a different layout strategy."* Visual divergence is never requested, so the planner writes a
   near-identical `visualTone` string for A, B, and C.

3. **The three hardcoded archetypes are one family.**
   `OPENROUTER_MOCKUP_OPTION_CONFIGS` (`src/lib/mockups/openrouter-image-pipeline.ts:98-114`) is
   `Focused dashboard` / `Guided workflow` / `Executive overview`. All three are B2B SaaS product
   surfaces, so even a well-behaved model lands in the same visual neighborhood.

4. **The skeleton asset is saturated indigo.** Every option for a given platform attaches the same
   `public/mockups/skeletons/<platform>-storyboard-skeleton.png`, whose two frame interiors are a
   solid saturated indigo covering roughly 90% of the canvas. This is an image-edit call, not a
   text-to-image call, so the source color statistics anchor the output. The prompt calls these
   "the existing purple placeholders" (`openrouter-image-pipeline.ts:941`), which names the color a
   second time.

With color unspecified and the input asset blue, the image model fills from its own prior. The
GPT-image default product-UI prior is blue/teal/green, white cards, soft shadow, Inter. Same prior
every run, so all ten ideas converge.

This is not intentional. It is unspecified behavior.

## Goal

Make the three mockup options read as three genuinely different design directions for the same
product, and make the visual register differ meaningfully across separate projects. A founder
should be choosing "which of these three products do I want to look like," not "which sidebar
arrangement do I want."

## Decided by the user

The three options vary **both brand direction and layout**, not layout alone. Recorded here so it
is not re-litigated: option A/B/C each carry their own palette, typography, radius, and surface
treatment in addition to their existing layout strategy.

## Assumptions

- Mockups represent the *user's* product, not Maker Compass itself. `DESIGN.md` / `DESIGN.json`
  govern the Maker Compass app chrome and must not leak into generated mockup interiors.
- Image cost dominates token cost for this feature, so adding 15-20 lines of prompt per option is
  economically free relative to one image call.
- The existing two-frame storyboard contract, aspect-ratio assertion, and skeleton-edit rules stay
  exactly as they are. This plan changes what is drawn inside the frames, never the frame geometry.

## Decisions (Recommendation A selected unless noted)

### Q1. Where do palettes come from?

- **A (selected). Deterministic curated bank in code, seeded by `projectId`.** A frozen bank of
  ~20 vetted brand kits, each `{ paletteName, primaryHex, neutralTemperature, typographyPairing,
  cornerRadius, surfaceTreatment }`. A pure function picks three hue-distant entries from a stable
  hash of `projectId`. Hexes are injected into the image prompt as literal values.
- B. Let the design-plan LLM invent hexes per direction.

  Trade-off: B fits product context better in theory, but inventing hexes from a product brief is
  exactly the regression-to-mean that produced this bug. A guarantees divergence both within a
  project and across projects, costs zero tokens, and is unit-testable. A also makes
  regenerate-single-option reproducible, which B cannot be.

  Hybrid actually built: the model still writes direction *names*, motifs, and tone copy, so the
  output stays context-aware. Only the hexes and typographic pairings are deterministic.

### Q2. How many axes vary between directions?

- **A (selected). Five axes**: accent hue family, neutral temperature (warm / cool / pure),
  typography pairing, corner radius, surface treatment (flat / bordered / elevated). Selection
  enforces non-collision on hue family and neutral temperature.
- B. Accent color only.

  Trade-off: B is one line of work but produces three identical layouts in three colors, which
  reads as a toy. Five axes is what makes the options feel like separate products.

### Q3. Backward compatibility of the persisted `design_plan`

`mockups.design_plan` is a persisted Json column (`src/types/database.ts:395`), and the plan also
round-trips through browser localStorage (`mockup_draft_design_plan_${project.id}`,
`src/components/workspace/project-workspace.tsx:66`) and back through `finalize`,
`generate-option`, and `recover-options`, each of which re-parses via `parseMockupDesignPlan`.
`parseDirection` (`design-plan.ts:381-395`) throws when a required field is missing.

- **A (selected). New brand fields are optional in the parser with deterministic fallback,
  required in the generation prompt.** A v1 plan (no brand fields) still parses; the missing kit is
  re-derived from `projectId` + direction label, so a regenerated option lands on the same palette
  as its siblings.
- B. Bump `MOCKUP_DESIGN_PLAN_SCHEMA_VERSION` to v2 and reject v1.

  Trade-off: B is cleaner but breaks regenerate and finalize for every project with an in-flight
  mockup run and every browser holding a v1 draft in localStorage. Not worth it for an additive
  change.

### Q4. The indigo skeleton assets

- **A (selected, needs approval before it runs). Add neutral-grey placeholder skeletons as new
  files** (`<platform>-storyboard-skeleton-v2.png`) rather than overwriting the existing four, and
  point `getMockupStoryboardSkeleton` at the new names. Also drop the word "purple" from the prompt
  in favor of "placeholder fills."
- B. Leave the assets alone and rely on prompt text to override the source color.

  Trade-off: B is free but fights the model on its strongest signal in an edit call. A is the
  higher-leverage half of this whole plan.

  **AGENTS.md requires asking before overwriting existing files.** Writing new `-v2` filenames
  sidesteps that and makes rollback a one-line revert. Confirm before phase 5 runs.

### Q5. Where does the anti-slop taste come from?

- **A (selected). Author the bank and the deny list once, offline, using the `impeccable` and
  `build-a-brand` skills, then freeze the result as TypeScript constants.**
- B. Invoke a design skill at runtime per project.

  Trade-off: B adds a model call, latency, and nondeterminism to a flow that already spends real
  credits. A gets the same taste at zero runtime cost. Rejected B outright.

## Open questions (answered with Recommendation A per policy, flag if wrong)

1. **Should the bank be routed by product category?** A: not in v1. Ship hue-distance selection
   first, measure, then add category routing so a kids' app does not draw enterprise navy.
   B: build the classifier now.
2. **Should generated mockups ever be light/dark mixed?** A: all three light-mode in v1; dark mode
   is a fourth axis that would make options hard to compare. B: let one direction be dark.
3. **Should the direction name be shown to the user?** A: keep current behavior, names stay
   internal and are explicitly not rendered in the image
   (`openrouter-image-pipeline.ts:925-927`). B: surface palette names in the option picker.

## Implementation phases

### Phase 1: author the brand bank (offline, no runtime code)
Use `impeccable` plus `build-a-brand` to produce ~20 vetted brand kits and an anti-slop deny list.
Deny list targets the known AI-UI tells: purple-to-blue gradient headers, glassmorphism, teal-on-
white card soup, Inter everywhere, uniform 16px radius on every element, stacked drop shadows,
emoji as iconography, "Acme Inc" placeholder branding. Output is data, committed as source.

### Phase 2: `src/lib/mockups/brand-directions.ts`
Pure module, no I/O: the frozen bank, `selectBrandDirectionTriad(projectId)`, hue-distance
constraint, `formatBrandDirectionForPrompt(kit)`. Fully unit-testable.

### Phase 3: design-plan schema and prompt
Add optional `brandDirection` to `MockupDesignDirection`; parse with deterministic fallback in
`parseDirection`; extend the system-prompt JSON shape; add the forced-divergence rules ("no two
directions may share a hue family; at most one may use blue, teal, or green as primary").

### Phase 4: image prompt injection
Extend `formatDirectionForPrompt` (`openrouter-image-pipeline.ts:1016-1025`) with literal hex,
neutral temperature, type pairing, radius, and surface treatment. Add the anti-slop deny list to
`OPENROUTER_IMAGE_MOCKUP_SYSTEM_PROMPT` (`openrouter-image-pipeline.ts:810-811`), which is
currently two sentences with no style constraint at all.

### Phase 5: neutral skeletons (gated on Q4 approval)
Render four `-v2` skeletons with neutral grey interiors, repoint the resolver, drop "purple" from
the prompt copy.

### Phase 6: verification, evidence, docs
Real-flow run, evidence capture, doc self-heal.

## Test strategy

**Unit**
- Bank invariants: every kit passes a text-on-accent contrast check; every kit's hex is valid.
- Selection: same `projectId` yields the same triad; across a sample of 200 synthetic ids, triads
  are well distributed and no triad contains two kits within the hue-collision threshold.
- Parser: a v1 plan with no brand fields parses successfully and receives the deterministic
  fallback kit; a v2 plan round-trips unchanged.
- Prompt: the built option prompt contains the literal hex and type pairing for its label.

**Contract**
- A test asserting every field named in the design-plan system-prompt JSON shape is actually read
  by `parseDirection`. This prompt/parser pair has no such guard today and drifts silently.

**Real flow**
Per `.agents/skills/ui-verification/SKILL.md`: run three ideas from different product categories
end to end, capture all nine images, confirm no two options within a project share a hue family and
that the three projects do not collapse to one register. Evidence under
`ui-evidence/2026-07-26/mockup-brand-variety/`.

## Rollback

- `MOCKUP_BRAND_DIRECTIONS_ENABLED` env flag, default on. Off restores the prior prompt text
  verbatim; the schema stays additive and harmless either way.
- Skeletons roll back by repointing at the original filenames, which are never modified or deleted.
- No migration to reverse: `design_plan` is an existing Json column and the change is additive.

## Architecture Improvement Opportunities

| Opportunity | Benefit | Trade-off | Boundary | Status |
|---|---|---|---|---|
| Extract `brand-directions.ts` as a pure module | Testable, reusable by prompt lab and fixtures | One more file | `src/lib/mockups/` | **Selected** |
| Deterministic seeding from `projectId` | Regenerate-single-option is idempotent and matches siblings; no wasted billable retries | Less context sensitivity | `brand-directions.ts` | **Selected** |
| Prompt/parser contract-sync test | Catches silent drift between the JSON shape in the system prompt and `parseDirection` | Small test upkeep | `design-plan.test.ts` | **Selected** |
| Optional-with-fallback parsing | Old persisted and localStorage plans keep working | Slightly looser schema | `parseDirection` | **Selected** |
| Post-generation hue guard (sample dominant hue from the 3 PNGs, regenerate on collision) | Measurable divergence rather than assumed | Extra image round trip, real credit spend | image pipeline | **Deferred** to v2, after v1 divergence is measured |
| Category routing of the bank | Right register per domain, not just different colors | Needs a domain classifier | design plan | **Deferred** to v2 |
| Runtime `build-a-brand` call per project | Maximum context fit | Latency, cost, nondeterminism, unreviewable output | n/a | **Rejected** as over-engineering |
| User-facing palette picker | User control | Scope creep beyond the reported problem | n/a | **Rejected** |

## Runtime and Change-Impact Analysis

- **AI generation.** No new model call. The design-plan text call gains ~10 output tokens per
  direction; each image call gains ~15 prompt lines. Negligible against image cost.
- **Polling / streaming.** `src/app/api/mockups/generate/route.ts` SSE frames carry `designPlan`
  through unchanged; the payload gains fields but no frame shape changes.
- **Queues and partial-content persistence.** `mockup_option_drafts.option_json` is untouched.
  Per-option drafts persist exactly as today, so a mid-run failure still recovers.
- **Shared client state.** `use-document-generation.ts:34` types `designPlan?: unknown` and passes
  it through opaquely, so the client needs no change. Existing browsers holding v1 drafts in
  `mockup_draft_design_plan_${project.id}` are covered by the Q3 fallback.
- **Client-server payloads.** `finalize`, `generate-option`, and `recover-options` each re-parse
  through `parseMockupDesignPlan`. Optional fields keep all three green against v1 and v2 input.
- **Cache invalidation.** None. Images are keyed `${projectId}/${runId}/option-<label>-storyboard`.
- **Billing-adjacent data.** Mockup generation spends credits and a regenerated option is a
  billable retry. Deterministic palettes matter here: a nondeterministic palette would tempt users
  into reroll loops. No change to the credit model itself.
- **Real-flow verification.** Required. This is a user-visible AI output change; unit tests cannot
  confirm that the images actually diverge.
- **Backend change history.** `design_plan` is a persisted data shape, so
  `docs/plans/backend-change-history.md` gets an entry with the shape delta, the v1 compatibility
  path, and the rollback note.
- **Doc self-heal.** `docs/systems/` mockup documentation describing the design-plan shape must be
  updated in the same commit.

## Candid critique

**Architecture.** Sound and additive. The real risk is not the bank, it is the persisted-shape
change fanning out through five call sites and a localStorage key. Q3's optional-with-fallback
choice is doing most of the safety work, and the contract-sync test is the thing that keeps this
from rotting in three months.

**Product.** This solves the reported problem, but it is worth being honest that it treats a
symptom of a deeper one: the three archetypes are all B2B SaaS surfaces. A consumer app, a
marketplace, and an internal tool all get "dashboard / workflow / overview." Recoloring three
dashboards is better than one dashboard in three colors, but archetype diversity is the bigger
unlock and this plan explicitly does not attempt it.

**Customer.** A founder comparing three options wants a decision, not a swatch test. Five varying
axes is the right call. The risk is the opposite failure mode: three directions so different they
feel like three unrelated products, leaving the user unable to choose. The shared screen set,
shared happy-path scenario, and shared data keep them comparable, but this needs eyes on the real
output, not reasoning.

**Engineering.** Modest change, well-bounded. The hue-distance constraint is the only fiddly part
and it is pure and testable. The unglamorous truth is that phase 5, swapping a blue PNG for a grey
one, may outperform phases 1 through 4 combined, so it should not be treated as the optional
tail-end.

**Risk / security.** No auth, RLS, or trust-boundary change. Brand kits are static source
constants, never user input, so they cannot become a prompt-injection vector. The existing
`buildSecurePrompt` sanitization and `user_input` untrusted-context framing are untouched. Only
real risk is spend: real-flow verification across three projects times three options is nine image
calls of expected local QA cost, which the planning workflow explicitly permits.

## Status

Plan only. Nothing implemented. Awaiting go-ahead, plus an explicit answer on Q4 (new `-v2`
skeleton files) before phase 5.

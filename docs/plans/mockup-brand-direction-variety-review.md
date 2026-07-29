# Mockup Brand Direction Variety — Review
Review artifact for docs/plans/mockup-brand-direction-variety-plan.md, implemented 2026-07-28.
Brand kits attach deterministically at prompt-build time seeded by projectId; no LLM schema, DB, or localStorage change; MOCKUP_BRAND_DIRECTIONS_ENABLED=0 restores the old pipeline exactly.
Validation ran BEFORE implementation: a 60-image Codex batch (10 case studies x 2 platforms x 3 kits) against grey skeletons, reviewed by the user on a contact sheet.
User findings from the batch drove the implementation: platform-aware archetypes (desktop step-rails leaked into phone frames), semantic status ramp, grey prompt wording.
Verification: 672/672 unit tests including 12 new brand-direction tests and a flag on/off byte-compatibility test; typecheck clean; real image generation validated by the 60-image batch.
Pre-existing lint error in workspace-document-frame.tsx (setState-in-effect) is unrelated to this change and left untouched.
---

## What was implemented

| Piece | File | Notes |
|---|---|---|
| Runtime brand module | `src/lib/mockups/brand-directions.ts` | Flag, seeded-shuffle triad selection, platform-aware prompt block, anti-slop rules |
| Generated kit bank | `src/lib/mockups/brand-directions-bank.generated.ts` | Emitted by `scripts/build-mockup-brand-bank.mjs`; 15 kits, OKLCH-authored, AA-checked |
| Pipeline integration | `src/lib/mockups/openrouter-image-pipeline.ts` | Kit block appended to option prompt; anti-slop rules in system prompt; grey skeleton + wording when enabled |
| Prompt-lab parity | `src/lib/prompt-lab/index.ts` | Planner-only previews pass `projectId`, so they show the exact kit a live run would use |
| Grey skeletons | `public/mockups/skeletons/*-grey.png` | Raw pixel recolor of the indigo fill (63% of canvas); originals untouched |
| Tests | `brand-directions.test.ts`, pipeline test additions | Bank invariants, determinism, hue separation, distribution, platform archetypes, flag byte-compatibility |
| Docs | product-overview, setup-and-build, directories-and-key-files, test-inventory | Same-commit self-heal |

## Deviation from the plan, and why

Plan Q3 chose "optional brand fields in the design-plan schema with deterministic fallback."
Implementation went further in the same direction: the schema is not extended at all. The kit is
resolved from `projectId` + option label when the image prompt is assembled. Everything Q3's
fallback was defending against (old persisted plans, stale localStorage drafts, regenerate
mismatches) becomes a non-issue because there is nothing new to persist. The planner LLM contract
is byte-identical with the flag on or off.

Consequence worth recording: the planner's freeform `visualTone` can now disagree with the kit.
The kit block opens with "overrides any conflicting visual tone above", and the 60-image batch
showed the image model obeying the kit. Removing `visualTone` from the planner schema would be a
breaking schema change for zero validated benefit; rejected.

## Validation evidence (pre-implementation)

- 60/60 images generated against grey skeletons via Codex `image_gen.imagegen`; 60/60 kept the
  two-frame skeleton contract (frames, chrome, captions).
- Within-idea variety is structural, not chromatic: VenueTurn A (violet, tab bar, shadowed cards,
  rounded) vs C (ochre, serif, 0px, flat, hamburger + wordmark) read as different products.
- Automated hue metrics were attempted and discarded: counting an accent's share of saturated
  pixels penalizes exactly the kits that use accent correctly (~10% of the screen) and rewards
  accent overuse. Recorded so nobody reintroduces that metric. The contact sheet is the evidence.
- User review of the sheet found the one real defect: desktop step-rail/split-pane patterns
  appearing inside phone frames for Trailhead and Vellum kits. Fixed with per-platform archetype
  text; a unit test now rejects desktop-only patterns (side rails, split master-detail,
  three-pane) in any kit's mobile archetype.

## Verification

- `npm test`: 672 pass / 0 fail, including the new suites.
- `npm run typecheck`: clean.
- Flag semantics test proves: flag off -> indigo skeleton path, "purple placeholders" wording, no
  kit block, unmodified system prompt; flag on -> grey path, grey wording, kit block with literal
  hex, anti-slop rules appended.
- `npm run lint`: one pre-existing error in `src/components/layout/workspace-document-frame.tsx`
  (setState-in-effect), file untouched by this work; 5 pre-existing warnings in vendored skill
  scripts. Not remediated here: out of scope and predates the change.

## Architecture improvement review

- **Selected and landed**: pure runtime module with generated data file; deterministic seeding
  (regenerate-single-option idempotent); flag as a byte-exact kill switch; prompt/parser contracts
  untouched, so no new drift surface.
- **Deferred, unchanged from plan**: post-generation hue guard (superseded by the discarded-metric
  finding above, would need a smarter measure); category routing of the bank; per-kit semantic
  hues (shared ramp chosen deliberately so status stays recognizable across directions).
- **New duplication check**: triad selection exists twice by design, in `scripts/lib/brand-triad.mjs`
  (author tooling, plain JS) and `brand-directions.ts` (runtime, typed). Same algorithm; the
  script cannot import TS and the runtime must not import from `scripts/`. Accepted; the shared
  unit tests pin the runtime behavior, and the bank generator's printed triads make drift visible
  at regeneration time.

## Remediation status

No cross-model review findings yet at write time (post-commit hook runs on commit). This file is
updated if the commit review surfaces findings.

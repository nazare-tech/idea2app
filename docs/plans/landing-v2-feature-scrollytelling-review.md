---
title: Landing page v2 — verification and review
plan: docs/plans/landing-v2-feature-scrollytelling-plan.md
date: 2026-07-26
---

# Verification

## Automated

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx eslint src/` | 1 error, pre-existing and untouched: `src/components/layout/workspace-document-frame.tsx:52` (`react-hooks/set-state-in-effect`). No findings in any changed file. |
| `npm test` (654 tests) | all pass |

## Real-browser evidence

Real Chrome via Playwright (`channel: "chrome"`, headed) against the running local
dev server at `http://localhost:3000/`, unauthenticated. The claude-in-chrome
extension was not connected in this session ("Browser extension is not
connected"), so the same real Chrome binary was driven by Playwright instead;
this also matches the known constraint that the hidden browser preview pane
suppresses the scroll events this section depends on.

Artifacts: `ui-evidence/2026-07-26/landing-v2/` (git-ignored). Driver script kept
at `ui-evidence/verify-landing.mjs`.

| File | Route / viewport / state |
|---|---|
| `01-desktop-hero.png` | `/` @ 1440x900, top of page |
| `02-desktop-feature-0{1..5}.png` | `/` @ 1440x900, pinned column parked mid-way through each of the five feature blocks |
| `03-desktop-testimonial.png` | `/` @ 1440x900, features exit into the testimonial band |
| `04-desktop-pricing.png`, `05-desktop-faq.png` | `/` @ 1440x900 |
| `06-desktop-cta-footer.png` | `/` @ 1440x900, page bottom |
| `07-rail-1280.png`, `07-rail-1279.png` | `/` @ 1280x900 and 1279x900, mid-features |
| `08-mobile-hero.png`, `09-mobile-feature-0{1..5}.png`, `10-mobile-cta-footer.png` | `/` @ 390x844, `isMobile`, DPR 2 |
| `11-reduced-motion-feature.png` | `/` @ 1440x900 with `prefers-reduced-motion: reduce` |

Confirmed in evidence:

- All five card sets render and cross-fade with the active copy: competitors
  (with live favicons), personas, build steps, the three mockup PNGs, the four
  prompt cards including the red "Ready to paste" badge.
- Compass rail appears at 1280px (`display: block`, opacity 1, chip advancing
  `134° / 02 PLAN` → `330° / 05 PROMPTS`) and is absent at 1279px
  (`display: none`). Rail progress line, dot, and ticks all animate.
- Bottom-CTA compass mark and footer compass watermark both render.
- Testimonial shows the new avatar and "Rohan Mehta".
- `prefers-reduced-motion: reduce`: content fully readable; the portrait flow lerp
  snaps instead of easing.
- No console errors and no page errors at any viewport.

# Findings and remediation

1. **Horizontal page overflow on mobile.** First mobile run reported
   `scrollWidth: 2354` against `clientWidth: 390`: the portrait "flow" card sets
   deliberately extend past the stage (`overflow: visible`) and the design file
   relies on a page-level `html, body { overflow-x: clip }` that this repo does
   not have. Applying that globally would affect the dashboard, so instead
   `.landing-scrolly-section { overflow-x: clip }` was scoped to
   `max-width: 1023px`, where the section spans the full viewport so the clip
   lands exactly on the screen edges. Desktop is excluded because the stage
   intentionally bleeds left out of the 1320px container there.
   **Status: fixed and re-verified** (`scrollWidth: 390` = `clientWidth: 390`;
   desktop unchanged at 1434/1434).

No other findings.

# Architecture improvement review

- **Landed — single rAF loop.** One `requestAnimationFrame` in
  `feature-scrollytelling.tsx` drives the stage, the pinned column, and the rail.
- **Landed — geometry as data.** All card positions live as
  `{ landscape, portrait, portraitSmall }` triples in `landing-feature-stage.ts`;
  the renderer reads them and nothing else.
- **Landed — off-screen bail.** The loop returns early once the section is more
  than 200px outside the viewport, so the rest of the page costs one rect read
  per frame.
- **Added during implementation — per-card geometry memo.** A `WeakMap` skips
  re-writing identical `top`/`left`/`width`, and the canvas scale and
  portrait/landscape switch only write on change. Not in the plan; it removes
  ~60 style writes per frame.
- **Still deferred** — reusing the workspace document renderers inside the stage;
  extracting a generic scrollytelling primitive. Reasons unchanged.

# Security review

Not applicable in substance: no auth, database, billing, or server surface was
touched, and no user input is read. The one new outbound dependency is Google's
favicon service (`https://www.google.com/s2/favicons?domain=…`), loaded in four
`<img>` tags with `referrerPolicy="no-referrer"` and `loading="lazy"`. It is
already permitted by the existing `img-src 'self' data: blob: https:` CSP and
carries no user data. Failure mode is a missing 16px glyph.

# Follow-up pass (same day, user-directed)

Three decisions were confirmed by the user and applied after the first
verification round; everything above was re-verified afterwards.

1. **Testimonial shipped as designed** — "Rohan Mehta" plus
   `public/landing/testimonial-avatar.png`.
2. **3D tilt removed.** The tilt loop, the per-section tilt sequence, the
   `preserve-3d` wrapper element, and `perspective` on `.landing-scrolly-frame`
   are gone rather than left inert. Cards keep their individual 2D `rotate()`.
3. **Orphaned preview cluster deleted.** `feature-card.tsx`,
   `feature-product-preview.tsx`, `feature-product-preview-live.tsx`,
   `preview-frame.tsx`, `workspace-screenshot.tsx`,
   `sample-preview-document.tsx`, `src/app/landing-preview/`,
   `src/lib/landing-preview-captures.mjs`,
   `public/landing/samples/previews/*.png`, and the `--capture-previews` /
   `--capture-previews-only` modes of `scripts/export-landing-sample.mjs`. Each
   was confirmed reachable only from the deleted landing components before
   removal. Kept: the export script's fixture/mockup export
   (`src/lib/landing-sample-content.ts` still feeds
   `src/components/dev/motion-lab-client.tsx`, and `mockup-option-{a,b,c}.png`
   feed the new stage). `docs/systems/product-overview.md` and
   `docs/systems/directories-and-key-files.md` were updated in the same change
   per the self-healing rule.

Re-verification after the follow-up pass: `tsc` clean (after clearing a stale
generated `.next/types/validator.ts` still referencing the deleted route),
eslint clean on all changed files, 654 tests pass, full browser sweep re-run
with no console or page errors and no horizontal overflow at 1440 or 390.

# Cross-model review coverage

Shipped as `81daf2d5..a71d320e` on `main`.

| Commit | Subject | Codex review |
|---|---|---|
| `2c91315d` | feat(landing): scroll-driven feature section with compass rail | **failed, not reviewed** |
| `cb5b3481` | feat(landing): ship the new testimonial attribution | findings (1, remediated by `2ce503c1`) |
| `2ce503c1` | fix(landing): mark the testimonial avatar decorative | passed (`duplicate_patch` reuse after a message-only amend) |
| `8bf81358` | chore(landing): drop the orphaned preview capture pipeline | passed |
| `a71d320e` | docs(plans): landing v2 plan and review artifacts | skipped, `no_reviewable_paths` (docs only) |

**`2c91315d` carries no cross-model review.** The post-commit hook first failed
with `usage_limit`; a manual retry through `scripts/agent-review.sh` failed with
`Codex ran out of room in the model's context window`. The commit is roughly
1,400 added lines plus the preview-pipeline deletions, which is past the
reviewer's input budget, and `scripts/agent-review.sh` only accepts a commit
range, so the diff cannot be narrowed without rewriting history. Splitting it
was considered and declined by the user on 2026-07-26: the commit was already
pushed, so splitting would have meant rewriting five published commits and
force-pushing `main`.

This is the largest and least externally scrutinised change in the batch. It has
the automated checks and the browser evidence above, and nothing else. If it is
ever revisited, review it in slices by file:
`src/lib/landing-feature-stage.ts` (data), `feature-stage-card.tsx`
(presentation), `feature-scrollytelling.tsx` plus the `landing-scrolly-*` CSS
(the rAF loop, where the real risk is), `compass-mark.tsx` with
`site-footer.tsx`, and `page.tsx` with the deletions.

The one pre-existing unpushed commit that went up with this batch,
`f0068e5a` (feat(skills): add portable Maker Compass workflow, implemented by
Codex), is also unreviewed: its record shows `failed` / `input_too_large` from
2026-07-25.

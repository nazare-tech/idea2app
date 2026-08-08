# Hero Build Map (Landing v2 hero artwork)
Replaces the hero's HeroReelArc with the "build map" node diagram from Claude Design project "Landing page desktop mockup", file `Maker Compass Landing v2.dc.html`.
Adds one client component plus keyframes; no backend, auth, billing, or data-shape change.
The original visual reference was the local, gitignored `docs/design-imports/maker-compass-landing-v2.dc.html`; committed geometry and copy now live in `src/lib/landing-hero-build-map.ts`. Scenario cycling copy is decorative sample content.
Scope: `src/components/landing/hero-build-map.tsx` (new), `src/app/page.tsx` (swap), `src/app/globals.css` (keyframes), `src/lib/landing-hero-build-map.ts` (new data module), `docs/systems/directories-and-key-files.md`, `docs/testing/test-inventory.md`.
Cross-model plan evaluation: `docs/plans/hero-build-map-plan-eval.md`.
UI evidence: `ui-evidence/2026-07-29/hero-build-map/`.
---

- implemented: true
- implemented_at: 2026-07-29T22:20:00-07:00
- implementation summary: `HeroBuildMap` replaces `HeroReelArc` in the hero. New `src/lib/landing-hero-build-map.ts` holds both canvases and the three scenarios; new `src/components/landing/hero-build-map.tsx` renders both variants from one node renderer and owns the cycle; four `hero-node-*` keyframes plus reduced-motion entries added to `globals.css`; hero padding switched to the design's clamps. One deviation from the design file (D6 below): internal node lengths are node-relative rather than fixed pixels, because the design's fixed sizes clip copy at 390, 430, 1024, and 1280px. Gate: lint (new files clean), typecheck, 685/685 tests, `npm run build` including the chunk guard. Evidence: `ui-evidence/2026-07-29/hero-build-map/`. Waitlist hero remains unverified in-browser by design of the threshold (see the change-impact analysis).

## Goal

Bring the shipped landing page to parity with design v2. The only delta found between v2 and `main` is the hero's closing artwork: v2 drops the rotating screenshot reel and instead shows a **build map** — five labelled artifact nodes (Idea, Research, Plan, Design, Prompt) wired by drawn connectors, with a looping "scenario" animation that retypes the idea line and swaps every node's contents in step.

The artwork carries the product's core claim (one line in, four artifacts plus prompts out) in a single glance, which the reel never did.

## Assumptions

1. The local design file guided initial geometry, type sizes, colors, delays, and copy; it remains intentionally gitignored. The committed implementation in `src/lib/landing-hero-build-map.ts` is the reproducible source of truth. Where design hex values already exist as repo tokens, the tokens are used (identical values, see mapping below).
2. Scenario copy (SignalDesk / barber booking / freelance invoices) is illustrative sample content, same standing as the existing feature-stage sample content. No product claim depends on it.
3. `public/landing/samples/mockup-option-{a,b,c}.png` already exist in the repo (verified) and are reused for the Design node.
4. Competitor favicons come from `https://www.google.com/s2/favicons?...`, the pattern already shipped in `feature-stage-card.tsx`, so CSP `img-src ... https:` already allows it.
5. The reel stays in the repo unreferenced (user decision), so this change is a one-line revert in `page.tsx`.

## Decisions

### D1. Component shape

- **Recommendation A (selected): one client component `HeroBuildMap`, geometry in a sibling data module.**
  Node/joint/connector geometry and scenario content live in `src/lib/landing-hero-build-map.ts` as typed constants; the component maps over them and owns one `useEffect` for the cycling loop. Mirrors the existing `feature-scrollytelling.tsx` + `landing-feature-stage.ts` split, so the codebase gains no new pattern.
- Recommendation B: single self-contained component file. Fewer files, but a ~450-line file mixing data and behavior, and it breaks the established split.

### D2. Two breakpoint variants

- **Recommendation A (selected): render both the wide (1760×760) and tall (800×1700) layouts, CSS-toggled at 1024px**, exactly as the design does. Both share `data-bm-*` hooks, and the cycling effect writes to every match, so one loop drives whichever is visible.
  Cost: the inactive variant's DOM exists (roughly +60 nodes, no images beyond the three shared mockups, which are the same `src` in both variants so the browser fetches each once).
- Recommendation B: one variant chosen by a media-query hook. Halves DOM but adds a hydration-mismatch risk and a layout flash at the breakpoint, for artwork that is `aria-hidden` decoration.

### D3. Animation ownership

- **Recommendation A (selected): CSS keyframes for entrance (draw, fade, rise, caret), one async JS loop for scenario cycling.** Entrance needs no JS; the cycle needs sequencing. The loop bails immediately under `prefers-reduced-motion`, leaving scenario 1 rendered statically and fully readable.
- Recommendation B: drive everything from `requestAnimationFrame`. Unnecessary — nothing here is scroll-linked.

### D4. Loop lifecycle

- **Recommendation A (selected): `useEffect` owning a cancellation flag plus a ref to the section; every `await` re-checks the flag, and the effect's cleanup sets it.** The design file's `window.__mclGen` generation counter exists only to survive its own runtime's spurious unmounts and has no React equivalent.
- Recommendation B: port the generation counter. Adds a global for no benefit under React's real lifecycle.

### D6. Internal node sizing (decided during implementation, deviates from the design file)

The design expresses every length inside a node as `min(<px>, <n>cqw)` against the **canvas**. At the canvas's own width the px cap always wins, so type and padding are effectively fixed while node heights, being percentages of a canvas whose height scales with its width, keep shrinking. Measured in real Chrome, that clips copy mid-glyph: Idea and Prompt overflow their boxes at 390px (+17px, +12px), 430px (+14px, +13px), 1024px (+19px, +27px), and Prompt again at 1280px (+11px).

- **Recommendation A (selected): make each node its own container-query context and express internal lengths as a share of that node's width**, with the design's pixel value kept as a `min()` ceiling. Coefficients are derived from the layout data at the design's 1760px reference canvas, so the reference rendering is pixel-identical and every narrower viewport scales the whole drawing instead of cropping it. Verified: no overflow at 390, 430, 768, 1024, 1280, 1440, or 1920.
- Recommendation B: keep the design's values and add per-breakpoint height overrides for the two nodes that clip. Rejected: the deficit differs at every width, so it fixes the widths tested and breaks between them.
- Recommendation C: ship the clipping for design parity. Rejected: text cut through the middle of a glyph is a defect whatever its provenance, and "practice what you preach" makes it a bad one to ship on the landing page.

### D5. Typed-text accessibility

- **Recommendation A (selected): the whole artwork stays `aria-hidden="true"`,** as in the design and as the current reel does. The hero headline and subhead already state the claim; a caret retyping text every ~7s would be a screen-reader nuisance.

## Token mapping

| Design hex | Repo token |
|---|---|
| `#1C1917` | `text-text-primary` |
| `#4A4040` | `text-text-secondary` |
| `#6B7280` | `text-text-muted` |
| `#8A8480` | `text-sidebar-muted` |
| `#E8DDD5` | `border-border-strong` |
| `#EAE0D8` | `border-border-subtle` |
| `#F5F0EB` | `bg-secondary` |
| `#DC2626` | `bg-primary` / `text-primary` |
| `#FAFAFA` | `bg-background` |
| `#FFFFFF` | `bg-card` |

`#EFE7E0`, `#FCFAF8`, `#F0E9E2` have no token; they are the paper-stack and hairline shades used only inside this artwork and stay as literals with a comment, matching how `feature-stage-card.tsx` handles its one-off `#E2DDD6`.

## Geometry (from the design file, verbatim)

**Wide variant** — canvas `1760×760`, `container-type: inline-size`, `max-width: 1760px`, connectors in an overlaid `viewBox="0 0 1760 760"` with `preserveAspectRatio="none"` and `vector-effect="non-scaling-stroke"`.

Connectors (stroke `#E8DDD5` 1.25, `stroke-dasharray: 600`, `mclNodeDraw 1.1s` expo):

| Path | Delay |
|---|---|
| `M340,320 C392,320 378,300 430,300` | 300ms |
| `M720,300 C778,300 752,420 810,420` | 410ms |
| `M1120,420 C1178,420 1152,205 1210,205` | 520ms |
| `M1120,420 C1178,420 1152,530 1210,530` | 630ms |

Joints (13px circles, 1px `#E8DDD5`, white, `translate(-50%,-50%)`, `mclNodeFade 0.6s`): `19.3182%/42.1053%` 700ms, `24.4318%/39.4737%` 740, `40.9091%/39.4737%` 780, `46.0227%/55.2632%` 820, `63.6364%/55.2632%` 860, `68.75%/26.9737%` 900, `68.75%/69.7368%` 940.

Nodes (`left/top/width/height`, `mclNodeUp 0.8s` at delay):

| Node | Position | Size | Delay | Surface |
|---|---|---|---|---|
| Idea | 2.2727% / 32.8947% | 17.0455% × 18.4211% | 80ms | white + paper stack |
| Research | 24.4318% / 11.8421% | 16.4773% × 55.2632% | 180ms | `#F5F0EB` |
| Plan | 46.0227% / 22.3684% | 17.6136% × 65.7895% | 280ms | white |
| Design | 68.75% / 9.2105% | 20.4545% × 35.5263% | 380ms | `#F5F0EB` + paper stack |
| Prompt | 68.75% / 55.2632% | 23.8636% × 28.9474% | 480ms | white |

**Tall variant** — canvas `800×1700`, `max-width: 720px`, connectors `M320,200 C320,272 410,278 410,350` (300ms), `M410,620 C410,700 380,700 380,780` (410), `M380,1110 C380,1182 410,1168 410,1240` (520), `M410,1400 C410,1472 450,1458 450,1530` (630). Eight joints: `40%/11.7647%` 700, `51.25%/20.5882%` 740, `51.25%/36.4706%` 780, `47.5%/45.8824%` 820, `47.5%/65.2941%` 860, `51.25%/72.9412%` 900, `51.25%/82.3529%` 940, `56.25%/90%` 980. Nodes: Idea `3.75%/5.8824%` `36.25%×8.2353%`; Research `51.25%/17.6471%` `41.25%×21.1765%` (label right-aligned); Plan `3.75%/42.9412%` `43.75%×24.7059%`; Design `51.25%/70%` `42.5%×14.7059%` (label right-aligned); Prompt `3.75%/87.0588%` `52.5%×11.7647%`.

Type inside nodes scales on the container: labels `min(11px, 2.9cqw)`, body `min(12px, 3cqw)`, kickers `min(9px, 2.1cqw)`, competitor names `min(13px, 2.9cqw)`, file rows `min(11px, 2.4cqw)`. Padding follows the same `min(px, cqw)` form. Below 640px the tall variant's label rows stack to a column (`gap: 3px`, `line-height: 1.15`, `letter-spacing: 0.1em`).

Paper stack: two offset siblings behind the card face at `min(18px,3.4cqw)` (`#EFE7E0` border, `#FAFAFA` fill) and `min(9px,1.7cqw)` (`#E8DDD5` border, `#FCFAF8` fill), each inset on the top-left and pushed out the same amount bottom-right.

## Scenario cycle

Three scenarios, cycled forever. Every rendered field is listed here; nothing is left to the implementer's invention.

**Scenario 1** — idea: *"Turn scattered customer feedback into a ranked roadmap for B2B SaaS teams."*
Competitors (favicon domain · name): `productboard.com` · Productboard, `canny.io` · Canny, `aha.io` · Aha!.
Persona: `MC` · Maya Chen · Product Manager.
Goals: "One inbox for every feedback source" / "Themes ranked by revenue at stake" / "A roadmap the team can defend".
Files: `signaldesk-brief.md`, `prd.md`, `personas.md`, `first-version-plan.md`, `prompt-01.md`. Mockup: option A.

**Scenario 2** — idea: *"A booking app for independent barbers, with deposits that end no-shows."*
Competitors: `getsquire.com` · Squire, `booksy.com` · Booksy, `fresha.com` · Fresha.
Persona: `DL` · Dre Lawson · Shop Owner.
Goals: "Clients book without the DM thread" / "Deposits cut no-shows to near zero" / "One clean week view per chair".
Files: `chairbook-brief.md`, `prd.md`, `personas.md`, `first-version-plan.md`, `prompt-01.md`. Mockup: option B.

**Scenario 3** — idea: *"Invoices that chase late payments themselves, built for freelancers."*
Competitors: `freshbooks.com` · FreshBooks, `hellobonsai.com` · Bonsai, `honeybook.com` · HoneyBook.
Persona: `SK` · Sana Khan · Freelance Designer.
Goals: "An invoice out in under a minute" / "Reminders that send themselves" / "Who owes what, at a glance".
Files: `latepay-brief.md`, `prd.md`, `personas.md`, `first-version-plan.md`, `prompt-01.md`. Mockup: option C.

Static node copy that does not cycle: the five label pairs (Idea / One line, Research / Competitive analysis, Plan / Product plan, Design / Mockups, Prompt / Ready for your agent), the Research footnote "+ 9 more mapped", the Plan node's "Persona" and "Goals" kickers, and the Plan node's `G1`/`G2`/`G3` goal markers.

Timing, verbatim from the design: 1700ms initial hold → fade all four content panels to 0 and clear the idea text → 460ms → apply the next scenario's data → type the idea line at `14 + random*16` ms per character → 150ms → fade panels back in staggered at `index * 170` ms (Research 0, Plan 1, Design 2, Prompt 3) → 3800ms hold → repeat.

Under `prefers-reduced-motion: reduce` the loop never starts: scenario 1 is the server-rendered content, all panels at opacity 1, and the existing global reduced-motion block already neutralizes the entrance keyframes and the caret blink. The component also subscribes to that media query's `change` event: enabling reduction mid-session cancels the running loop and restores scenario 1 at full opacity, and disabling it starts the loop from the initial hold. This matters because the hero can sit open for a long time on a page a visitor never scrolls.

## Keyframes to add (`globals.css`)

`hero-node-up` (opacity 0 + `translateY(14px)` → rest), `hero-node-fade`, `hero-node-draw` (`stroke-dashoffset: 600 → 0`), `hero-node-caret` (`0,55% opacity 1; 56%,100% opacity 0`, `steps(1)`, infinite). Named on the existing `hero-*` prefix; each gets a `.hero-node-*` utility class using `var(--motion-ease-out-expo)`, and the caret plus the three entrances are added to the existing `prefers-reduced-motion` block alongside `.hero-enter-*`.

## Hero container changes (`page.tsx`)

v2's hero content box drops the `min-h` that existed only to reserve room for the reel and uses `padding: clamp(48px,7svh,92px) … clamp(24px,3vw,40px)` with `align-items: center; justify-content: flex-start`. Applying that removes the tall empty band the reel's reservation leaves behind. Headline, subhead, idea capture, and waitlist branch are untouched.

## Implementation phases

1. **Data module** — `src/lib/landing-hero-build-map.ts`: `WIDE_LAYOUT` / `TALL_LAYOUT` (connectors, joints, nodes), `BUILD_MAP_SCENARIOS`, `CYCLE_TIMING`. Pure data, unit-testable.
2. **Keyframes** — the four `@keyframes` + utility classes + reduced-motion entries in `globals.css`.
3. **Component** — `hero-build-map.tsx`: five node renderers (Idea, Research, Plan, Design, Prompt) each rendered once per variant from shared layout data, plus the cycling effect.
4. **Page wiring** — swap `HeroReelArc` for `HeroBuildMap`, apply the v2 hero padding.
5. **Tests** — `src/components/landing/hero-build-map.test.tsx`, in the repo's runner conventions (`node:test` + `node:assert/strict` + `renderToStaticMarkup`, as `hero-reel-arc.test.tsx` does): both variants render, all five nodes per variant, scenario 1's content is present in the server markup, the artwork roots are `aria-hidden`, and the referenced mockup PNGs exist on disk. A pure-data test asserts every node/joint percentage parses as a number, every connector path is non-empty, and every scenario carries exactly 3 competitors, 3 goals, 5 files, and an in-range mockup index.
6. **Docs** — update `docs/systems/directories-and-key-files.md` (the tree comment on `page.tsx`, its table row, and a new row for `hero-build-map.tsx`, with the reel row restated as inactive-but-retained) and add the new test to `docs/testing/test-inventory.md`. Self-healing rule: those docs currently describe the reel as the hero artwork.
7. **UI verification** — real Chrome against the local dev server at 1440×900 and 390×844: entrance, at least one full scenario swap (screenshot before and after the typed line changes), reduced-motion static state, and no console errors. Evidence to `ui-evidence/2026-07-29/hero-build-map/`.

## Test strategy

- Unit: the two tests above, run by the repo's `npm test` (`node --import tsx --test`). Not vitest, and not RTL — neither is in this project. Nothing is fake-timed; the cycling loop is asserted only through its static first frame, since it is decorative and time-dependent.
- Full gate before commit: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. The build matters here specifically because this adds a client component and new CSS to the highest-traffic route, and because `npm run build` runs the chunk-size guard.
- Real-browser verification is the primary gate, per the UI-verification router entry — a component test cannot see a `cqw`-scaled `translate(-50%,-50%)` node landing on its connector.

## Rollback

Single revert: restore the `HeroReelArc` import and JSX in `page.tsx` and the hero's previous `min-h`, and revert the two doc files to their reel wording. The reel component, its test, its CSS, and its assets all remain on disk, so no asset restore is needed. The new files are additive and inert once unreferenced.

## Architecture Improvement Opportunities

- **Selected — layout data in a typed module.** Benefit: the two variants stop being copy-pasted markup; adding or nudging a node is a data edit, and the geometry becomes testable. Trade-off: one more file. Boundary: `src/lib/landing-hero-build-map.ts`.
- **Selected — one shared node renderer per node type across variants.** Benefit: content and label markup exist once, so a copy change cannot drift between desktop and mobile. Trade-off: the renderer takes a variant-specific position object. Boundary: `hero-build-map.tsx`.
- **Deferred — extract a shared `usePrefersReducedMotion` hook.** Three landing components now read that media query inline. Real duplication, but folding it in here widens this diff into files this task does not otherwise touch; better as its own cleanup.
- **Deferred — a shared `<PaperStack>` primitive.** The stacked-paper motif appears in the hero nodes and (differently) in the workspace blocks. Not yet the same thing twice; abstracting now would guess at the union.
- **Rejected — driving scenario cycling from a scroll/IO-gated scheduler so it pauses off screen.** Over-engineering for a hero that is above the fold; the loop is four style writes plus a text write every ~7s.
- **Rejected — self-hosting the competitor favicons.** Would trade a decorative third-party fetch for an asset-freshness problem, and the shipped feature stage already sets this precedent.

## Runtime and Change-Impact Analysis

- **AI generation / queues / partial content:** untouched. No generation path, no persistence, no polling.
- **Shared client state:** none. The component owns local refs only; no context, no store, no URL state. It cannot affect the auth modal or the intake handoff that live in the same hero.
- **Client-server payloads:** none. `HeroBuildMap` is a client component with no props and no fetches; the page stays a server component and its `getUserCount` / auth branch are unchanged.
- **Cache invalidation:** none. `unstable_cache` on the user count is untouched; the artwork is static markup plus client-side style writes.
- **Billing-adjacent data:** none.
- **Waitlist branch:** the hero swaps the idea capture for the waitlist form when `waitlistMode` is true. `waitlistMode` comes from `isWaitlistMode(profileCount)` against the hard-coded `WAITLIST_LIMIT = 200`, so there is no configuration switch — reaching that state locally would mean editing the constant or seeding 200 profiles. Editing the constant is exactly the patched state the UI-verification rules forbid as evidence, so **the waitlist hero is reported as not verified in the browser** rather than verified against a doctored build. What limits the risk: the artwork renders below the CTA slot, outside the branch, and the branch itself is untouched by this change. The hero container's padding change is shared by both branches and is covered on the non-waitlist path; if the waitlist form needs a padding tweak, that surfaces the first time the threshold is genuinely crossed.
- **Performance:** three mockup PNGs are already served on this page's later feature stage, so the hero shares those cache entries; the wide/tall duplication adds DOM, not network. The cycling loop is `setTimeout`-driven, not per-frame. Entrance animations are opacity/transform/`stroke-dashoffset` only — the last is not compositor-only, but it runs once for 1.1s on four short paths.
- **Real-flow verification:** landing page loaded in real Chrome against the local dev server, both breakpoints, signed out (the page redirects authenticated users to `/projects`, so the hero is only ever seen signed out).

## Candid critique

**Architecture.** Clean: additive files, one data module, one client component, no shared state. The main smell is that `page.tsx` keeps a now-unused `HeroReelArc` in the tree — dead code by explicit choice, and worth a comment saying so, or it will read as an oversight in three months.

**Product.** The build map argues the product's claim far better than a spinning wall of screenshots; the typed idea line is the whole pitch in one gesture. Risk: five nodes of small text at 1024–1280px is dense, and the `min(px, cqw)` sizing means it shrinks rather than reflows. If it reads as cluttered in verification, the honest fix is fewer visible nodes at mid widths, not smaller type.

**Customer.** A first-time visitor sees a diagram whose content changes under them every seven seconds. That is engaging on arrival and mildly distracting while reading the subhead. The 3800ms hold is the design's answer, and reduced-motion users opt out entirely. Worth watching in verification whether the swap steals attention from the idea input, which is the actual conversion target.

**Engineering.** The cycling loop is the only real hazard: an async `while` loop must not outlive the component. The cancellation flag is checked after every `await`, including inside the per-character typing loop, and the mockup-crossfade `setTimeout`s are also flag-guarded before they write. Second hazard: the two variants must not drift, which is why nodes render from one shared renderer.

**Risk / security.** No auth, RLS, webhook, billing, or migration surface — no on-demand cross-model diff review required. One third-party image host (already used, already CSP-permitted); it is decorative and a failed fetch leaves an empty 18px box next to a legible name. No user input, no `dangerouslySetInnerHTML` (the prompt-file rows are plain text nodes, not the design's `<br>`-joined markup — those are rendered as arrays of lines instead).

## Cross-model plan evaluation

Run: `scripts/agent-review.sh --implementer claude --plan docs/plans/hero-build-map-plan.md` (reviewer: Codex, gpt-5.6-terra, medium reasoning). Result: `docs/plans/hero-build-map-plan-eval.md`, six findings, all accepted.

| # | Finding | Disposition |
|---|---|---|
| 1 | MAJOR — scenarios 2 and 3 elided four of five filenames each, so user-visible copy would be invented | Accepted. Every scenario field is now spelled out above, plus the static node copy that never cycles. |
| 2 | MAJOR — the design source was named but not located or versioned | Accepted. The export is committed at `docs/design-imports/maker-compass-landing-v2.dc.html` with its sha256 and project id recorded in the assumptions. |
| 3 | MAJOR — plan specified vitest + RTL; the repo runs `node --import tsx --test`, and the build check was missing | Accepted. Test strategy now names the repo's runner and `renderToStaticMarkup` pattern, and the gate is lint + typecheck + test + build. |
| 4 | MAJOR — verifying the waitlist branch by "toggling the threshold locally" is the patched state the UI rules forbid | Accepted. That branch is now declared unverified with the reason and the residual risk, instead of claimed as covered. |
| 5 | MINOR — reduced motion was only read once, so enabling it mid-session left the loop running | Accepted. The component subscribes to the media query's `change` event and cancels or restarts accordingly. |
| 6 | MINOR — `docs/systems/directories-and-key-files.md` still describes the reel as the hero artwork (self-healing rule) | Accepted. Doc updates are phase 6, in scope and in the rollback note. |

No findings rejected.

## Open questions

None blocking. The user chose to keep `HeroReelArc` on disk unreferenced.

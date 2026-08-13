---
implemented: true
implemented_at: 2026-08-12
implementation_summary: Added secure ordered A/B/C dashboard previews, carousel controls and touch swiping, updated Figma-aligned card geometry, durable docs, unit coverage, and authenticated browser coverage. Remaining verification gaps are recorded below and in the implementation review instead of being represented as complete.
---

# Plan: Dashboard Project Card Carousel Redesign

## Goal

Match MakerCompass Figma node `435:5578`: keep the 647×500 responsive project-card proportions, replace the title-row horizontal overflow with a media-panel vertical kebab, expose all valid A/B/C mockups as a carousel with dots and bounded previous/next controls, and apply capability-aware interaction rules: desktop controls appear on hover/focus, touch always shows only the kebab and uses horizontal swipe for carousel navigation.

## Assumptions

- The newest canonical mockup row remains the only dashboard preview source; malformed newest content does not fall back to an older visual version.
- Generated rows normally contain A/B/C. Historical partial rows show their valid slides in canonical A/B/C order; controls and dots reflect actual valid slides.
- Desktop first slide shows Next only, middle slides show Previous and Next, last slide shows Previous only. Touch hides both arrows and navigates by swipe.
- The full card remains one large project link. Kebab and arrows remain sibling buttons outside the link, preserving valid HTML and preventing carousel actions from opening the workspace.
- Carousel dots are always-visible sibling buttons outside the card link with 6px visual marks and larger invisible hit targets. One active dot is the control group's single tab stop; Left/Right Arrow keys move slides and focus using a roving-tabindex pattern. Visible arrows are pointer controls outside the default tab order, preventing five extra tab stops per card.
- The vertical kebab is unconditional media-panel overlay chrome. It renders for ready, partial, empty, unavailable, and image-failure states.
- Rename/Delete behavior, permissions, dialogs, project grid gap, dot-field background, and workspace warmup remain unchanged.

## Clarifying Questions

1. How should incomplete historical mockup rows behave?
   - Recommendation A: Show every valid available slide in A/B/C order; dot and arrow counts match available slides.
   - Trade-off: Historical projects remain useful without inventing missing content.
   - Recommendation B: Require all three and fall back to the empty state otherwise.
   - Trade-off: Strong visual consistency, but hides valid mockups from older/partial rows.
   - Selected: Recommendation A under repository policy.
2. Should carousel images all load immediately?
   - Recommendation A: Mount all available native lazy images and hide inactive slides.
   - Trade-off: Keeps slide switching immediate and state simple; native lazy loading can defer off-screen cards, but an in-viewport card may request all three images.
   - Recommendation B: Render/preload all three images per card.
   - Trade-off: Instant transitions, but up to three private image requests per visible card without user intent.
   - Selected: Recommendation A.
3. Should carousel navigation emit product analytics?
   - Recommendation A: Add no event because no named product decision or funnel consumes generic dashboard carousel clicks/swipes.
   - Trade-off: Avoids surveillance noise and mockup-content leakage; carousel adoption is not measured yet.
   - Recommendation B: Add controlled previous/next/swipe events.
   - Trade-off: More interaction data, but no denominator or decision currently justifies it.
   - Selected: Recommendation A, matching the taxonomy.

## Recommended First Step

Write red-state derivation/render contract tests for ordered A/B/C previews and carousel indicators, plus a focused Playwright bounding-box test that fails against the current 339/161px split before changing the card interaction layer.

## Runtime And Change-Impact Analysis

### Repeated Work

- No timer, autoplay, polling, subscription, generation, persistence, or external provider call is added.
- Carousel state changes only on an explicit arrow/dot action or qualifying touch swipe. Each update changes one card-local integer and reveals one active image.
- Expected frequency is a few interactions per inspected card; worst case is rapid bounded clicks across three slides. Work is O(1) per interaction.
- The server mockup query is unchanged. Parsing now retains up to three already-present option paths instead of discarding B/C.

### Ownership, Scope, And Lifetime

- `DashboardProjectCard` owns its active index. `buildMockupImageProxyUrl()` is deterministic (`projectId` + encoded Storage path; no signed token), so a stable ordered label/URL signature preserves the index across equal new arrays (for example Rename `router.refresh()`), while a real preview-content change resets to Option A.
- `ProjectCardThumbnail` owns touch gesture measurement and failed-image tracking. Failures are keyed by the stable label+URL signature, so regenerated content ignores stale failures without an effect-driven state reset.
- The server-only dashboard derivation helper owns authorization filtering, newest-row selection, label ordering, path validation, and fixture allowlisting.
- State does not enter global stores, URLs, local storage, database rows, or analytics.

### Boundary And Cache Semantics

- Internal server-to-client card props change from one `thumbnailUrl` to ordered `mockupPreviews[]`; no API, database, RLS, Storage, or persisted content shape changes.
- Every real image continues through `/api/mockups/image`, which performs authentication and ownership checks. Persisted raw image URLs remain rejected.
- `/api/mockups/image` returns `Cache-Control: private, max-age=300`; all available native lazy images remain mounted so back-navigation is instant and does not depend on cache freshness.
- Newest-row semantics remain deterministic by `created_at`, then id. Valid slides are ordered A/B/C; the first valid occurrence for a duplicate label wins.

### Failure And Recovery

- Invalid/unsafe/unauthorized options are omitted independently. Zero valid options renders the existing empty/unavailable state.
- A failed active image renders the existing fallback; arrows/swipe can still reach other valid slides. This preserves the existing reload-to-retry behavior rather than adding a new authenticated-image retry UI.
- Horizontal swipe must exceed 40px and dominate vertical movement. A qualified gesture marks its synthetic click consumed; the click handler clears that flag, while the next `touchstart` also resets it if no click was synthesized. `touchcancel`, preview-signature change, and unmount clear gesture state. This avoids timer races and lets a later real tap open the project. Vertical scrolling remains native through `touch-action: pan-y`.
- Rollback restores the scalar Version A prop/helper and prior card geometry; no data rollback is required.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Unsafe cross-project image path | Pure derivation tests | No unauthorized, `..`, mismatched fixture, or non-project path enters props |
| Threefold dashboard image traffic | DOM/browser request inspection | Native lazy images defer off-screen cards; document that an in-viewport three-slide card can request all three authenticated images |
| Card opens during carousel action | Playwright click/swipe flow | URL stays `/projects` after arrow, kebab, and qualified swipe |
| Touch controls violate request or AT access | Touch-enabled Playwright with coarse-pointer self-check | Kebab visible; visual arrows absent; dots and visually hidden arrow semantics remain operable; swipe changes active index; explicit navigation updates a single live status |
| Hover controls undiscoverable to keyboard | Playwright hover/focus checks | Fine-pointer controls hidden at rest, visible on hover and focus-within |
| Figma geometry drift | Browser bounding boxes + Chrome screenshots | Card 500px, media 378px, details 122px, 24px media radius, 20px inset, 32px arrows at media center |
| Carousel ordering/state drift | Unit + Playwright | A/B/C canonical order; arrows clamp at ends; active dot/index updates exactly once |
| Existing action regression | Existing rename/delete browser journey | Menu exact items, dialogs, persistence restore, and delete gating remain green |

## Architecture Improvement Opportunities

- **Selected — typed ordered preview contract.** `DashboardMockupPreview { label, url }` keeps label ordering/path trust centralized instead of re-parsing client-side. Trade-off: scalar prop changes across page/card/thumbnail.
- **Selected — mount all native lazy slides.** Keeps instant switching and avoids effect-driven visited state. Trade-off: an in-viewport card can request all three images.
- **Selected — one semantic control set with capability-driven CSS presentation.** Arrow buttons always stay in the accessibility tree; `(hover: none) and (any-hover: none)` visually hides them only when no hover-capable input exists, while direct dot buttons and swipe remain visible. Fine-pointer and hybrid-device hover/focus show the same arrows. Trade-off: CSS capability combinations require explicit browser checks.
- **Selected — local three-slide controller.** Avoids adding a carousel dependency for bounded state. Trade-off: swipe threshold and native post-swipe click behavior need focused coverage.
- **Deferred — shared generic carousel abstraction.** No second product surface currently needs the same DOM/link/touch contract; abstraction now would hide card-specific rules.
- **Rejected — preload all slides on card hover.** Casual pointer travel across the grid could trigger many private image requests without intent.

## Plan

- [x] Add failing Node tests for ordered A/B/C derivation, per-option security, all three fixture options, partial rows, and media/details render contracts; add Playwright geometry and carousel interaction coverage.
- [x] Audit every `deriveDashboardMockupThumbnailUrls` and scalar `thumbnailUrl` caller before changing the internal contract; only ProjectsPage plus focused tests called it.
- [x] Replace scalar thumbnail derivation with typed ordered previews while preserving authorization and newest-row semantics.
- [x] Rebuild thumbnail/details to Figma geometry: 378px bordered white media surface, 24px radius/20px inset, 122px text area, title/date row, clipped description.
- [x] Add card-local carousel index, roving sibling dot buttons, previous/next pointer controls, unconditional vertical kebab placement, native lazy slide images, and stable-signature prop/state reconciliation.
- [x] Add touch swipe on the 378px media panel only, with vertical-scroll discrimination. Verify with real CDP touch input that a qualifying swipe does not activate the card link and the next genuine tap does. Swipes over details do not change slides.
- [x] Apply fine-pointer hover/keyboard-focus visibility and coarse-pointer always-kebab/no-visible-arrow rules to one semantic arrow set; populate one polite slide status only after explicit navigation.
- [x] Update Playwright geometry, hover visibility, A/B/C navigation, dot-keyboard focus, URL stability, and touch swipe coverage while preserving rename/delete flow.
- [x] Update architecture, product overview, key-file map, and test inventory docs; record why no analytics event or backend history entry is needed.
- [ ] Add explicit hybrid coarse-pointer-plus-hover, overlay dead-strip, arrow-focus-retention, and authenticated image-request-count assertions. Current coverage proves desktop hover, dot-keyboard focus, touch swipe, URL stability, and carousel bounds but not these four narrower cases.
- [x] Run focused red/green tests, full tests, typecheck, lint, and diff check. Focused Playwright coverage exists in `e2e/smoke.spec.ts`; its final pre-push status is recorded in the implementation review.
- [x] Verify authenticated `/projects` at desktop and verify coarse no-hover touch behavior through authenticated Chromium/CDP; capture static/middle-slide/menu evidence under `ui-evidence/2026-08-12/project-card-carousel-redesign/`.
- [x] Run fresh-eyes architecture/code/security review, remediate findings, rerun affected verification, and finalize plan metadata.

## Milestones

1. A/B/C preview contract is secure and deterministic.
2. Card matches updated Figma geometry and carousel state.
3. Desktop hover/focus and touch swipe behaviors meet the explicit request.
4. Existing Rename/Delete flows, full test suite, and real Chrome evidence are green.

## Test Strategy

- Node tests: canonical A/B/C ordering; lowercase/out-of-order/duplicate/unknown labels with first-valid duplicate precedence; partial options; malformed newest row; unauthorized and unsafe paths; exact A/B/C fixture paths; empty/query-unavailable; all lazy slides with only A visible initially; dot count equals valid preview count; one-slide arrows/dots absent; two-slide state; three-slide active index; unconditional zero-preview kebab contract; new media/details render contract.
- Playwright desktop/fine pointer: dots stay visible at rest; kebab/arrows are hidden at rest by opacity/pointer events; hover reveals vertical kebab and applicable arrows; next/previous updates image/index/dots without navigation; controls remain sibling to link; every overlay wrapper is pointer-transparent with only its controls re-enabled, and clicks beside dots/arrows still open the project. One roving dot tab stop per carousel supports Left/Right keys; menu Rename/Delete flow remains intact. Both arrows remain mounted; unavailable directions use `aria-disabled` plus visual hiding so control/focus ownership is not destroyed at a bound. Add a coarse+`any-hover:hover` hybrid check proving mouse hover still reveals arrows.
- Playwright touch context: first assert the exact CSS branch `matchMedia('(hover: none) and (any-hover: none)').matches`; dispatch real `touchstart`/`touchmove`/`touchend` through CDP `Input.dispatchTouchEvent`, with a handler-observed state change as the gesture self-check. Kebab is visible at rest; visual arrows use a clipped visually-hidden treatment with semantic activation intact; horizontal media swipe advances; details-area swipe does not; vertical-dominant gesture does not; the next real tap opens the project instead of being swallowed.
- Dashboard refresh behavior: `/projects` is a dynamic server render with no generation polling. Canonical current-generation rows appear only after all A/B/C drafts finalize. A card open on the dashboard stays empty until navigation/refresh, matching existing behavior; when new preview props arrive, index resets to A. Equal-content refreshes preserve index.
- Real Chrome: prefer an existing authenticated project with three valid options for full bounded-arrow evidence. A two-option historical project can prove count/bounds; a zero-option card proves unconditional menu/empty state. If no existing project has any valid option, report the evidence blocker and request explicit fresh-project/generation approval. No new project/generation/credits without that approval.
- Performance proxy: observe selected-card `/api/mockups/image` requests and confirm off-screen cards retain native lazy loading. Record the accepted trade-off that all three images may load for an in-viewport card.
- Geometry checks wait for `document.fonts.ready`, use ±1px tolerances for fixed heights, assert centered `object-fit: contain` within the inset box at desktop/narrow widths, and verify description clipping by overflow behavior rather than font-derived line boxes.
- Title is single-line `text-overflow: ellipsis`; description remains natural 14px pre-wrap text hard-clipped by a 72px overflow-hidden slot, including long-title and empty-description cases. Slide changes are instant with no animation, so no reduced-motion branch is needed.
- Current details inventory is title, description, creation date, and obsolete title-action spacer only. Title/description/date are kept in the 122px Figma layout; the spacer is intentionally removed because kebab moves to media. No status/generation metadata is dropped.
- Thumbnail rendering remains native `<img alt="" loading="lazy" decoding="async" fetchPriority="low">`, centered with `object-contain`; inactive slides remain mounted and hidden.

## Rollback Or Recovery

Revert the preview-array helper/page props, carousel controls/swipe code, and Figma layout changes. Restore scalar Version A rendering. No migration, cache purge, generated asset deletion, project mutation, or data cleanup is needed.

## Open Decisions

None.

## Critique

### Software Architect

- Sibling overlay controls preserve the full-card link without invalid nested interactions. Carousel state must remain per card; global state would create needless fan-out.

### Product Manager

- Showing all three generated directions increases value discovery. No autoplay: it would compete with scanning a project grid and waste image requests.

### Customer Or End User

- Desktop gets discoverable controls on intent; touch gets a persistent project menu and familiar swipe. Dots show position without adding tiny tap targets.

### Engineering Implementer

- Exact Figma heights replace old 160.6px details assumptions. Existing tests must be rewritten, not loosened, so geometry regressions remain visible.

### Risk, Security, Or Operations

- Retain owner-scoped proxy URLs and strict Storage path checks for every option. Never send raw image URLs/storage paths to analytics. No database, authorization, billing, or external AI path changes.

## Cross-Model Plan Evaluation

- Reviewer: local Claude Code, Opus 5 through the `opus` alias, medium effort, tools disabled. First sandboxed attempt hit DNS; approved network retry completed.
- Accepted: keep touch arrows visually absent but add screen-reader-only coarse controls and `aria-live`; key carousel reconciliation by stable preview signature; self-check coarse-pointer emulation; assert dot count against valid preview count; require an existing three-option project before real Chrome evidence; pin centered `object-contain`; specify first-valid duplicate precedence.
- Accepted from round two: make kebab unconditional across empty/error states; move dots outside the link and make them real direct-navigation buttons; use one arrow control set with capability-specific visual treatment; name CDP touch dispatch; document dashboard no-polling/zero-to-N behavior; grade existing-data evidence; observe requests when cache permits; wait for fonts and use geometry tolerances; keep the live region empty until explicit navigation.
- Remediated after real CDP verification: removed the extra post-swipe click guard. Chromium already suppresses click after a qualifying swipe; the application guard incorrectly swallowed the next genuine tap.
- Accepted from round three: document deterministic proxy URL construction behind the stable signature; audit scalar helper callers; keep one roving dot tab stop and pointer-only visible arrows; use `any-hover` for hybrid devices; make dots visible at rest; require cache-disabled request observation; pin single-line title ellipsis and instant slide changes; clear visited/failed/gesture state on real preview changes and `touchcancel`.
- Accepted from round four: move geometry red state to Playwright; self-check the exact no-hover media query; keep coarse semantic arrows clipped and activatable rather than pointer-disabled; make overlay wrappers pointer-transparent; keep both arrow nodes mounted with unavailable-state semantics; inventory every details child; scope swipe to media; pin native lazy image attributes; include project name in all control labels and explicit live text.
- Rejected with source evidence: canonical rows are not routinely partial during current generation. `mockup_option_drafts` stores sequential A/B/C progress; `/api/mockups/finalize` requires all three labels before inserting the canonical `mockups` row. Historical partial canonical rows remain a compatibility case, not a polling requirement.
- Clarified after round two: `/api/mockups/generate-option` writes only `mockup_option_drafts`; current finalize requires all three before canonical insertion. The legacy owner-scoped `PATCH /api/mockups/[id]` can replace content, so partial canonical rows remain supported without being treated as current generation progress.
- Rejected as not introduced: malformed-newest-row no-fallback behavior already exists in `deriveDashboardMockupThumbnailUrls`; this change pins it with tests rather than silently changing project version semantics.
- Rejected as boundary-appropriate defense in depth: the server page filters rows to its already-owned project id set and validates project-scoped paths before constructing props; `/api/mockups/image` independently authenticates, owner-scopes, and confirms the path is present in saved content. These checks intentionally protect different boundaries.
- Rejected with repository search: `/projects` has no card loading skeleton or `loading.tsx`; there is no stale skeleton geometry to update or roll back.
- Rejected as existing behavior outside scope: one-slide proxy failures remain failed until reload, matching the current scalar thumbnail. Other valid slides remain navigable; adding authenticated retry UI would widen this Figma layout task.
- Rejected to match Figma: no persistent kebab scrim is added; node `461:15450` is a bare 6×14 vertical glyph over the padded image. Hover/focus treatment may add a transient background, but touch rest state follows the design.

## Product Analytics Decision

- Outcome supported: users can inspect all generated mockup directions from the project dashboard before entering a workspace.
- No new event. No named funnel, cohort, or product decision consumes dashboard carousel navigation, and generic clicks/swipes would not prove mockup value. Existing workspace `mockup_concept_*` events remain the semantic outcome measures. Project names, image URLs, Storage paths, labels beyond controlled A/B/C, and authored content remain prohibited.

## Execution Notes

- Completed 2026-08-12 on the existing branch without a database, API persistence, dependency, or analytics-contract change; backend change history was not required.
- Red evidence: the updated details test initially failed against the old 160.6px layout. Green evidence: 748/748 Node tests, TypeScript, targeted ESLint, and `git diff --check` passed.
- Browser evidence: full free Playwright smoke passed 6/6 with the paid intake test skipped by design. Final focused desktop/touch carousel run passed 2/2, including exact geometry, 12px visual dot centers with 24px targets, hover/mouse-leave behavior, A/B/C navigation, keyboard roving focus, coarse media query, real CDP horizontal/vertical/details gestures, next-tap navigation, and Rename/Delete preservation.
- Real Chrome verified authenticated `/projects` at 1600×1000: 500px card, 378px media, approximately 336px canvas, 122px details, controls hidden at rest, hover-only available arrows/kebab, and A→B→C navigation. Static and interaction screenshots are in `ui-evidence/2026-08-12/project-card-carousel-redesign/`.
- Two fresh-eyes reviews were remediated: invisible pointer interception, duplicate-URL slide identity, active-image failure keys, full-media swipe scope, touch arrow clipping, post-swipe next-tap swallowing, dot group semantics/target size/visual spacing, generic `.group` leakage, and pointer-focus persistence.

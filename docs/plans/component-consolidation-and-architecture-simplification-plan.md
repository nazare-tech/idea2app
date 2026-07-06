# Component Consolidation and Architecture Simplification

```yaml
implemented: true
implemented_at: 2026-07-05
implementation_summary: >
  All eight phases landed. Deleted dead code (ui/tabs.tsx, four unused document
  PATCH routes, gap-analysis/general-chat OpenRouter plumbing incl. lib/openrouter.ts,
  prompts/legacy-fallback.ts, prompts/general-chat.ts, unused credit helpers and the
  CREDIT_COSTS alias). Unified all overlays on ArtifactLightbox (Mermaid expansion
  migrated; mockup lightbox had already been migrated by the parallel AI-prompts work).
  competitive-analysis-document.tsx now uses the shared planning-blocks kit and
  planning-document-parser helpers; duplicate getStatValue removed. HeaderBrand folded
  into brand-wordmark.tsx and ProjectHeader rebuilt on Header's slots. Legacy structured
  render paths removed from both plan renderers; lib/prd-document.ts and
  lib/mvp-plan-document.ts deleted with their tests (legacy docs now fall back to
  markdown with a notice). The four twin request/config files merged into
  lib/planning-document-requests.ts. lib/ grouped into intake/, mockups/, generation/,
  stripe/, prompt-lab/ folders. Also fixed the package.json test globs (unquoted **
  was silently skipping nested tests); the full suite now runs 392 tests, 391 pass —
  the one failure is a pre-existing competitive comparison-table test broken at HEAD
  by the positioning-map redesign (flagged as a separate task). Production build passes.


## Goal

Remove confirmed dead code, collapse duplicate component implementations onto existing shared modules, and simplify the document-rendering and lib architecture, without changing user-visible behavior for current-contract documents.

Scope agreed with the user on 2026-07-05 (all items from the repo audit):

1. Delete dead code: `ui/tabs.tsx`, the four unused document PATCH routes, the gap-analysis/general-chat OpenRouter plumbing.
2. One lightbox implementation: `ArtifactLightbox` becomes the single overlay shell; `mockup-renderer`'s hand-rolled lightbox and `markdown-renderer`'s Mermaid expansion modal migrate onto it.
3. `competitive-analysis-document.tsx` uses `planning-blocks-shared` + `planning-document-parser` instead of private copies (`PencilCard`, `ParagraphStack`, `DataTable`, heading helpers).
4. Remove the duplicated `getStatValue` in `product-plan-blocks.tsx`.
5. Header consolidation: fold `HeaderBrand` into `brand-wordmark.tsx`; rebuild `ProjectHeader` on `Header`'s existing `pageTitle`/`children` slots.
6. Remove the legacy structured render path from `PrdDocumentBlocks`/`MvpPlanDocumentBlocks`; delete `lib/prd-document.ts` and `lib/mvp-plan-document.ts` (legacy docs fall back to markdown).
7. Merge the twin prompt-request builders + 3-line config files into one parameterized module.
8. Group flat `src/lib/` files into domain subfolders (intake, mockups, generation, stripe, prompt-lab).
9. Naming cleanup (`CREDIT_COSTS` vs `BASE_ACTION_TOKENS`) and PROJECT_CONTEXT.md corrections.

## Assumptions

- The working tree already contains in-flight (uncommitted) AI-prompts work; this refactor layers on top of it. No commits unless the user asks.
- No client code calls `/api/analyses/[id]`, `/api/prds/[id]`, `/api/mvp-plans/[id]`, `/api/tech-specs/[id]` (verified by repo-wide grep). Deleting them removes an API capability that has no consumer; git history is the recovery path.
- `chatCompletion()` and `buildGeneralChatSystemPrompt()` have zero callers. `callOpenRouterFallback()`/`LEGACY_ANALYSIS_PROMPTS` are reachable only via `type === "gap-analysis"` in `/api/analysis/[type]`, which no UI triggers (gap analysis is a section of the competitive-analysis document, not a standalone generation).
- Legacy (pre-current-contract) Product Plans / First Version Plans are acceptable to render as raw markdown. PROJECT_CONTEXT already documents markdown fallback as the legacy story; the intermediate "legacy structured block layout" is the only thing removed.
- The `market-research-gap-analysis` section anchor inside the competitive-analysis document is unrelated to the `gap-analysis` generation type and stays.

## Clarifying Questions

**Q1: Should the Mermaid expansion modal also move to `ArtifactLightbox`?**
- A (recommended): Yes, one overlay shell everywhere; Mermaid passes a wide `maxWidthClassName` and no copy/download actions. Trade-off: the expanded diagram chrome changes slightly (white panel header bar instead of borderless dark overlay).
- B: Keep Mermaid's bespoke modal since its sizing needs differ.
- **Selected: A** (user: "the mermaid modal should also be merged... Just use one.")

**Q2: Delete `prd-document.ts`/`mvp-plan-document.ts` or keep them with shared helpers?**
- A (recommended): Delete both along with the legacy structured layouts; gate becomes `isCurrentPromptDocument()` → blocks, else markdown fallback.
- B: Keep them and only extract the duplicated helpers.
- **Selected: A** (user: "If we can delete these files, let's delete them.")

**Q3: Scope of lib/ foldering?**
- A (recommended): Only unambiguous prefix clusters (`intake-*`, `mockup-*` + image-mockup pipeline/format, `generation-queue-*`/`generate-all-helpers`/`onboarding-generation`/`queue-run-id`, `stripe-*`, `prompt-lab-*`). Leave everything else flat.
- B: Full re-org of all ~70 files.
- **Selected: A** — mechanical, low judgment, keeps the diff reviewable.

## Architecture Improvement Opportunities

Covered by the plan itself (this plan is the architecture-improvement pass). Deferred beyond scope: splitting `AiPromptsDocumentBlocks` out of `first-version-plan-blocks.tsx` (splitting, not consolidation); auth page scaffolding unification for forgot/reset password (small, cosmetic).

## Plan (phases)

Each phase ends with `npm run typecheck && npm test`; lint and build at the end.

**Phase 1 — Dead code deletion (lowest risk):**
- Delete `src/components/ui/tabs.tsx`; drop `@radix-ui/react-tabs` from package.json if nothing else imports it.
- Delete `src/app/api/analyses/[id]/route.ts`, `src/app/api/prds/[id]/route.ts`, `src/app/api/mvp-plans/[id]/route.ts`, `src/app/api/tech-specs/[id]/route.ts`.
- Remove the `gap-analysis` fallback branch from `/api/analysis/[type]/route.ts`; delete `lib/openrouter.ts`, `lib/prompts/legacy-fallback.ts`, `lib/prompts/general-chat.ts`; update `lib/prompts/index.ts`; remove `gap-analysis` from `AnalysisType` (utils) and token-economics entries if type-safe.

**Phase 2 — Lightbox unification:**
- Generalize `ArtifactLightbox` (`fileName` → `title`, optional icon) as needed.
- `mockup-renderer.tsx`: replace inline lightbox + its escape/scroll-lock effects with `ArtifactLightbox`.
- `markdown-renderer.tsx`: replace the Mermaid expansion modal with `ArtifactLightbox` (wide panel, no copy/download).
- Update `ai-prompt-files.tsx` call sites for any prop rename.

**Phase 3 — Competitive analysis onto shared kit:**
- Extend shared `PencilCard` with `description`, `showHeader`, `showTitle`.
- In `competitive-analysis-document.tsx`: delete private `PencilCard`, `ParagraphStack`, `DataTable`, `normalizeMarkdownHeading`, `extractH2Sections`; import shared equivalents and `normalizeHeading`/`extractSectionsByHeading` from the parser. Diff local vs shared implementations first; port any real differences into the shared version.
- Delete the local `getStatValue` in `product-plan-blocks.tsx`; import the shared one.

**Phase 4 — Header consolidation:**
- Move `HeaderBrand` into `brand-wordmark.tsx` (same export name), delete `header-brand.tsx`, update importers.
- Rebuild `ProjectHeader` on `<Header>` slots: brand-with-custom-onClick via `children`, editable project name widget via `pageTitle`. Verify visually.

**Phase 5 — Legacy render path removal:**
- `PrdDocumentBlocks`: current-contract → `CurrentPrdDocumentBlocks`, else markdown fallback (keep a soft warning only if content clearly isn't current). Delete the legacy structured JSX and `lib/prd-document.ts`.
- Same for `MvpPlanDocumentBlocks` and `lib/mvp-plan-document.ts`.
- Update/remove tests that exercised the legacy structured layout; keep markdown-fallback tests.

**Phase 6 — Prompt-request merge:**
- New `lib/planning-document-request.ts` (or equivalent) exporting the existing names (`buildProductPlanPromptRequest`, `buildFirstVersionPlanPromptRequest`, constants); delete the four twin files; update importers (pipelines, prompt-lab).

**Phase 7 — lib/ foldering (mechanical, last):**
- `lib/intake/`, `lib/mockups/`, `lib/generation/`, `lib/stripe/`, `lib/prompt-lab/` per Q3-A; `git mv` + repo-wide import updates (including tests and scripts).

**Phase 8 — Naming + docs:**
- Standardize on one token-cost export name; fix stale PROJECT_CONTEXT claims (stacked-tab-nav sharing, PATCH routes, openrouter.ts, directory map, prompt file map); document all changes in PROJECT_CONTEXT.md.

## Milestones

1. Phases 1–2 green (dead code gone, one lightbox).
2. Phases 3–4 green (shared kit adopted, one header bar), visual check.
3. Phases 5–6 green (one render path per document, one request builder).
4. Phases 7–8 green, full build + lint pass, PROJECT_CONTEXT updated.

## Validation

- `npm run typecheck`, `npm test`, `npm run lint` per phase; `npm run build` at the end.
- Browser verification via dev preview pages: `/dev/prd-render-preview` (block rendering + Mermaid), `/dev/mockup-renderer-preview` (lightbox), landing page + a dashboard page for header/brand rendering.

## Risks

- **Legacy documents in production** silently downgrade from structured blocks to markdown. Accepted by user; markdown fallback path is already tested.
- **Mockup lightbox / Mermaid modal chrome changes** slightly (shared panel header). Accepted per Q1-A.
- **lib/ foldering churn** could conflict with the in-flight uncommitted work; mitigated by doing it last and running typecheck.
- **Header rebuild** may shift centering pixels (grid vs absolute). Verified visually.
- Tests currently passing against the legacy layout must be re-pointed, not silently deleted, where the fixture is actually current-contract.

## Rollback

No commits are made; `git checkout -- <path>` / `git clean` restores any file. Deleted files are all tracked in git history at HEAD except the new shared modules, which are additive.

## Open Decisions

- Exact folder names for lib clusters (`generation/` vs `generate-all/`); decided during Phase 7 by whichever reads best in imports.

## Critique (five perspectives)

- **Product**: No feature changes; only legacy-document rendering degrades, and those users can regenerate. Good trade.
- **Design**: One lightbox and one header bar improve consistency; the Mermaid modal loses its bespoke full-bleed dark chrome — acceptable, and the shared shell is the documented design direction.
- **Engineering**: Deleting ~1,200+ lines of unreachable/duplicate code reduces drift risk; the main hazard is the big-bang lib move, contained by doing it last and mechanically.
- **QA**: Existing test suites cover the current layouts and markdown fallback; legacy-layout tests are removed together with the code they test, and typecheck catches import breaks.
- **Security**: Removing unused PATCH routes and the unused chat/gap-analysis AI paths shrinks attack surface; no new inputs or endpoints are introduced.

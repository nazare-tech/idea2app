---
implemented: true
implemented_at: 2026-07-11T00:40:00Z
summary: >
  ArtifactLightbox gained a displayName prop (prompt files show sentence-case
  names, mockups show "Concept N: Title"); the MVP plan prompt and landing
  sample content now recommend Cloudflare Workers + D1 + R2 + better-auth
  instead of Vercel + Supabase (with an explicit Postgres fallback rule);
  the composer shows two doc-level suggestion chips per document, lost the
  scope toggle (always whole-project context, prompt notes the doc in view),
  collapses on outside click when empty, and drops the redundant scratch-
  session sentence. Verified via 467 unit tests and a Playwright real-UI run
  (13/13 checks) with screenshots in
  ui-evidence/2026-07-10/lightbox-composer-cloudflare/.
---

# Lightbox names, Cloudflare-first stack recommendation, composer cleanup

Date: 2026-07-10
Requested by: Mukul (chat)

## Goal

Four user-visible fixes on the project workspace plus one prompt-layer change:

1. **Lightbox names**: file and mockup names shown in the artifact lightbox header are raw kebab-case file names (`first-prompt.md`, `signal-mockup-option-a.png`). Show clean sentence-case display names instead. Download file names stay kebab-case.
2. **Cloudflare-first stack recommendation**: `first-prompt.md` (and the First Version Plan it derives from) recommends Vercel + Supabase. Switch the default recommendation for initial builders to Cloudflare (Workers + D1 + R2), find every other surface showing the old recommendation, and replace recommendations that don't work on Cloudflare with alternatives.
3. **Composer suggestion chips**: three chips exist today and follow the active doc naively ("Summarize Design Mockups" is nonsense; "Explain a decision" sends an unhelpful canned prompt). Replace with two realistic, whole-doc-level chips per document.
4. **Composer scope chip**: remove the "Product Plan / Whole project" context toggle from the input row. Always send whole-project context; the model picks the relevant parts. Keep telling the model which document the user is viewing.
5. **Composer polish**: click outside collapses the composer when the input is empty (stays open when it has text); drop the redundant "This is a scratch session…" sentence from the empty-state intro (the footer already says it).

## Why Vercel + Supabase is recommended today (answer to user's question)

`src/lib/prompts/mvp-plan.ts` hard-codes product-type stack defaults (Step 1 table) as Next.js + Supabase, and the "Next Prompt for AI Coding Tool" section (which becomes `first-prompt.md`) copies the §6 stack table into the prompt. Vercel is implied as the default Next.js deploy target and appears in the v0 tool-selection rule. Rationale at the time: it is the most-documented golden path for AI codegen tools (models hallucinate least on it), and Supabase bundles Postgres + auth + storage in one free tier. Trade-offs of moving to Cloudflare: cheaper and faster at the edge, generous free tier, D1/R2/Workers are one platform; but no managed Postgres/RLS or bundled auth, so auth and data isolation need explicit choices (better-auth, API-layer org scoping).

## Recommendation A/B choices

- **Q1: What replaces Supabase auth/RLS on Cloudflare?**
  - **A (selected)**: better-auth (open source, runs on Workers with D1) as default auth; data isolation enforced in the Workers API layer. Note in prompt that products genuinely needing Postgres features (realtime, pgvector at scale) may keep Supabase for that layer with a one-line reason.
  - B: Clerk (managed) — simpler but adds a paid vendor; rejected as default, model may still pick it when user asks for managed auth.
- **Q2: Composer context selection ("intelligently send only right parts")?**
  - **A (selected)**: always send all three saved docs (existing project-scope path, already capped at 24k chars/doc) and tell the model which doc the user is viewing. The model does the selection. No new routing layer.
  - B: keyword/embedding-based doc routing — over-engineering for three docs.
- **Q3: Lightbox naming mechanism?**
  - **A (selected)**: add optional `displayName` prop to `ArtifactLightbox`; header/copy/download labels use it when present. Prompt files derive it from the file name (hyphens → spaces, sentence case, `ai` → `AI`); mockups pass `Concept N: {title}`.
  - B: auto-humanize inside the lightbox — hides intent, breaks cases where kebab is wanted.
- **Q4: Update landing-page sample content (`landing-sample-content.ts`) to Cloudflare?**
  - **A (selected)**: yes, it is a visible recommendation surface (sample MVP plan shows Supabase/Vercel ~25 times). Rewrite stack mentions to the Cloudflare equivalents.
  - B: leave sample as-is — inconsistent with the new recommendation.

## Implementation phases

1. `ArtifactLightbox` `displayName` prop + tests; wire `ai-prompt-files.tsx` (humanize helper) and `mockup-renderer.tsx` (`Concept N: title`).
2. `mvp-plan.ts` system prompt: Cloudflare-first Step 1 table, platform-default paragraph in §6, tactical shortcuts and v0 rule updates, Next Prompt template deployment line.
3. `landing-sample-content.ts`: swap Supabase/Vercel mentions in sample PRD/MVP strings for Cloudflare equivalents (D1, R2, Workers, better-auth, API-layer isolation).
4. Composer client (`project-composer.tsx`): 2 chips per doc from a per-docKey map, remove scope toggle + per-message scope label, always send `scope: "project"`, click-outside collapse when input empty and not streaming, trim empty-state copy.
5. Composer server (`composer/route.ts` + `project-composer.ts` prompt): scope label notes the currently viewed document.
6. Verify: unit tests, lint, build; real-UI check of composer + lightbox with dev server, screenshots under `ui-evidence/2026-07-10/lightbox-composer-cloudflare/`.

## Architecture improvement opportunities

- **Central chip config** (selected): suggestion chips as data (per-docKey map) instead of inline JSX, easier to iterate copy.
- **displayName on ArtifactLightbox** (selected): reusable for any future artifact type.
- **Doc-routing service for composer** (rejected, over-engineering): three docs fit the context budget.
- **Prompt/stack contract test** (deferred): a test asserting the mvp-plan prompt no longer mentions Supabase/Vercel defaults would prevent regressions; lightweight, added if time allows.

## Test strategy

- `node --test` suites: artifact-lightbox, mockup-renderer, first-version-plan-blocks (fixture untouched).
- Grep-verify no remaining default-stack Supabase/Vercel mentions in `src/lib/prompts/` and `landing-sample-content.ts`.
- Real UI: composer chips per doc, collapse-on-outside-click, empty-state copy, lightbox display names (prompt file + mockup).

## Rollback

Pure code/prompt changes, no schema or data migration. Revert the commit. Existing saved documents keep old stack text until regenerated (acceptable; noted to user).

## Critique

- **Product**: chips copy must read like things a founder would actually click; avoid robotic phrasing. Two chips reduce clutter, matches "bias to the next action".
- **Architecture**: no backend contract changes (API still accepts scope/docKey), so old clients keep working.
- **Customer**: existing projects' generated docs still say Supabase/Vercel; only new generations change. Landing sample changes immediately.
- **Engineering**: landing-sample-content is one giant JSON string; edits must keep JSON escaping valid — run build/tests after.
- **Risk/security**: none new; composer still enforces auth, ownership, rate limits, paid plan. Removing scope toggle sends slightly more context per question (already the project-scope path, capped).

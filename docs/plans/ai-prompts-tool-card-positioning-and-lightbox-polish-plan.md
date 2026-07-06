---
implemented: true
implemented_at: 2026-07-05T18:57:39-07:00
implementation_summary: Fixed Recommended Tool card field parsing (colon inside or outside bold) with a lead-paragraph card layout, replaced the Positioning Map scatter plot with per-competitor score-bar profiles, unified both lightboxes on a shared ArtifactLightbox shell with copy/download actions (image copy as PNG for mockups), fixed code-block contrast with a solid dark background, and made mockup storagePath optional for display so sample/legacy rows render. Review artifact: ai-prompts-tool-card-positioning-and-lightbox-polish-review.md.
---

# Plan: Recommended Tool Card Fix, Positioning Map Replacement, And Lightbox Polish

## Goal

Fix the Recommended AI Build Tool card so it renders structured fields instead of dumping raw markdown, replace the hard-to-read Positioning Map scatter plot with a legible representation, unify the design mockup concept lightbox with the markdown file lightbox (including copy and download actions), and fix the code-block contrast bug that makes lightbox text nearly invisible.

## Assumptions

- The Recommended Tool card renders badly because generated documents write `- **Why this tool:** ...` (colon inside the bold) while the parser expects `- **Why this tool**: ...` (colon outside), so field extraction fails and the whole section falls back into one "Why" cell, including the `### Cursor` heading. Verified in the browser and in `landing-sample-content.ts`.
- The Positioning Map scatter plot is unreadable: overlapping competitor labels, cryptic stacked `LOW Y 0/10 LOW X` corner text, and meaningless `Low X / High X` endpoints when axis descriptions are missing. Verified via screenshot. The underlying data (per-competitor 0-10 X/Y scores, axis descriptions, rationale, evidence) is sound.
- The unreadable lightbox text comes from `LazySyntaxHighlighter`: the `vscDarkPlus` theme (light `#d4d4d4` text) is rendered over `background: rgba(255,255,255,0.05)`, effectively white-on-white. Verified with computed styles (`color: rgb(212,212,212)`, parent bg `rgba(255,255,255,0.05)`).
- The markdown file lightbox correctly shows rendered markdown (headings, lists, tables, code); the "showing UI" impression came from the invisible code block text, so no renderer swap is needed there.
- The landing mockups preview renders raw JSON because `parseOpenRouterImageMockupOption` requires `storagePath`, which the exported landing samples lack; display only needs `imageUrl`, and workspace flows already defensively check `storagePath` themselves.

## Clarifying Questions

1. What should replace the Positioning Map scatter plot?
   - Recommendation A: Per-competitor positioning profiles: each competitor gets two labeled horizontal 0-10 score bars (one per axis, using the axis descriptions as labels) plus the rationale and evidence text, with the user's own product highlighted in Action Red.
   - Trade-off: Linear and instantly readable with exact scores and no overlap; loses the at-a-glance 2D "whitespace" view.
   - Recommendation B: A 2x2 quadrant summary grid with plain-language quadrant names derived from axis endpoints, listing competitors per quadrant and marking empty quadrants as open space.
   - Trade-off: Preserves the strategic quadrant story; depends on axis endpoint text parsing well and hides exact scores, risking a second hard-to-decode artifact.
   - Selected: Recommendation A, because the user's complaint is legibility and score bars cannot collide or mislabel.
2. How should the code-block contrast be fixed?
   - Recommendation A: Keep the `vscDarkPlus` highlight theme but give it a solid dark background (`#1C1917`, matching the brand terminal idiom) and give the loading/fallback `pre` explicit light text.
   - Trade-off: One-line fix consistent with the previous dark prompt block; code blocks stay dark inside light documents.
   - Recommendation B: Switch to a light highlighter theme (e.g. `oneLight`) on a warm light background.
   - Trade-off: Blends with the light document, but changes code aesthetics app-wide and needs re-verification everywhere code renders.
   - Selected: Recommendation A, smaller and matches the existing dark-terminal design language for prompts.
3. What should Copy do in the mockup concept lightbox?
   - Recommendation A: Copy the image itself to the clipboard as PNG (canvas conversion when the stored image is JPEG).
   - Trade-off: Matches user expectation of "copy the mockup" for pasting into docs/chats; needs clipboard image permissions and a canvas fallback path.
   - Recommendation B: Copy the image URL as text.
   - Trade-off: Trivial to build but the proxied URL is auth-gated and useless outside the app.
   - Selected: Recommendation A, with silent failure tolerated because Download remains as fallback.
4. How should the landing mockups sample (raw JSON) be fixed?
   - Recommendation A: Make `storagePath` optional (default `""`) in the client-safe mockup option parser, since display only needs `imageUrl` and workspace flows re-check `storagePath` themselves.
   - Trade-off: One-line contract relaxation; recovery flows keep their own validation.
   - Recommendation B: Regenerate the landing sample export to include `storagePath` values.
   - Trade-off: Keeps the strict contract but requires re-running the export script against a real project and does not protect other legacy rows.
   - Selected: Recommendation A; B is deferred as an optional cleanup.

## Recommended First Step

Extract a shared lightbox shell component and re-point the markdown file lightbox at it; this validates the shell before the mockup viewer adopts it.

## Architecture Improvement Opportunities

- Shared `ArtifactLightbox` component (`src/components/ui/artifact-lightbox.tsx`): one overlay/panel/header-actions shell for markdown files and mockup concepts. Benefit: single place for Escape/scroll-lock/click-outside and action buttons. Trade-off: small indirection. Selected.
- Parser/prompt contract alignment for tool fields: accept both `**Label:**` and `**Label**:` and strip the `###` tool heading from fallback text in `getRecommendedTool`. Benefit: survives model formatting drift. Trade-off: slightly looser regex. Selected.
- Relax `storagePath` in `parseOpenRouterImageMockupOption` (display contract) while workspace flows keep their own strict checks. Benefit: legacy/sample rows render instead of dumping JSON. Trade-off: weaker parse-time guarantee. Selected.
- Regenerate landing sample content with `storagePath` via `scripts/export-landing-sample.mjs`. Deferred: not needed once the parser is tolerant.
- Making landing previews interactive (removing `inert`). Rejected: they are intentionally screenshot-only embeds.

## Plan

1. Create `ArtifactLightbox` shared component (header bar: icon + file name, copy/download/close actions with copied-state; body slot; Escape/click-outside/scroll lock). Refactor `ai-prompt-files.tsx` to use it. Validation: existing AI Prompts tests still pass; lightbox opens in browser.
2. Fix `getRecommendedTool` field regex to tolerate colon placement, strip the leading `### [Tool]` heading from fallback text, and restructure the card: "Why this tool" as full-width lead paragraph, remaining details in the grid. Validation: new test case with colon-inside-bold fixture; browser screenshot shows clean card.
3. Replace the `PositioningMap` scatter plot with per-competitor score-bar profiles (axis definition cards kept, two labeled 0-10 bars per competitor, rationale + evidence, own-product highlighted, unscored block kept). Remove the plot-percent helpers if unused. Validation: update the positioning test; screenshot readable at preview width.
4. Fix code-block contrast in `markdown-renderer.tsx`: solid `#1C1917` background in `LazySyntaxHighlighter` customStyle and explicit light text (`#D9D3CE`) on the loading/fallback pre. Validation: computed color check in the lightbox shows light text on dark block.
5. Redesign the mockup concept lightbox in `mockup-renderer.tsx` using `ArtifactLightbox`: file-name header (e.g. `concept-1.png`), copy-image and download actions, image body. Make `storagePath` optional in `openrouter-image-mockup-format.ts` so sample/legacy rows render. Validation: landing mockups preview renders the viewer instead of raw JSON; lightbox opens with actions in browser.
6. Run tests, typecheck, lint; capture browser screenshots for the tool card, positioning section, file lightbox, and concept lightbox; run Fresh-Eyes Self Review; update this plan's metadata.

## Milestones

- Shared lightbox adopted by markdown files: AI Prompts tests green, lightbox verified in browser.
- Tool card renders structured fields for both bold-colon variants: test green, screenshot clean.
- Positioning section readable without a scatter plot: test green, screenshot clean.
- Code blocks readable in lightboxes and documents: computed-style check passes.
- Concept lightbox matches file lightbox with working actions: browser verified.

## Validation

- `npm test`, `npm run typecheck` (ignoring pre-existing stale `.next` errors), targeted `eslint`.
- Browser verification on `/landing-preview/ai-prompts`, `/landing-preview/market-research?crop=market-research-positioning`, `/landing-preview/mockups` with screenshots; interactive lightbox checks via temporarily lifting the preview's `inert` attribute (inspection-only DOM change).

## Risks And Mitigations

- Looser field regex could match unexpected lines: anchor to list-item + bold-label shape and keep label allowlist.
- Clipboard image copy unsupported in some browsers: silent catch; Download remains.
- Removing the scatter plot changes a tested contract: update `competitive-analysis-document.test.tsx` assertions in the same change.
- Relaxed `storagePath` could hide bad workspace rows: workspace retry/recovery flows already validate `storagePath` independently.

## Rollback Or Recovery

Pure frontend revert of the touched components/tests; no data, API, prompt, or schema changes.

## Open Decisions

- None.

## Critique

### Software Architect
- The real defect is a prompt/parser contract drift (`**Label:**` vs `**Label**:`); the tolerant regex fixes the symptom broadly, but the long-term fix is a shared field-extraction helper used by any card that parses labeled bullets.

### Product Manager
- Score bars trade the "map" metaphor for certainty of comprehension; that matches the product's "show the work, don't sell it" principle better than a decorative chart founders skip.

### Customer Or End User
- The founder wants to know "where do I stand vs each competitor and why" — per-competitor bars with rationale answer that directly; the scatter plot required decoding.

### Engineering Implementer
- Touching `MarkdownRenderer`'s highlighter affects every document; the change is background/text color only, no structural churn, and dark-on-dark fallback text is also fixed.

### Risk, Security, Or Operations
- No new backend surface; clipboard and blob downloads are client-side; the auth-gated image proxy URL never leaves the app in the copy-image path.

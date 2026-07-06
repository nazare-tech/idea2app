# Review: Recommended Tool Card Fix, Positioning Map Replacement, And Lightbox Polish

## Scope

- `src/components/ui/artifact-lightbox.tsx` (new shared lightbox shell)
- `src/components/analysis/ai-prompt-files.tsx` (refactored onto the shared shell)
- `src/components/analysis/first-version-plan-blocks.tsx` (tool field parsing + card layout)
- `src/components/analysis/competitive-analysis-document.tsx` (positioning score bars replace scatter plot)
- `src/components/ui/markdown-renderer.tsx` (code block contrast)
- `src/components/ui/mockup-renderer.tsx` (concept lightbox on shared shell + image copy)
- `src/lib/openrouter-image-mockup-format.ts` (optional `storagePath`)
- Tests: `first-version-plan-blocks.test.tsx`, `competitive-analysis-document.test.tsx`

## Verification

- `npm test`: 362/362 pass.
- `tsc --noEmit`: clean. Targeted `eslint` on all touched files: clean.
- Browser (preview server, landing-preview routes with `inert` lifted for interaction, inspection-only):
  - `/landing-preview/ai-prompts`: Recommended Tool card renders name + link, "why" lead paragraph, and Best Fit / Cost / Watch Out / Handoff grid; no raw `### Cursor` markdown leaks. Screenshot captured.
  - File lightbox: rendered markdown with dark prompt block; computed styles `color: rgb(212,212,212)` on `background: rgb(28,25,23)` (was `rgba(255,255,255,0.05)`, effectively white-on-white). Screenshot captured.
  - `/landing-preview/market-research?crop=market-research-positioning`: per-competitor score-bar profiles with rationale/evidence; no scatter plot. Screenshot captured.
  - `/landing-preview/mockups`: storyboard viewer renders (previously raw JSON because sample rows lack `storagePath`). Concept lightbox verified structurally: `mockup-option-a.png` header, Copy/Download/Close buttons, visible image, white panel (screenshot tool kept catching post-reload state for this dialog, so DOM/a11y assertions were used as evidence).

## Fresh-Eyes Self Review

- Pass 1: Found that the prose wrapper's `[&_pre]`/`[&_pre_code]` utilities out-specify classes on the highlighter's loading fallback `pre`; switched the fallback to inline styles so the dark block cannot be overridden. Found the shared lightbox's `max-w-4xl` panel too narrow for 1568px-wide mockups; added a `maxWidthClassName` prop (`max-w-6xl` for mockups). Reran tests and browser checks.
- Pass 2: Re-read all diffs for regex safety (field labels contain no regex metacharacters), removed-icon imports (`X` no longer used in `mockup-renderer`), draft-option `contentType` fallback in the lightbox state, and stale references to the old lightbox markup (none found). No further issues.

## Code Review Findings

- Low: `ArtifactLightbox`'s Escape/scroll-lock effect re-registers on every render because `onClose` is an inline closure at call sites. Behavior is correct; wrap in `useCallback` at call sites only if it ever shows up in profiling. Not fixed (accepted).
- Low: `positioningBarLabel` falls back to generic "Positioning score 1/2" when the document has no axis descriptions (the sample document hits this). The data is genuinely absent; rationale text carries the meaning. Not fixed (accepted).

## Architecture Improvement Review

- Selected opportunities landed: shared `ArtifactLightbox`, tolerant bold-label field parsing, optional `storagePath` display contract.
- Deferred remains valid: regenerate `landing-sample-content.ts` with `storagePath`; a shared labeled-bullet field-extraction helper if a third card ever parses this shape.
- No new duplication or brittle contracts introduced; the two lightboxes now share one shell.

## Security Review Findings

- No new backend surface, routes, or data writes. Clipboard writes (markdown text, PNG image) and blob downloads are client-side. The image copy path fetches the same-origin auth-gated mockup proxy URL and never exposes it externally. Relaxing `storagePath` at parse time does not weaken storage access control: the image proxy route validates ownership and path server-side, and workspace retry/recovery flows keep their own `storagePath` checks. No findings.

## Remediation Checklist

- [x] Inline styles on highlighter fallback (found in Fresh-Eyes pass 1)
- [x] `maxWidthClassName` for wide mockup lightbox (found in Fresh-Eyes pass 1)

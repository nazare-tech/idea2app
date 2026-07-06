---
implemented: true
implemented_at: 2026-07-05T19:12:00-07:00
implementation_summary: Trimmed the AI Prompts nav to two subsections (Recommended Tool, Prompt Files) and made every prompt file lightbox render the raw file content in the dark monospace file view next-prompt.md uses, with no injected H1 and fence markers stripped from next-prompt.md so it is paste-ready.
---

# Plan: AI Prompts Nav Simplification And Uniform File View

## Goal

The AI Prompts nav should show exactly two subsections (Recommended Tool, Prompt Files), and every prompt file lightbox should render like next-prompt.md does: the file content as monospace text in a dark file block, with no injected section heading above it.

## Assumptions

- "A lot of subsections" refers to the left nav rail: `SCROLLABLE_NAV_ITEMS` still lists one entry per prompt file, so the nav shows Next Prompt, Build Sequence, Requirements, User Stories, Sub-Agents, and Project Context under AI Prompts.
- next-prompt.md renders "perfectly" because its body is one fenced code block, which displays as a dark monospace block; other files (tables, headings, lists) render as styled document UI instead, which is not what the user wants for a file preview.
- The injected `# <Title>` H1 at the top of each generated file is the "subsection" the user does not want to see in the lightbox.
- Copy/download should deliver exactly what the lightbox shows; for next-prompt.md, stripping the ```text fence markers makes the copied file directly paste-ready.

## Clarifying Questions

1. Should the lightbox render markdown or show the file as monospace source?
   - Recommendation A: Show every file's raw content in one dark monospace block (the exact treatment next-prompt.md gets today), no injected H1.
   - Trade-off: Uniform, file-like, matches the user's stated expectation; tables/headings appear as markdown source rather than styled UI.
   - Recommendation B: Keep rendered markdown and restyle tables/headings to look terminal-like.
   - Trade-off: Prettier structure but can never be "exactly like next-prompt.md" and reintroduces document-style UI the user rejected.
   - Selected: Recommendation A; the user explicitly asked for all files to render exactly like next-prompt.md.
2. Should per-file nav anchors be kept on the cards?
   - Recommendation A: Keep `id` attributes on cards (harmless, deep-linkable) but list only Recommended Tool and Prompt Files in `SCROLLABLE_NAV_ITEMS`.
   - Trade-off: Old deep links keep working; nav is clean.
   - Recommendation B: Remove card ids entirely.
   - Trade-off: Slightly less DOM, breaks existing anchors for no benefit.
   - Selected: Recommendation A.

## Recommended First Step

Trim the AI Prompts entry in `document-sections.ts` to two sections and update its test.

## Architecture Improvement Opportunities

- Strip fence markers from next-prompt.md at build time so the copied/downloaded file is directly paste-ready into an AI tool. Selected.
- Single `FileContentView` component for the lightbox body so the file treatment stays uniform. Selected.
- Rendered-markdown preview toggle in the lightbox. Rejected: speculative, contradicts the requested uniform file view.

## Plan

1. `document-sections.ts` + test: AI Prompts sections become `ai-prompts-recommended-build-tool` (Recommended Tool) and `ai-prompts-files` (Prompt Files).
2. `ai-prompt-files.tsx`: stop injecting `# <Title>` H1s into generated files; unwrap the ```text fence for next-prompt.md; replace the lightbox `MarkdownRenderer` body with a dark monospace `FileContentView`; drop the now-unused `projectId` plumbing.
3. Tests: update `first-version-plan-blocks.test.tsx` expectations; add direct `buildAiPromptFiles` assertions for fence stripping and no-H1 content.
4. Verify in browser (tool card page, file lightboxes), run tests/typecheck/lint, then commit all outstanding work in logical chunks and push.

## Milestones

- Nav shows exactly two AI Prompts subsections: test green, browser verified.
- Every file lightbox shows the dark monospace file view: browser verified for at least next-prompt.md and ai-friendly-build-sequence.md.
- All work committed in reviewable chunks and pushed to main.

## Validation

- `npm test`, `tsc --noEmit`, targeted eslint; browser screenshots of the lightboxes on `/landing-preview/ai-prompts`.

## Risks And Mitigations

- Raw markdown source may look dense for requirement files: acceptable per user's explicit instruction; copy/download stays true to what is shown.
- Removing H1s changes file contents users may have already downloaded: files are regenerated on every render, no persistence involved.

## Rollback Or Recovery

Frontend-only revert of `ai-prompt-files.tsx`, `document-sections.ts`, and tests.

## Open Decisions

- None.

## Critique

### Software Architect
- Rendering raw source removes the MarkdownRenderer dependency from the lightbox path entirely, shrinking the surface; the fence-unwrap is next-prompt-specific logic that should stay in the file builder, not the view.

### Product Manager
- "Files you hand to a tool" reading as files (not documents) is the more honest mental model and matches the copy/paste job to be done.

### Customer Or End User
- The user sees exactly what they will paste; no surprise formatting differences between preview and clipboard.

### Engineering Implementer
- Small diff: one view component swap, one builder tweak, nav array trim, test updates.

### Risk, Security, Or Operations
- No backend, data, or dependency changes.

---
implemented: true
implemented_at: 2026-07-05T18:28:19-07:00
implementation_summary: Rebuilt the AI Prompts workspace section around a numbered Recommended AI Build Tool section and a Prompt Files card grid with copy/download actions and a mockup-style markdown lightbox, added derived sub-agents.md and project-context.md files, gave Design Mockups a section masthead, and removed eyebrow kickers from all workspace document mastheads.
---

# AI Prompts File Cards And Section Headers Plan

## Goal

Make the AI Prompts section a handoff surface built around downloadable/copyable markdown files instead of long rendered documents, give the Recommended AI Build Tool its own subsection heading and data-driven card UI, add the missing Design Mockups section heading, and remove eyebrow kickers so every workspace document opens with just its title.

## Assumptions

- AI Prompts stays a derived section: no database table, generation queue item, credits, or new system prompt. All content is parsed at render time from saved Product Plan and First Version Plan markdown.
- Functional Requirements and User Stories & Acceptance Criteria continue to be generated during the Product Plan phase (`PRD_SYSTEM_PROMPT` sections 6 and 7). Verified; no backend move is needed.
- The mockup lightbox interaction (dark overlay, Escape/click-outside close, body scroll lock) is the pattern users already know and should be reused for markdown file previews.
- The Product Plan's `Team and Milestones → Agents` list is the source of truth for the recommended agent team, so a sub-agents prompt file can be derived client-side.

## Clarifying Questions

- Should the file lightbox show raw markdown or rendered markdown? Recommendation A: rendered via the existing `MarkdownRenderer`, since the raw text is always one Copy/Download away.
- Should `ai-build-guardrails.md` still appear? Recommendation A: yes, but only for legacy documents; the current First Version Plan prompt embeds its rules inside the Next Prompt and no longer emits a standalone guardrails section.

## Recommendation A/B Choices

- Recommendation A: Render prompt files as cards (filename + copy/download icons) that open a markdown lightbox, and assemble the two new files (`sub-agents.md`, `project-context.md`) client-side from existing plan sections. Selected because it needs no backend, consumes no credits, and matches the derived-section architecture.
- Recommendation B: Add a backend generation step (new system prompt / queue item) that produces the prompt files as stored artifacts. Rejected: contradicts the derived AI Prompts contract, adds cost and queue complexity, and the content is fully derivable from saved markdown.

## Selected Recommendation

Use Recommendation A.

## Implementation Phases

1. Create `src/components/analysis/ai-prompt-files.tsx`:
   - `AiPromptFile` contract plus `buildAiPromptFiles()` deriving `next-prompt.md`, `ai-build-guardrails.md` (legacy only), `ai-friendly-build-sequence.md`, `functional-requirements.md`, and `user-stories-and-acceptance-criteria.md` from plan sections.
   - `buildSubAgentsFile()`: one ready-to-paste prompt per agent role from the Product Plan `Team and Milestones → Agents` list.
   - `buildProjectContextFile()`: starter CLAUDE.md/AGENTS.md-style repo context file from MVP summary, target user, goal, build approach, and working rules.
   - `AiPromptFileGrid`: card grid with copy/download icon actions and a mockup-style lightbox (rendered markdown, same actions, Escape/click-outside/scroll lock).
   - `InlineMarkdown`: lightweight bold/italic/code/link renderer for small field values.
2. Rewrite `AiPromptsDocumentBlocks` in `first-version-plan-blocks.tsx`: numbered sections `01 Recommended AI Build Tool` and `02 Prompt Files`; delete the now-unused `FvpPromptBlock`, `FvpGuardrails`, `FvpBuildSequence`, and `getDesignBuildRows` renderers; render recommended-tool detail fields (Why / Best Fit / Cost / Watch Out / Handoff) with `InlineMarkdown` instead of stripped plain text.
3. Section header cleanup: add a title/description masthead to Design Mockups in `scrollable-content.tsx`; remove the "Planning Document" kicker from `FvpMasthead`, the "Product Plan" kicker from `ProductPlanMasthead`, and the eyebrow from the shared `PageHeader` (and its two legacy call sites).
4. Nav registry: add `ai-prompts-sub-agents` and `ai-prompts-project-context` entries to `SCROLLABLE_NAV_ITEMS` in `document-sections.ts`; file cards keep their existing `ai-prompts-*` anchors.
5. Update tests (`first-version-plan-blocks.test.tsx`, `document-sections.test.ts`) and `PROJECT_CONTEXT.md`.

## Test Strategy

- Full unit suite: 362/362 passing after the change, including the rewritten AI Prompts test that covers card anchors, filenames, copy/download/open aria-labels, sub-agents and project-context derivation, and inline-markdown rendering of tool fields.
- `tsc --noEmit`: clean except pre-existing stale `.next/types` references to removed routes.
- ESLint on all touched files: clean.
- Live verification against the running dev server (`/landing-preview/ai-prompts`, `/landing-preview/mockups`, `/landing-preview/prd`, `/landing-preview/mvp`): Prompt Files grid, copy/download buttons, Design Mockups masthead present; eyebrow kickers absent.

## Rollback Or Recovery Notes

Revert the component-level changes (`ai-prompt-files.tsx`, `first-version-plan-blocks.tsx`, `planning-blocks-shared.tsx`, `product-plan-blocks.tsx`, `scrollable-content.tsx`, `document-sections.ts`) and their tests. No migrations, persisted data, API routes, or prompts changed, so rollback is a pure frontend revert.

## Architecture Improvement Opportunities

- Selected: Centralize prompt-file derivation in one module (`ai-prompt-files.tsx`) so filenames, anchors, and content contracts live in a single place. Trade-off: the module depends on plan section heading aliases staying stable.
- Deferred: A `design-brief.md` file derived from the selected mockup's design rationale and platform, so the AI tool builds toward the chosen concept. Requires passing mockup content into the AI Prompts renderer.
- Deferred: A `validation-plan.md` file from the First Version Plan's Validation Plan section for test-plan handoff.
- Rejected: Backend-generated prompt-file artifacts (new system prompt or queue item). Contradicts the derived-section architecture and adds cost for content that is already in saved markdown.

## Candid Critique

- Architecture: Deriving files at render time keeps the zero-cost contract, but heading-alias drift in future prompt versions could silently drop a card; a contract test tying prompt output headings to file builders would harden this.
- Product: Files-with-actions matches how builders actually consume this content (paste into a tool), and the lightbox keeps inspection one click away instead of forcing a scroll through five long documents.
- Customer: Copy and download are the primary actions and are now visible on every card; the guardrails card quietly disappearing on new documents is intentional but could confuse users comparing old and new projects.
- Engineering: Net code deletion in the section renderers; the new module is self-contained and unit-tested. Clipboard writes fail silently in insecure contexts, with download as the fallback.
- Risk/Security: No new backend surface, storage, or secret handling; downloads are client-side blobs and the lightbox renders through the existing sanitized `MarkdownRenderer`.

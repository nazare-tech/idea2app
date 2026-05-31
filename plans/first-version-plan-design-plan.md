# Plan: First Version Plan Design Implementation

## Goal
Implement the right-panel document body from the requested `First Version Plan.html` design for the First Version Plan document in both the project workspace and Prompt Lab preview, while preserving markdown fallback behavior for malformed or legacy First Version Plan output.

## Assumptions
- The target implementation should live primarily in `src/components/analysis/planning-document-blocks.tsx` because both Projects and Prompt Lab already render First Version Plan output through `MvpPlanDocumentBlocks`.
- Parser changes, if needed, should stay in `src/lib/mvp-plan-document.ts` and remain backward-compatible with existing saved documents.
- The implementation should exclude the prototype's left sticky TOC/nav rail and shell chrome. Only the right panel/main document area maps to the app renderer.
- The refreshed design artifact was downloaded to `.tmp/anthropic-design-v2/` and includes `README.md`, chat transcripts, `project/First Version Plan.html`, `project/product-plan.css`, `project/colors_and_type.css`, and `project/first-version-plan.css`.
- The prior design URL returned `404 not found`; the new handle works and returns a gzip archive.

## Design Findings
- The handoff README says to read transcripts and follow imports. The relevant final transcript asks for the First Version Plan to match the Product Plan design system, then removes the Plan Snapshot section and keeps all Key Assumptions & Scope blocks white.
- The right panel uses a red top accent only in the standalone prototype shell, then a main document masthead with mono red kicker, large Hanken Grotesk title, supporting paragraph, and a bordered meta-stat row.
- The section model is 11 sections: MVP Summary, The Bet, Target User & Problem, Core User Flow, Key Assumptions & Scope, Suggested Stack, AI-Friendly Build Sequence, AI Build Guardrails, Validation Plan, Cut List, and Next Prompt.
- Reusable visual modules include two-column lucide icon cards, a vertical numbered flow stepper, white scope decision rows with mono tags, a 3-column suggested stack grid plus warm-paper shortcuts callout, numbered build sequence cards with goal/test metadata, checklist columns, signal-tier cards, stat tiles, cut-list if/then rows, and a dark terminal-style prompt block.
- The prototype uses Maker Compass tokens: Hanken Grotesk, Fira Mono, Cloud `#FAFAFA`, Card White `#FFFFFF`, Warm Paper `#F5F0EB`, Border Subtle `#EAE0D8`, Border Strong `#E8DDD5`, Workshop Black `#1C1917`, Action Red `#DC2626`.

## Clarifying Questions
1. None blocking. User clarified that only the right panel of the design should be implemented.

## Recommended First Step
Add renderer tests for the right-panel section structure, then implement the current First Version Plan renderer using the design modules above through the shared `MvpPlanDocumentBlocks` path.

## Plan
1. Fetch and inspect the design artifact.
   - Status: complete.
   - Read top-level README, project README, chat transcript findings, `First Version Plan.html`, `product-plan.css`, `colors_and_type.css`, and `first-version-plan.css`.
   - Validation: design findings recorded above.
2. Add focused tests for the intended right-panel First Version Plan structure.
   - Update `src/components/analysis/planning-document-blocks.test.tsx` for expected landmarks, section titles, visual class hooks, and Prompt Lab parity assumptions where testable.
   - Update `src/lib/mvp-plan-document.test.ts` only if parser coverage needs to expand.
   - Validation: updated renderer tests for the right-panel structure and design hooks.
3. Implement the renderer changes.
   - Prefer shared helper components inside `planning-document-blocks.tsx` unless the design introduces enough structure to justify a small extracted component.
   - Keep `MvpPlanDocumentBlocks` as the shared entry point so Projects and Prompt Lab stay in sync.
   - Preserve fallback markdown for unrecognized documents.
   - Validation: shared renderer now emits the right-panel First Version Plan layout.
4. Verify integration in both surfaces.
   - Run relevant unit tests.
   - Start the local dev server if needed.
   - Use the Codex in-app browser workflow for visual verification of Projects and Prompt Lab, using `.env.e2e.local` credentials if sign-in is required and never printing credential values.
   - Status: unit tests, typecheck, and targeted lint completed. Live browser verification was blocked because browser-use tools were unavailable in this session and `.env.e2e.local` was not present.
5. Review and remediate.
   - Write a review note covering code review and security review.
   - Fix any issues found.
   - Rerun relevant verification.
   - Status: complete.

## Milestones
- Design artifact recovered: README and HTML have been read and summarized. Complete.
- Test coverage added: complete.
- Shared renderer updated: Projects and Prompt Lab use the new right-panel design through the existing shared component. Complete.
- Verification complete: tests/typecheck/targeted lint complete; live browser visual verification blocked as noted above.

## Validation
- Focused Node/React rendering tests for `MvpPlanDocumentBlocks`.
- Parser tests if the design requires a new or stricter view model shape.
- Typecheck or lint if changes touch shared component signatures.
- Browser visual verification for the project workspace and Prompt Lab production preview.

## Risks And Mitigations
- External design URL is unavailable: ask for a refreshed link or attached bundle before attempting "exact" implementation.
- Static HTML may include one-off styles that clash with Maker Compass tokens: isolate document-specific styles through component-local class composition and preserve global tokens where possible.
- Saved legacy documents may not have the current prompt headings: retain the existing fallback path and direct-content fallback behavior.
- Prompt Lab can drift if it wraps the renderer differently: keep using `MvpPlanDocumentBlocks` as the shared implementation point.

## Rollback Or Recovery
- Revert changes to `planning-document-blocks.tsx`, `mvp-plan-document.ts`, and related tests.
- Because this is a pure rendering change, no data migration or database recovery should be needed.

## Open Decisions
- Exact static-prototype spacing was adapted to the existing workspace responsive constraints.
- Design-specific tokens are scoped to this document renderer through class composition instead of changing global Maker Compass tokens.

## Critique

### Software Architect
- The shared renderer entry point is the right boundary. Duplicating design code separately in Prompt Lab would create drift almost immediately.
- The main architectural risk is letting static HTML details leak into parser assumptions. Parser changes should be minimal and format-oriented, not design-oriented.

### Product Manager
- Exact parity matters because First Version Plan is a core handoff artifact for builders. The output should feel like a designed planning artifact, not generated markdown in a prettier box.
- The scope should stay on rendering the completed document, not changing generation prompts unless the design reveals missing required content.

### Customer Or End User
- The design needs to improve scanability: what to prove, what to build, what to cut, and what to ask the AI coding tool next should be obvious within seconds.
- If visual polish reduces readability for long generated content, users will feel the artifact got worse despite looking nicer.

### Engineering Implementer
- Start with tests around structure and durable labels, not brittle full HTML snapshots.
- Keep helper functions small. `planning-document-blocks.tsx` is already large, so any new complexity should either reuse current primitives or be extracted if it becomes substantial.

### Risk, Security, Or Operations
- This change should not introduce new data access, auth, or secret handling.
- Visual verification may require signing in; use `.env.e2e.local` credentials only in the browser flow and never log them.

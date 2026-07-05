# Review: AI Prompts Tool Recommendation

## Scope
- Updated the First Version Plan prompt to generate one `Recommended AI Build Tool` section from the active handoff tool set.
- Added the AI Prompts recommendation card above Next Prompt, using external-link styling consistent with competitor links.
- Raised active intake question generation and create-from-intake validation from 4-5 questions to 4-7 questions, with optional tool-fit questions.
- Narrowed the research database to the active handoff recommendation tools.

## Verification
- Passed: `node --import tsx --test src/lib/planning-prompts.test.ts src/components/analysis/planning-document-blocks.test.tsx src/lib/document-sections.test.ts src/lib/intake-question-generation.test.ts src/lib/intake-required-questions.test.ts`
- Passed: `npm run typecheck`
- Confirmed with `rg` that removed tool names are absent from `docs/research/ai-coding-tools-handoff-database.md` and `docs/plans/ai-coding-tool-research-review.md`.
- Confirmed `https://devin.ai/pricing` lists Devin Free, Pro $20/month, Max $200/month, Teams $80/month plus $40/month per full developer seat, and Enterprise custom as of 2026-07-01.

## UI Verification
- Started the local Next.js dev server at `http://localhost:3001` after removing a stale generated `.next/dev/lock` file.
- Verified the app is reachable: `curl -I http://localhost:3001/projects/new` returned a 307 redirect to `/auth?redirect=%2Fprojects%2Fnew`.
- Blocked: Codex in-app browser could not attach to a page, Chrome browser control timed out during navigation, and the terminal Playwright CLI wrapper hung without producing a snapshot.
- Because the repo requires real user-flow verification for project creation, I did not create Idea 1.1 or Idea 1.2 projects through direct API/database calls.
- No UI screenshots were captured because all browser-control paths failed before a page snapshot was available.

## Fresh-Eyes Self Review
- Pass 1: Checked the renderer path for legacy documents without a recommendation section. Existing AI Prompts still render normally; a recommendation-only MVP document no longer trips the empty state.
- Pass 2: Checked prompt numbering and section references after inserting the new section. The Next Prompt now points to the recommended tool from section 7 and build step 1 from section 8.
- Pass 3: Checked intake cap consistency across generation, repair prompt, required platform normalization, and project creation validation.

## Code Review Findings
- Finding: Submit-time validation still enforced 4-5 questions after the generator cap was raised. Severity: High. Status: fixed in `src/app/api/projects/create-from-intake/route.ts`.
- Finding: AI Prompts empty state ignored a recommendation-only document. Severity: Low. Status: fixed in `src/components/analysis/planning-document-blocks.tsx`.
- Finding: Project context still described the First Version Plan as a 9-section contract. Severity: Low. Status: fixed in `PROJECT_CONTEXT.md`.

## Security Review Findings
- Finding: Tool recommendations could steer backend/private-data projects to cloud app builders without review guidance. Severity: Medium. Status: mitigated in the First Version Plan prompt decision rules and `Watch out` field.
- Finding: Browser verification required e2e credentials. Severity: Low. Status: no credential values were printed or committed.
- Finding: External tool links open in a new tab. Severity: Low. Status: `rel="noreferrer"` is used with `target="_blank"`.

## Remediation Checklist
- [x] Fix create-from-intake question-count validation.
- [x] Add renderer coverage for the recommendation card.
- [x] Add parser coverage for seven-question intake output.
- [x] Update `PROJECT_CONTEXT.md`.
- [ ] Create Idea 1.1 and Idea 1.2 through the real UI once browser control is available.

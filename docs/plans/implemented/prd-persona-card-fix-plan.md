# Plan: Product Plan Persona Card Fix

## Goal
Harden Product Plan persona rendering so Prompt Lab outputs with standalone bold persona field labels do not create fake persona cards, and align the default PRD prompt with the renderer's preferred persona contract.

## Assumptions
- Existing unrelated worktree changes are user-owned and must be left untouched.
- `PROJECT_CONTEXT.md` does not need an update because this is renderer and prompt hardening, not an architectural or dependency change.
- Static React render tests are sufficient validation for this non-interactive visual parser behavior.

## Plan
1. Add a regression test using the Prompt Lab persona format that currently misclassifies `Description` as a persona.
2. Update `parseCurrentPersonas` to distinguish known standalone field labels from persona names.
3. Normalize metadata fields into chips and prevent metadata-only fields from being used as description or motivation fallbacks.
4. Update `PRD_SYSTEM_PROMPT` persona instructions to use `Archetype`, `Meta`, `Description`, `Needs`, `Pain points`, and `Motivation`.
5. Run focused and affected tests, then record review and security notes.

## Validation
- `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx src/lib/planning-prompts.test.ts`
- `node --import tsx --test src/components/analysis/planning-document-blocks.test.tsx src/lib/prd-document.test.ts src/lib/planning-prompts.test.ts`

## Risks And Mitigations
- Parser may become too permissive: keep known field-label detection explicit and preserve existing ideal-format behavior.
- Prompt changes may drift tests: assert the new persona contract directly in prompt tests.

## Rollback Or Recovery
- Revert the parser and prompt edits if persona rendering regresses; legacy markdown fallback remains available for unrecognized documents.

## Critique

### Software Architect
- The parser should be robust to minor prompt drift because Prompt Lab can save experimental runs that production prompts no longer generate.

### Product Manager
- The change improves user trust in generated Product Plans by preventing visibly broken personas.

### Customer Or End User
- Users should see complete persona cards with names, chips, description, needs, pain points, and motivation rather than confusing duplicate cards.

### Engineering Implementer
- Keep the fix narrowly scoped to current PRD persona parsing and prompt text.

### Risk, Security, Or Operations
- No new data access, secrets, auth, or external calls are introduced.

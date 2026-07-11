# Review: lightbox names, Cloudflare-first stack, composer cleanup

Date: 2026-07-11
Plan: `lightbox-names-cloudflare-stack-composer-cleanup-plan.md`

## Verification run

- `npm run typecheck`: clean.
- `npm test`: 467/467 pass (adds `artifact-lightbox` displayName test and `mvp-plan` prompt contract tests).
- `npm run lint`: 1 pre-existing error in `src/components/layout/workspace-document-frame.tsx:52` (`react-hooks/set-state-in-effect`) belonging to the in-flight workspace-streaming work in another session; none of this task's files are flagged.
- Real UI (Playwright against the running local dev server on :3000, signed in with `.env.e2e.local` credentials, project "Signal Driven Roadmap Intelligence"): `output/playwright/lightbox-composer-qa.mjs`, 13/13 checks pass. Evidence: `ui-evidence/2026-07-10/lightbox-composer-cloudflare/` (screenshots 01–08 + `report.json`), viewport 1440x900, route `/projects/f43d97aa-…-signal-driven-roadmap-intelligence`.
  - Composer: collapsed default, trimmed intro (no "scratch session" sentence), exactly two chips, no scope toggle, footer intact.
  - Click outside with empty input collapses; with typed text stays open.
  - Chips follow the document in view (executive-summary pair at top, first-version-plan pair after scrolling); "Explain a decision" and "Summarize Design Mockups" gone.
  - Chip click streams a real whole-project answer (one small OpenRouter QA spend); no scope label row on answers.
  - Prompt-file lightbox header: "First prompt" (was `first-prompt.md`); mockup lightbox header: "Concept 1: Data-Dense Command Center" (was `…-mockup-option-a.png`). Downloads keep kebab-case names.

## Code review findings

- `humanizeFileName` sentence-cases only the first word and uppercases `ai`; acceptable for the fixed prompt-file set, revisit if file names gain proper nouns.
- Composer API still accepts `scope: "document"` for backward compatibility; the client always sends `project`. Dead-path removal deferred until no old clients matter.
- Landing sample content edits were string replacements inside one large JSON literal; build/tests confirm the literal is still valid.

## Security review

No new surface. Composer route unchanged except the scope label string; auth, ownership check, rate limits, paid-plan gate, sanitization all untouched. QA script reads credentials from `.env.e2e.local` without printing them.

## Architecture improvement review

- Selected and landed: chip config as data (`SUGGESTION_CHIPS` map), reusable `displayName` on `ArtifactLightbox`, prompt contract test (`mvp-plan.test.ts`).
- Rejected as over-engineering (unchanged): embedding-based composer doc routing.

## Known follow-ups

- Existing projects' saved documents still recommend Vercel + Supabase until regenerated; the next fresh generation should be spot-checked for the Cloudflare stack in `first-prompt.md` (a fresh project generation was already running from another session and predates this prompt change, so it cannot serve as evidence).
- Pre-existing lint error in `workspace-document-frame.tsx` left for the owning workstream.

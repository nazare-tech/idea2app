# Review: Mockup Timeout And Retry Actions

## Scope
- Hobby-safe mockup option generation helpers and API routes.
- Workspace left-rail Generate/Retry actions.
- Workspace right-panel Retry action.
- Display-state precedence for manual retry over stale queue errors.
- Project context and plan updates.

## Verification
- `node --import tsx --test src/lib/document-generation-display-status.test.ts src/lib/openrouter-image-mockup-pipeline.test.ts src/lib/generation-queue-service.test.ts`
- `npx.cmd tsc --noEmit`
- `npm.cmd test`
- `npm.cmd run lint`
- `npm.cmd run build` after allowing network access for Next/font Google Fonts.

## Code Review Findings
- No blocking findings after remediation.
- Note: `npm.cmd run lint` still reports existing warnings in `project-workspace.tsx` and `src/app/api/tech-specs/[id]/route.ts`; no new lint errors were introduced.
- Note: visual browser verification was not completed because the browser automation Node REPL surface was not available in this session, and the workspace page requires authenticated project data.

## Security Review Findings
- No new unauthenticated data access found. New mockup option and finalize routes verify Supabase auth and project ownership before generation/finalization.
- Finalization normalizes option labels and rebuilds authenticated proxy image URLs server-side; it rejects storage paths outside the current project prefix.
- Residual low risk: finalize does not check that every submitted storage object exists before inserting the final mockup row. This can only create broken images for a project the authenticated user already owns; it does not expose another user's data.

## Remediation Checklist
- [x] Ensure local retry generation visually overrides stale queue error state.
- [x] Keep Vercel Hobby route/client max duration at `300s`.
- [x] Use single-option OpenRouter image timeout of `285s`; each option has its own `300s` Hobby route envelope.
- [x] Add project-owned validation to option generation and finalization routes.
- [x] Update `PROJECT_CONTEXT.md`.
- [x] Convert mockup option failures into local retry UI state instead of throwing `Error` objects into the Next dev overlay.
- [x] Preserve successfully generated mockup options in workspace memory so a same-session retry only regenerates missing/failed options.
- [ ] Optional future hardening: verify Supabase Storage object existence during mockup finalization.

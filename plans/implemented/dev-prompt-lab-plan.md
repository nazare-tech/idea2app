# Plan: Dev Prompt Lab With Artifact-Accurate Preview

## Goal
Build a local-development-only Prompt Lab that lets the owner test Market Research, Product Plan, First Version Plan, Design Mockups, and Launch Plan generation against existing project context without creating projects, consuming credits, starting queues, or saving canonical artifacts. The lab should save experiment history in Supabase and preview outputs with the same visual contract as the project workspace, plus a lab-only renderer playground.

## Assumptions
- The plan in the user prompt is already approved for implementation.
- The page and APIs are blocked outside local development.
- Supabase-backed prompt drafts and runs are user-scoped with RLS.
- Model overrides are allowed per run.
- Prompt/output experiments do not patch production prompt files.
- Lab renderer experiments are isolated from production workspace components.

## Clarifying Questions
1. No blocking questions remain for v1; any later prompt promotion workflow can be designed separately.

## Recommended First Step
Add the non-persisting generation and prompt composition layer first, because it is the boundary that guarantees lab runs cannot mutate canonical project artifacts.

## Plan
1. Create isolated prompt lab types and runner utilities for text artifacts and single-option mockups.
2. Add prompt-backed Launch Plan generation while preserving the existing route contract.
3. Add Supabase migration for prompt lab experiment/run history with RLS.
4. Add local-dev-only API routes for project context, drafts/runs history, and isolated generation.
5. Add `/dev/prompt-lab` page and client UI using artifact-accurate renderers and lab-only experimental preview.
6. Add focused tests for guards and non-persisting behavior.
7. Update `PROJECT_CONTEXT.md`, run verification, and write review/security notes.

## Milestones
- Isolated runners: generation works without DB writes.
- API surface: local-dev guards, auth, ownership checks, and RLS-backed history are in place.
- UI: prompt editing, model override, run history, and preview work for all artifact types.
- Verification: typecheck/tests pass or documented blockers are recorded.

## Validation
- Unit tests cover local-dev guards, prompt assembly, and isolated runner contracts.
- Typecheck confirms API/UI integration.
- Manual browser check confirms the page renders and can load context.
- Review confirms no canonical artifact tables are written by lab runs.

## Risks And Mitigations
- Expensive accidental production exposure: hard server-side local-dev guard on page and every API route.
- Canonical artifact mutation: lab runner avoids production persistence helpers and uses separate history tables only.
- Prompt injection from project context: reuse prompt sanitization helpers and keep context in user messages.
- Mockup cost/time: lab generates only one selected image option per run.
- Renderer drift: production-style preview imports existing renderers; experimental preview remains local to Prompt Lab.

## Rollback Or Recovery
- Remove `/dev/prompt-lab`, `/api/dev/prompt-lab/*`, prompt lab utilities, and the prompt lab migration if the feature needs to be backed out.
- Existing production artifact routes remain usable independently.

## Open Decisions
- Future promotion flow from saved prompt drafts to production prompt files is explicitly out of scope.

## Critique

### Software Architect
- The right boundary is a non-persisting runner shared by APIs, not a page that calls production generation routes with flags.

### Product Manager
- Existing-project context makes iteration practical and avoids replaying idea intake, but the UI must make upstream context visible so output quality is explainable.

### Customer Or End User
- The primary user is the builder tuning artifacts. The interface should prioritize fast comparison and faithful previews over polished public-product onboarding.

### Engineering Implementer
- Launch Plan currently uses deterministic template code, so making it prompt-backed is the highest-risk behavior change and should keep the old shape as a fallback.

### Risk, Security, Or Operations
- Even local-dev tools need auth, project ownership checks, RLS, rate limiting, and no secret leakage because they call external AI APIs and store prompts/outputs.

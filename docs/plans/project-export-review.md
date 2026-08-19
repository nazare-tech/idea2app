# Project Export Review

**Date:** 2026-08-19
**Status:** Implemented; real-Chrome verification blocked by browser-control connection

## Outcome

Projects dashboard cards now expose **Export Project** between Rename and Delete. The action requests an authenticated owner-scoped ZIP containing current user-visible project artifacts only:

- `documents/project-brief.md` with original idea, generated summary, and intake Q&A
- Latest `market-research.md`, `product-plan.md`, and `first-version-plan.md`
- Current derived AI Prompt Markdown files under `prompts/`
- Images from the latest finalized canonical mockup row under `mockups/`
- `README.md` with included paths, missing artifacts, and controlled partial-export warnings

Hidden Tech Specs, deployments, deprecated prompt chat, dev Prompt Lab data, queue partials, and unfinished mockup drafts are excluded.

## Verification

- `npm test`: 770 passed, 0 failed before sweep remediation; final count recorded in the commit-sweep report.
- Final focused suite: 27 passed across ZIP records/path safety, export naming/front matter/intake Q&A/manifest/MIME rules, browser filename validation, product analytics contracts, and shared AI Prompt output.
- `npm run typecheck`: passed.
- `npm run lint`: changed files clean. Repository-wide lint passed with two unrelated existing warnings in `output/playwright/prod-full-flow.mjs` and old `ui-evidence` test material.
- `npm run build`: passed outside sandbox after Turbopack's sandbox-only localhost bind failure; `/api/projects/[id]/export` appears in the production route manifest and chunky/vendor guard passed.
- `git diff --check`: passed before final review; rerun in final wrap-up.

## Real UI Verification

Primary route selected: real Google Chrome, required because dashboard state is authenticated and the behavior ends in a browser download.

- Target: `http://localhost:3000/projects`
- Intended proof: open project-card kebab, verify Rename / Export Project / Delete ordering, trigger export, observe preparing and success states, inspect downloaded ZIP, capture dashboard/menu/toast evidence.
- Blocker: Chrome Profile 1, extension installation/enabled state, native-host manifest, and running-process checks all passed. Browser control timed out on tab listing/navigation. The approved recovery opened a fresh Chrome Profile 1 window; the single allowed retry still timed out.
- Server health: an outside-sandbox localhost request confirmed the existing Next dev server responds on port 3000.
- Evidence: none captured. Repository UI policy forbids substituting headless/in-app automation and describing it as real-Chrome proof after this blocker.
- Unverified risk: actual authenticated Supabase/Storage assembly and browser download were not exercised end-to-end in the UI. Unit, type, lint, and production-build coverage remain green.

## Code And Security Review

- Authorization: route first selects project by exact `id` plus authenticated `user_id`; artifact reads retain existing owner RLS.
- Privileged Storage boundary: service access occurs only after parsing the latest canonical mockup row and validating each server-derived path under `<projectId>/` with no traversal.
- Archive safety: entry paths are server-created, traversal/duplicates are rejected, UTF-8 names and CRC32 are encoded, ZIP32/file-count bounds are enforced.
- Resource safety: text files cap at 10 MB each, images at 20 MB each, archive inputs at 80 MB total, and independent user/IP buckets cap abusive request rates.
- Content safety: unsupported explicit MIME types are rejected even when a path has an image extension. Analytics contain no names, paths, contents, URLs, or raw errors.
- Failure recovery: missing/query-failed/unsupported/oversized artifacts become manifest notes while remaining artifacts still download.
- No secrets, schema changes, migration, dependency, billing, generation, or destructive operations were introduced.

## Architecture Improvement Review

- **Selected:** moved AI Prompt file construction from a client component into `src/lib/ai-prompt-files.ts`. Browser cards and server export now share one contract, preventing prompt-output drift.
- **Selected:** isolated dependency-free ZIP creation, export formatting, and browser download behavior into focused modules with direct tests.
- **Selected during sweep:** ZIP records now stream through the response so valid image exports are not rejected by Vercel's 4.5 MB buffered-response limit; image inputs remain bounded in memory.
- **Rejected:** adding JSZip/Archiver. Store-mode ZIP needs no dependency and avoids recompressing image formats that already carry compression.

## Remediation Applied During Review

- Added visible preparing toast after the overflow menu closes.
- Added per-document and total archive input bounds.
- Rejected explicit unsupported MIME types instead of trusting a filename extension.
- Added per-file manifest notes when only part of the current AI Prompt bundle can be derived.
- Extracted the canonical mockup Storage-path boundary into a directly tested validator that rejects cross-project prefixes, traversal segments, empty segments, backslashes, and null bytes.
- Streamed ZIP response records, split user/IP rate-limit buckets, and validated mockup paths against immutable finalized-run metadata after mandatory same-model and opposite-model review.
- Added a five-minute browser timeout, delayed object-URL revocation, accurate "download started" copy, browser lifecycle/error tests, streaming ZIP parity coverage, and canonicalized shared heading matching.

## Mandatory Review Outcome

- Three parallel read-only sweep finders covered structure/duplication, contracts/correctness, tests/dead code/docs, and product UX.
- Opposite-model range review ran for the authenticated route and service-role Storage boundary. Verified findings were remediated before push; rejected findings and rationale are recorded in the commit-sweep report.

## Rollback

Remove the dashboard action and export route, revert analytics registry additions, then move the shared prompt builder back only if desired. Export is read-only; no database or Storage recovery is required.

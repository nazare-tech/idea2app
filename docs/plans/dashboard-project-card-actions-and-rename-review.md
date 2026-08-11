# Dashboard Project Card Actions And Rename Review

## Outcome

Implemented and verified. Project cards no longer expose a destructive hover control over the thumbnail. Each card has an always-visible overflow button aligned with the title; its exact menu items are `Rename` and `Delete`. Rename opens an accessible modal with a labeled field and `Save` / `Cancel`, persists through the authenticated owner-scoped PATCH route, updates the card's canonical href, and survives reload. Delete retains the existing paid confirmation or Free upgrade behavior.

## Plan Evaluation

- Plan: `docs/plans/dashboard-project-card-actions-and-rename-plan.md`.
- Opposite-model reviewer: local Claude Code, Opus 5, medium effort; no OpenRouter reviewer was used.
- Three evaluation rounds were folded into the plan or explicitly rejected with source evidence.
- Accepted: keep the full-card link with a sibling action, hoist the dialog outside the menu portal, centralize client-safe name validation, update href from the authoritative response, preserve owner filters, prove persistence/restoration, and add touch plus long-title collision coverage.
- Rejected as disproportionate: restructuring the route around dependency injection solely for a direct handler test. The unchanged auth and owner-query chain was inspected; pure boundary tests plus a real authenticated write/reload/restore journey cover the behavior.

## Verification

- Focused validator/request/details tests: 14 passed.
- Full `npm test`: 746 passed, 0 failed.
- TypeScript: passed.
- Targeted ESLint: passed.
- Focused Playwright project-card tests: 2 passed.
- Full Playwright suite: 5 passed, 1 paid intake test intentionally skipped.
- `git diff --check`: passed.
- The retained project used by E2E was restored to its exact original name; live Chrome showed 23 normal project cards afterward.

## Real UI Evidence

Authenticated Chrome verification used existing projects and made no persistent write, delete, project creation, mockup generation, or credit-consuming request.

- Desktop `/projects`: overflow controls are visible at rest and aligned with titles without changing the title-to-description rhythm.
- Menu: exact `Rename` and `Delete` items render above the card without navigation.
- Rename modal: correct heading, prefilled labeled input, Cancel, and Save; the background is inert while open.
- After Cancel: zero dialogs remain, `body` pointer events are `auto`, and focus returns to `Project actions for Vetted Event Photographers On Demand`.
- Narrow responsive menu/modal evidence was also captured.
- Evidence directory: `ui-evidence/2026-08-09/project-card-actions-rename/`.

## Fresh-Eyes, Architecture, And Security Review

Review found and remediated these issues:

1. A stalled PATCH could leave Rename pending indefinitely. The shared client now aborts after 15 seconds and returns a generic retryable error; a focused timeout test covers it.
2. Delete and upgrade overlays lacked dialog focus trapping and Escape semantics. Both now use controlled Radix Dialog surfaces and restore focus to the overflow trigger.
3. Rename focus restoration was implicit. The card now owns a stable trigger ref and restores it explicitly after Cancel, Escape, or completion; Playwright and live Chrome verify this.
4. A 32px inert spacer made the title row taller. It now reserves only width and stretches to the existing line height, preserving the visual rhythm while preventing long-title collision.
5. Workspace-header rename could issue overlapping optimistic writes and ignored its saving prop. It now uses the same authoritative response helper, timeout, in-flight guard, real saving state, and visible recoverable error.
6. E2E cleanup depended on an open page. It now uses the authenticated browser-context request API, survives page closure, retries restoration, and refuses to overwrite another run's marker.
7. Additional invisible directional controls are removed while meaningful ZWNJ/ZWJ characters remain supported.

No authentication bypass, cross-project write, XSS sink, secret exposure, analytics PII, external AI request, or billing side effect was introduced. PATCH still requires `auth.getUser()` and filters by both project id and `user_id`, with existing RLS retained.

## Deferred Existing Limitations

- Invalid/non-owned project ids can still surface the route's pre-existing generic 500 path when Supabase `.single()` returns no row.
- PATCH still accepts the route's pre-existing unbounded description and arbitrary string status fields. Those are outside this name-only feature and should be handled in a separate route-contract change.
- A direct route-unit harness remains deferred because it would require authentication/Supabase dependency restructuring solely for this change; the real authenticated E2E proves successful owned persistence and restoration.

## Remediation Checklist

- [x] Remove media hover delete and add title-row overflow.
- [x] Preserve valid full-card link structure and navigation.
- [x] Add accessible Rename, Delete, and upgrade dialogs.
- [x] Add shared bounded project-name validation and timeout.
- [x] Suppress concurrent workspace rename submissions.
- [x] Restore focus and body interaction after dialogs.
- [x] Harden E2E mutation cleanup and concurrency detection.
- [x] Update durable architecture, API, product, directory, test, and backend-history documentation.
- [x] Preserve unrelated dirty work.

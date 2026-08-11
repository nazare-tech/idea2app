---
implemented: true
implemented_at: 2026-08-09
implementation_summary: Replaced the media hover-delete control with a title-aligned overflow menu, added accessible Rename/Delete dialogs, centralized bounded project-name normalization, hardened the owned PATCH path and both rename clients, and verified persistence, restoration, focus, touch, geometry, and existing delete gating.
---

# Plan: Dashboard Project Card Actions And Rename

## Goal

Replace the project-card media hover-delete control with an always-visible overflow button aligned to the title below the thumbnail. The menu exposes `Rename` and `Delete`; Delete preserves the existing paid/free behavior, while Rename opens an accessible modal titled `Rename` with a project-name field and `Save` / `Cancel` actions, persists through the owned project PATCH route, and updates the card without navigation.

## Assumptions

- The overflow control belongs on every populated project card; `Delete` remains visible in the menu for Free users but opens the existing upgrade prompt.
- `Rename` is available to every tier, including Free; no allowance check is added.
- The existing full-card link, workspace warmup, 430px card, 188px details panel, thumbnail, description clamp, and 32px grid remain unchanged.
- Manual project names use the existing generated-name maximum of 80 UTF-16 code units but preserve the user's casing and punctuation after shared normalization.
- Project URLs contain the stable UUID plus a name-derived slug. The workspace reads by UUID and redirects stale slugs to the canonical ref; successful card rename will also recompute its local href immediately to avoid the extra redirect.
- Repository search found one PATCH caller: `ProjectWorkspace.handleProjectNameUpdate`, reached only through `ProjectHeader`. It already sends a trimmed string. Generated names are capped at 80 UTF-16 code units by `project-name-generation.ts`; both dashboard and workspace manual rename clients will use the new dependency-free shared normalizer and cap before calling PATCH.
- Verification may rename one retained project to an 80-character marker only when its original name is byte-for-byte stable under the shared normalizer, prove persistence after refresh, then restore the exact original through the authenticated browser context in `finally`. It must not create projects, generate mockups, delete data, or leave the marker behind.

## Clarifying Questions

1. Should the full card remain clickable after adding an interactive title-row action?
   - Recommendation A: Keep the current full-card link and position a pointer-enabled sibling action over a reserved inert title-row slot.
   - Trade-off: Preserves established navigation and valid HTML, while coupling action placement to the fixed 188px details region.
   - Recommendation B: Split the card into separate thumbnail/title links with the menu in normal flow.
   - Trade-off: Simpler document flow, but reduces the click target and changes established card behavior.
   - Selected: Recommendation A under repository policy.
2. How should rename validation and failures behave?
   - Recommendation A: Trim whitespace, require 1-80 characters on client and server, keep the modal open on failure, and show a bounded inline error.
   - Trade-off: Consistent safe persistence and recoverable UX; introduces a documented PATCH validation rule.
   - Recommendation B: Send any non-empty browser value and rely on the database.
   - Trade-off: Less code, but the server currently accepts unbounded and non-string values at a user-input boundary.
   - Selected: Recommendation A.
3. Should menu and rename interactions produce new product-analytics events?
   - Recommendation A: Add no event because no named funnel or product decision consumes generic menu/rename clicks; retain existing operational PATCH/DELETE metrics and upgrade attribution.
   - Trade-off: Avoids surveillance noise; rename adoption is unavailable until a specific decision requires it.
   - Recommendation B: Add click and rename-success events now.
   - Trade-off: More behavioral data, but no current denominator or decision justifies it and project names must never enter properties.
   - Selected: Recommendation A, matching the analytics taxonomy.

## Recommended First Step

Add focused validation and presentational contract tests, confirm their red state, then wire the sibling Radix menu and rename dialog to the existing owned PATCH endpoint.

## Runtime And Change-Impact Analysis

### Repeated Work

- No polling, subscriptions, generation, billing, or eager data work is added. Rename requests use one bounded 15-second abort timer that is cleared as soon as the PATCH settles.
- Menu/dialog state is card-local and changes only on user interaction. A successful rename performs one authenticated PATCH plus one `router.refresh()`.
- Existing hover/focus workspace prefetch remains unchanged and does not run when menu items are selected.
- The projects dashboard does not render generation polling/progress state. Its refresh re-reads the server card list and mockup metadata; workspace generation polling lives only after navigation into a project.

### Ownership, Scope, And Lifetime

- Open-menu behavior and keyboard focus are owned by the existing shared Radix dropdown primitive; rename dialog focus/dismissal is owned by a separately hoisted Radix Dialog. The controlled menu closes before dialog open, suppresses menu focus restoration while the dialog takes focus, and never nests the Dialog under portaled menu content.
- Draft, saving, error, display-name, and canonical href state live in the individual `DashboardProjectCard` and reset on close or a changed server prop.
- Normalization and the 80-code-unit constant live in a dependency-free `src/lib/project-name.ts` module used by both clients, the PATCH route, and generated-name sanitation. The card never imports AI prompt/generation modules into its client bundle.
- A rename updates only the owned `projects.name` row and the affected card/server render; delete behavior and entitlement checks stay unchanged.

### Boundary And Cache Semantics

- `PATCH /api/projects/[id]` keeps its `{ name }` request and `{ data }` response shape, but name input is NFKC-normalized, stripped of C0/C1, U+200B/U+FEFF, and bidi embedding/override/isolate controls, whitespace-collapsed, nonblank, string-only, and capped at 80 UTF-16 code units after normalization. ZWNJ U+200C and ZWJ U+200D remain intact for language and emoji semantics. Invalid JSON/input returns 400.
- Ownership remains enforced by authenticated user lookup, `id` plus `user_id` query filters, and existing RLS. No schema, migration, permission, billing, thumbnail, or mockup contract changes.
- Local display state and href update from the normalized `data.name` returned by the successful PATCH response, never from the raw draft. The card calls the same client-safe `getProjectUrl()` / `buildProjectRef()` helper as the workspace canonicalizer, whose ASCII-only slug output safely falls back to the UUID for non-Latin-only names. `router.refresh()` reconciles the dynamic authenticated `/projects` server render; `/projects/[projectRef]` always loads current name data by UUID and canonicalizes stale slugs. A failed response leaves persisted and displayed names unchanged.
- A prop-sync effect updates the local display name/href when a later server render or another rename surface changes the `name` prop.
- Prop sync never overwrites draft/error/saving state while Rename is open. Concurrent dashboard/workspace renames are explicitly last-write-wins; the successful response and following refresh show the persisted winner.

### Failure And Recovery

- Duplicate Save presses are blocked while the request is pending. A failed or timed-out response keeps the modal/draft available, shows a generic inline message, and re-enables actions. Workspace-header renames use the same request helper, authoritative response, timeout, and in-flight guard.
- Cancel, backdrop dismissal, or Escape discards unsaved draft state. Menu selection must not navigate the card link.
- Rollback is code/docs-only. Existing saved names need no transformation or cleanup.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Invalid interactive nesting or accidental navigation | Static DOM contract plus Playwright/Chrome menu interaction | Overflow trigger has no anchor ancestor; opening menu/modal keeps `/projects` URL |
| Radix menu/dialog pointer lock | Playwright body state and second-card action after Rename Cancel | dialog is hoisted; body pointer events restore; another card menu remains clickable immediately |
| Title/menu collision | Component contract and desktop/narrow screenshots | Title truncates before reserved action slot; trigger aligns within title row at both viewports |
| Broken keyboard/focus behavior | Radix roles plus Playwright/Chrome keyboard checks | Trigger opens menu; Rename opens dialog; Escape/Cancel closes; focus returns without navigation |
| Unsafe or inconsistent name input | Focused validator tests and route use | whitespace/non-string/81-char input rejected; valid name trimmed; 80 chars accepted |
| Save failure or duplicate write | Code-path review and disabled-state assertions | one PATCH per submission; failure stays in modal with inline error and unchanged title |
| Persistence or stale slug | Playwright mutation-and-restore journey | marker survives page reload, card href contains new slug, workspace opens/canonicalizes, original name is restored even after failure cleanup |
| Delete regression | Existing free smoke path through overflow menu | Delete still opens paid confirmation or Free upgrade prompt; Cancel/Not now closes; no deletion |
| Card geometry regression | Existing browser bounding-box assertions | card 430px ±2px, details 188px ±2px, description remains four lines, 32px grid gaps |
| Long-title collision | Browser bounds while the 80-character marker is active | title right edge is no farther right than trigger left edge at desktop and narrow widths |
| Old media delete survives | Playwright before any hover plus thumbnail subtree inspection | overflow trigger is visible at rest; thumbnail contains no Delete button or media action |

## Architecture Improvement Opportunities

- **Selected — reuse Radix dropdown and a separately hoisted Dialog.** Benefit: portal clipping safety, keyboard navigation, Escape handling, focus trapping/restoration, and valid accessibility semantics without the nested dismissable-layer pointer lock. Trade-off: controlled menu/dialog sequencing remains necessary. Files: `dashboard-project-card.tsx`, shared UI primitives unchanged.
- **Selected — reserve title width inside `ProjectCardDetails`, keep the trigger a sibling of the card link.** Benefit: valid HTML and stable full-card navigation without brittle absolute `top` math. Trade-off: placement relies on the card's intentional fixed 188px details region. Files: card and details component.
- **Selected — centralize name normalization and the 80-code-unit constant in a dependency-free module.** Benefit: dashboard/workspace/server/generated-name limits cannot drift, normalized display equals persistence, and no server/AI dependency enters the card bundle. Trade-off: one small helper/test file. Files: `src/lib/project-name.ts`, `project-name-generation.ts`, PATCH route, card, project header.
- **Deferred — refactor all existing project modals into one generic modal abstraction.** Benefit: less repeated modal styling. Trade-off: broadens this feature and risks changing established delete/upgrade behavior.
- **Rejected — split the full-card link into several smaller links.** This weakens the current click target solely to place one action.
- **Rejected — add generic menu-open/rename-click analytics.** No named product question consumes them; endpoint metrics already cover reliability.

## Plan

- [x] Add focused red-state tests for shared rename validation and title action-space reservation.
- [x] Audit and update every current card-delete selector/documentation reference before removing the hover control.
- [x] Add the title-aligned sibling overflow trigger (accessible name includes project name) and Radix menu with exact `Rename` and `Delete` items; remove the media hover trash button.
- [x] Add a separately hoisted controlled Radix Rename modal, controlled menu-close/dialog-open sequencing, identical shared client normalization, inline error, successful response-derived display/canonical-href update plus server refresh, and duplicate-submit protection.
- [x] Harden PATCH name handling with shared normalization/validation while preserving authentication, ownership filters, response shape, and existing workspace rename compatibility.
- [x] Update the existing workspace-header rename client to the same normalizer/maxLength so tightening PATCH cannot create client/server drift.
- [x] Add a dependency-injected rename request helper with focused normalized-success, 400/500, malformed-success, network-failure, and timeout tests; component state remains responsible for duplicate-submit disabling.
- [x] Update the free Playwright card journey for menu, rename-open/cancel, a successful 80-character rename/reload/long-title geometry check/restoration, delete-open/cancel, keyboard/focus, URL stability, and existing geometry.
- [x] Update architecture, product overview, API endpoint, key-file, test-inventory, and backend-change-history documentation.
- [x] Run focused tests, direct unit suite, typecheck, targeted lint, and focused free Playwright smoke.
- [x] Verify authenticated `/projects` in real Chrome at desktop and narrow widths; capture menu and Rename modal evidence without persistent mutation.
- [x] Complete two fresh-eyes passes, code/architecture/security review, remediate findings, and finalize plan metadata.

## Milestones

1. Menu is accessible, title-aligned, and navigation-safe.
2. Rename persists safely and fails recoverably.
3. Delete behavior and card geometry remain green.
4. Real Chrome evidence, reviews, and durable docs are complete.

## Test Strategy

- Unit tests for manual project-name normalization: valid trim/collapse/NFKC, removal of newline/C0/C1/U+200B/U+FEFF/bidi controls, explicit preservation of U+200C/U+200D, blank, non-string, exact 80 UTF-16 code units, NFKC expansion beyond the limit, an astral character at the boundary, and 81-character input. Normalize then measure; never truncate user input.
- Unit tests for the injected rename request helper: response-derived normalized name, generic 400/500/network failure, and malformed success payload. The UI shows specific blank/maximum messages before fetch and a generic retry message only for request/server failures.
- Server-rendered component test for the inert reserved title action slot; interactive behavior remains in the real-browser suite because the unit harness has no DOM/event runtime.
- Focused Playwright free smoke on the retained authenticated project list: require at least two cards with a clear precondition failure; before hover, assert the named overflow trigger is visible and the thumbnail contains no delete action; open menu, assert exact items, open Rename, verify prefilled labeled input and Save/Cancel, cancel once, assert body pointer events restored and a second card's action opens, then rename to an 80-character no-space marker through the UI. Fail before mutation when the captured original differs byte-for-byte from `normalizeProjectName(original)`. Reload and assert persistence plus canonical href, measure title-versus-trigger bounds, restore the captured original name through the UI, reload, and confirm byte equality. The suite is sequential; a unique marker prevents overlap confusion. A `finally` cleanup retries restoration through the authenticated browser-context request API so it survives page closure, and makes cleanup failure an explicit hard failure naming the project id and original value. A pre-mutation marker guard refuses to overwrite another concurrent run. No designated disposable project exists in repository config, and creating one is prohibited by the no-credit project policy, so a retained project is the only real persistence surface.
- Continue by opening Delete and dismissing the existing confirmation/upgrade surface. Assert URL stability, focus behavior, topmost hit target, existing geometry at desktop/narrow widths, and an accessible trigger label containing each project name.
- Add a touch-enabled Playwright context that signs in normally, taps the overflow trigger, asserts the menu opens, and confirms the URL remains `/projects`.
- Real Chrome with existing projects only. Capture desktop menu, desktop Rename modal, and narrow menu/modal states under `ui-evidence/<implementation-date>/project-card-actions-rename/`. Chrome evidence does not persist a second rename because Playwright already proves persistence and restoration; no delete/create/generation occurs.
- Typecheck, targeted ESLint, focused unit tests, and the underlying full Node test command. Record any unrelated dirty generated-catalog wrapper blocker separately.

## Rollback Or Recovery

- Revert card/details/menu/modal changes, shared validator/route validation, tests, and docs. Existing names remain valid; no migration, cache purge, generated asset cleanup, or data rollback is required.

## Open Decisions

- None.

## Critique

### Software Architect

- A sibling overlay anchored to the fixed details region is the smallest valid-DOM change. The title reserves its exact footprint, while portaled menu/dialog content avoids card clipping and stacking regressions.

### Product Manager

- Grouping Rename and Delete clarifies project management and removes a destructive control from the media. No extra menu options or tracking should expand this focused change.

### Customer Or End User

- Actions become discoverable on touch and desktop. Rename must be reversible before Save, explain failures inline, and never turn a menu click into workspace navigation.

### Engineering Implementer

- Existing full-card linking means the trigger cannot be inserted directly beside the title in DOM flow. The reserved-slot plus sibling overlay keeps semantics valid with minimal layout churn.

### Risk, Security, Or Operations

- Project names are user-authored content: validate and bound them server-side, render them only as React text/value, keep errors generic, and preserve owner-scoped parameterized updates. Never place names in analytics properties.
- No rate limit is added: this is a cheap authenticated owner-scoped database write with no AI, external API, or billing side effect. Existing operational API metrics provide abuse evidence; introducing an arbitrary new quota is deferred until measured need.
- This PATCH-route invariant is intentionally narrower than a database invariant. Intake/generated-name writers already sanitize/cap current output, while existing legacy rows remain renderable even if they exceed the manual rule; no migration or forced rewrite is in scope.
- Rename prefills the stored name unchanged. On Save the UI runs the shared normalizer, replaces the field with that normalized form, and either submits it or shows the specific 80-character maximum; legacy names remain displayable and users can intentionally save a valid normalized replacement.

## Cross-Model Plan Evaluation

- Reviewer: local Claude Code, Opus 5 through `opus`, effort medium.
- Accepted: audit UUID-plus-slug routing, update the card href after rename, enumerate PATCH callers and generated-name cap, add successful persistence/reload/restoration coverage, audit all delete selectors, measure an explicit long-title collision case, harden Unicode/control-character normalization, and use the implementation date for evidence.
- Accepted from the second evaluation: hoist Dialog outside the menu subtree with controlled focus sequencing; isolate name rules in a client-safe dependency-free module; use the shared canonical `getProjectUrl`; normalize identically on both clients and server; derive display/href from response `data.name`; sync local state from changed props; prove old media delete absence, at-rest action visibility, body pointer restoration, and per-project accessible labels.
- Rejected with evidence: dashboard refresh cannot reset generation progress because `/projects` renders no polling/progress client; those stores mount only in the workspace. `router.refresh()` is retained to reconcile the authenticated dynamic server list after local state updates.
- Rejected under explicit user intent: Free users still select `Delete` and receive the existing upgrade prompt because the user asked for both exact menu options and for Delete to behave as it does now.
- Rejected as disproportionate: a new rename rate limit adds an arbitrary quota to a cheap authenticated owner-scoped write with no external spend. Operational endpoint metrics remain the observation; revisit only with abuse evidence.
- Clarified: stale name slugs do not 404. Project refs begin with the stable UUID, route loading queries by UUID, and the server redirects a stale slug to its canonical value. Local href recomputation removes that redirect in the normal card flow.
- Partially rejected from the second evaluation: no designated disposable E2E project exists, and project creation is prohibited for routine verification. The sequential suite uses one retained project, captures its original name, uses a unique marker, restores through the UI, retries restoration in `finally`, and treats cleanup failure as a test failure. This is the narrowest real persistence proof available without creating data.
- Accepted from the third evaluation: require normalization-stable originals before mutation; restore through authenticated browser cookies and assert byte equality; preserve ZWNJ/ZWJ; normalize before measuring without truncation; protect open drafts from prop refreshes; add an injected request-helper failure suite; add a touch context; document last-write-wins, Free-tier Rename, exact client-safe routing helper, and dashboard no-polling evidence.
- Rejected from the third evaluation: a route-handler dependency-injection rewrite would restructure authentication/Supabase solely for tests. The unchanged auth/user-id query chain is reviewed directly, while pure boundary validation, request-helper failures, and real authenticated success persistence are automated. A disposable project id cannot be required without creating prohibited fixture data.
- Confirmed by source: `src/lib/project-routing.ts` is a pure dependency-free ASCII slug helper used by both dashboard and workspace canonicalization. `src/app/(dashboard)/projects/page.tsx` renders server cards only; `dashboard-project-card.tsx` has no generation store or polling. `generate-all-store.ts` mounts in `ProjectWorkspace`, not `/projects`.

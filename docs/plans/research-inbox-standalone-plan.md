---
implemented: true
implemented_at: 2026-08-15
implementation_summary: Independent loopback-only Research Inbox app on port 4310 with JSON persistence, neutral no-auth UI, bounded Codex/browser handoff APIs, Maker compatibility retirement, and verified desktop/mobile flows.
---

# Plan: Standalone Research Inbox Server

## Goal

Extract Research Inbox from Maker Compass into an independent, unauthenticated Next.js website under `apps/research-inbox`, served by a separate loopback-only server on port 4310. Preserve Maker Compass's warm editorial visual language without its name, header, account UI, Supabase session, billing rules, or application runtime.

## Assumptions

- “Different server” means a separately started Next.js app with its own app root, build output, metadata, API, and port.
- No-auth means no sign-in wall or user account. Research items, drafts, seen/save/archive/reply state, browser preference, and visible batches persist in a server-local JSON document. A per-launch token returned by same-origin bootstrap and held only in page memory protects mutation APIs without a cross-port cookie or account system.
- Current Maker Compass research state is browser `localStorage` only. No Research Inbox rows or drafts were written to Supabase, so no Supabase deletion is needed.
- Anonymous Codex execution is safe only as a loopback-bound local product. Public hosted anonymous CLI execution is out of scope.
- Maker Compass remains on port 3000. Its `/research` URL becomes a compatibility redirect before dashboard auth.
- Existing research files are retained until the user approves deleting them; the active implementation will not import them.

## Clarifying Questions

1. What deployment shape should v1 use?
   - Recommendation A: Self-hosted/local standalone server on `127.0.0.1:4310`, with Codex CLI on the same machine.
   - Trade-off: No login, local JSON ownership, and safe operator boundary; not a public multi-user SaaS yet.
   - Recommendation B: Public anonymous hosted site that calls Codex or OpenRouter.
   - Trade-off: Easier sharing, but unsafe cost/abuse boundary without auth, quotas, or a companion service.
   - Selected: Recommendation A. It satisfies no-auth and different-server requirements without exposing an operator CLI publicly.
2. What should happen to Maker Compass `/research`?
   - Recommendation A: Redirect to explicitly configured `RESEARCH_INBOX_URL` before Supabase middleware/auth. Never default a hosted build to loopback.
   - Trade-off: Existing local bookmarks survive when configured; Maker Compass still carries one compatibility rule. Hosted users retain the legacy page until deletion approval.
   - Recommendation B: Remove the route entirely.
   - Trade-off: Cleanest separation, but old bookmarks break and deleting existing files requires explicit approval.
   - Selected: Recommendation A. Legacy implementation files remain pending deletion approval.
3. How much Maker Compass brand should carry over?
   - Recommendation A: Reuse Warm Horizon tokens and editorial typography, but use neutral “Research Inbox” identity and no Maker name/mark/header.
   - Trade-off: Familiar quality without product coupling.
   - Recommendation B: Build a fully unrelated visual brand now.
   - Trade-off: Stronger separation, but expands scope into brand strategy.
   - Selected: Recommendation A.

## Recommended First Step

Create isolation and shell tests that fail until the standalone app renders anonymously and contains no Maker Compass account/navigation chrome.

## Runtime And Change-Impact Analysis

### Repeated Work

- Filters/search recompute only on local query, view, source, or explicit feedback changes; expected 10–100 items, worst-case low hundreds.
- Local persistence writes once per explicit state/browser change; no polling.
- Reply generation spawns one bounded Codex process per click, maximum 20 requests per hour for the local server, with a 45-second hard timeout and bounded output.

### Ownership, Scope, And Lifetime

- Standalone app owns its package/lockfile, page, CSS, seed, state, components, API, metadata, dependencies, and `.next` output under `apps/research-inbox`.
- Standalone repository owns `.local/research-inbox.json`; it creates the directory with mode 0700 and file with mode 0600, then uses bounded parse/validation plus temp-file-and-rename atomic writes.
- JSON state contains schema version, revision, workspace metadata, sanitized research items, item-state deltas, visible item IDs, browser mode, and update timestamp. No Supabase identifier or Maker Compass user/project foreign key exists.
- Each write acquires an exclusive lockfile, re-reads the on-disk revision inside the critical section, atomically replaces JSON, then releases the lock. A second process cannot pass a stale in-memory revision; conflict returns 409 and the client reloads the latest document.
- Codex child process belongs to one API request and is killed on timeout. It receives a restricted environment, runs in a private temporary directory with read-only sandbox/rules ignored, and returns only its owned bounded output file.
- The signed launch token lives only in page memory with bounded expiry. Its signing key is a private `.local/launch-secret` operational file so independently bundled route handlers can validate the token; no cookie crosses local ports.
- Maker Compass owns only a compatibility redirect and no active research UI/API dependency.

### Boundary And Cache Semantics

- No Supabase, billing, project, Maker layout, or root research import is allowed from the standalone source graph. A recursive resolved-import guard rejects relative imports escaping the package and forbidden dependencies; a deliberately coupled fixture proves it fails closed.
- Existing Maker browser-local keys are not read automatically; first-run UI explicitly states that prior port-3000 browser state was not imported. No state is silently claimed as migrated.
- Sanitized seed initializes the JSON document once; after bootstrap, JSON is the evidence/state source of truth and item actions persist deltas into that document.
- Mixed-version behavior: old port-3000 `/research` redirects; direct port-4310 `/` is canonical.

### Failure And Recovery

- If standalone server is down, compatibility redirect lands on an unavailable local port; README and UI handoff name the start command.
- Missing JSON initializes from the bundled sanitized seed. Invalid/incompatible JSON is preserved as a timestamped `.corrupt` sibling and replaced with a clean seed; bootstrap returns a visible recovery banner with the path and restore command. Retention is capped at five corrupt copies.
- Codex missing/timeouts preserve drafts and return generic actionable errors.
- Foreign Host/Origin requests and missing/invalid launch tokens are rejected before parsing or process spawn.
- Codex prompts normalize, length-bound, and JSON-delimit third-party research text as untrusted data. Runner uses fixed args: ephemeral execution, read-only sandbox, skipped repository check, ignored rules, no shell, private temp directory, owned output file, restricted environment, hard timeout.
- Browser launch accepts fixed browser enum plus item ID only. Server re-reads stored item URL, permits `https:` only, rejects custom/file/javascript schemes, and uses `execFile` with argument arrays, never a shell.
- Legacy Maker `POST /api/research/reply` returns `410 Gone`; no hidden paid endpoint remains after UI moves.
- Rollback: remove compatibility redirect/nav changes and stop standalone server; Maker Compass remains otherwise unchanged.

### Risk-Matched Verification

| Risk | Evidence | Acceptance threshold |
|---|---|---|
| Hidden auth/brand coupling | Import-guard and shell SSR tests | Zero auth/Supabase/Maker shell imports; no Maker wordmark/account controls |
| Same server accidentally reused | Two-listener/process checks plus route probes | Maker responds on 3000; standalone responds on 4310 with independent `.next` lock |
| Anonymous CLI abuse | Request-policy and injection tests | Foreign Host/Origin/token rejected; request body capped; hostile item remains delimited; fixed read-only/no-shell runner |
| State regression | Repository contract tests plus restart/reload UI flow | Items, seen/save/archive/draft/browser state survives server restart; invalid JSON preserved and recovered |
| Responsive overload | Real Chrome screenshots at 1440×900 and 390×844 | No horizontal overflow; first result reachable without desktop rail; controls ≥44px |
| Maker regression | Root typecheck/test/build and `/research` redirect probe | Existing product checks pass; redirect occurs before `/auth` |

## Architecture Improvement Opportunities

- Selected: Independent app root and build output. Benefit: deploy/run/version separately. Trade-off: small duplication of tokens/components. Files: `apps/research-inbox/**`, root scripts.
- Selected: Pure request-policy/payload helpers plus per-launch header token and injected Codex runner seam. Benefit: deterministic security tests without spawning Codex, no cross-port cookie leakage, resistance to loopback cross-site requests. Trade-off: bootstrap request before generation.
- Selected: Independent `package.json` and `package-lock.json`, without root npm workspaces. Benefit: sell/extract app independently and avoid root lock churn. Trade-off: duplicate dependency installation.
- Selected: Fixed browser-mode launcher behind launch-token protection, accepting item ID rather than URL. Benefit: server validates stored HTTPS URL and can open default/Chrome/Safari/Firefox/Arc on macOS without executable or URL injection. Trade-off: named modes degrade to default/unsupported off macOS; posting remains user-confirmed.
- Selected: Brand-neutral versioned local JSON repository with atomic writes and revision checks. Benefit: portable user-owned data, restart durability, no Supabase/browser-storage coupling. Trade-off: single-machine/single-writer product shape.
- Selected: Loopback-only anonymous operator. Benefit: meets no-auth safely. Trade-off: public SaaS needs a later authenticated broker or desktop companion.
- Deferred: Live Last30Days worker and multiple JSON workspace files. Valuable after standalone boundary is proven.
- Deferred: Deleting legacy root research code. Requires explicit file-deletion approval after standalone verification.
- Rejected: Sharing Maker Compass UI/auth modules across app roots. Reduces duplication but violates requested runtime separation.

## Plan

1. Add failing standalone JSON repository, resolved-import isolation, shell, request-policy, prompt-injection, and URL-launch tests.
2. Exclude `apps/**` from root TypeScript/ESLint and nested build artifacts from Git; verify root checks before adding standalone source.
3. Create independent package/lockfile/config, neutral metadata/shell, versioned lockfile-protected atomic JSON repository, responsive UI, finite-batch exhausted state, and corrupt-recovery banner.
4. Add anonymous loopback-only bootstrap/token, revisioned state mutation, `/api/reply`, and fixed-enum/item-ID browser-launch APIs using bounded Codex CLI/OS process execution.
5. Remove Maker Compass menu/title coupling, return `410` from legacy reply API, and add an environment-gated pre-auth `/research` compatibility redirect. Hosted builds never default to loopback.
6. Update setup/system/backend-history/test/UI-verification documentation, including explicit two-server exception and recovery procedure.
7. Run focused tests, standalone/root typecheck/lint/build, two-server probes, real Chrome desktop/mobile evidence, fresh-eyes/code/security review, and remediation.

## Milestones

- Isolation green: standalone tests prove no Maker/auth dependencies.
- Runtime green: app serves anonymously on 4310 and Maker remains on 3000.
- UI green: responsive neutral shell and core triage interactions work.
- Review green: build, browser evidence, security checks, and docs complete.

## Validation

- Standalone Node tests for JSON initialization/atomic persistence/corrupt recovery/revision conflicts, shell markup, request policy, payload bounds, and prompt construction.
- Standalone TypeScript, ESLint, production build, and independent package-lock install.
- Root focused/full checks proportional to touched compatibility files.
- Real Chrome anonymous flow: load, filter, save, archive/restore, browser choice, reload, and “Show next curated batch” until explicit exhausted state. Generate Reply only through real local Codex; never publish externally.
- Evidence in `ui-evidence/2026-08-15/research-inbox-standalone/`.

## Risks And Mitigations

- Public anonymous process execution: refuse non-loopback hosts/origins and bind scripts to 127.0.0.1.
- Duplicated design primitives: keep standalone primitives minimal and documented; do not import Maker runtime modules.
- Port collision: fixed 4310 with clear probe/start instructions. UI policy documents one long-lived Maker server plus one justified standalone server for this task.
- Rate limit: in-memory, 20 reply attempts/hour per process; restart resets it and this limitation is documented/tested.
- Existing dirty worktree: touch only standalone files and narrow compatibility/doc lines.

## Rollback Or Recovery

- Stop port 4310 server.
- Revert root proxy/nav/title compatibility edits.
- Standalone `.local/research-inbox.json` is user-owned and survives rollback; README documents backup/reset.
- No database migration, auth policy, billing, or production data change occurs.

## Open Decisions

- Deleting legacy Maker Compass research route/API/component/lib files remains pending explicit approval.

## Plan Evaluation

- Opposite-model evaluation completed 2026-08-15.
- Accepted all blockers: production-safe environment-gated redirect, explicit secure Codex prompt/flags, stored-item HTTPS validation with fixed process arguments.
- Accepted major findings: transparent old-browser-state non-import, legacy API `410`, root-tool isolation, `.local`/corrupt Git ignores, header-only launch token, cross-process write lock, finite-batch wording/exhausted state, resolved import-graph guard.
- Accepted minor findings: in-memory rate-limit semantics, visible corrupt recovery with bounded retention, documented two-server UI-verification exception.
- Rejected none.

## Critique

### Software Architect

- A sub-app is real runtime isolation only if it owns configuration, build output, imports, metadata, and server process. A route group inside Maker Compass is insufficient.

### Product Manager

- “No auth” improves first-run value, but changes commercial shape from SaaS to local/self-hosted tool until abuse controls exist.

### Customer Or End User

- Neutral branding, immediate loading, and remembered state matter more than account features. Mobile must expose research before a long filter rail.

### Engineering Implementer

- Avoid importing root aliases for convenience; explicit local modules prevent accidental recoupling.

### Risk, Security, Or Operations

- Anonymous hosted Codex spawning is unacceptable. Loopback binding and strict request policy are hard requirements, not optional hardening.

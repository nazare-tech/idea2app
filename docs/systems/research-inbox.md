# Research Inbox
Standalone, unauthenticated, local-first research triage website served from `apps/research-inbox` on loopback port 4310.
The site reuses Maker Compass's warm editorial visual language but owns a neutral identity, package, server, APIs, data, and build output.
The Maker Compass problem statement is seed content only; no Maker header, account chrome, auth, Supabase, billing, or project dependency crosses the package boundary.
All durable research items, seen/save/archive state, reply drafts/outcomes, generated article drafts, visible batches, and browser choice live in `.local/research-inbox.json`.
Research-run status lives in `.local/research-run.json`; neither file uses Supabase.
Reply and article generation run bounded local Codex CLI processes; posting remains a user-controlled copy-and-open handoff.

Coverage numbers are cumulative: “results scanned” counts all raw candidates reported across research runs, while “curated cards” counts validated, deduplicated evidence currently available in the inbox. The initial seed preserves 56 scanned results in `docs/research/software-builders-generating-faster-but-lacking-validation-product-direction-and-a-deliberate-first-version-raw-maker-compass-seed-2026-08-15.md` and curates 10 into cards.

---

## Runtime boundary

- URLs: `http://localhost:4310/` and `http://127.0.0.1:4310/`
- Package: `apps/research-inbox/package.json` with an independent lockfile
- Build/runtime: independent Next.js app; root TypeScript and ESLint explicitly exclude `apps/`
- Access: loopback host only, same-origin mutation requests only, no authentication
- Compatibility: Maker Compass `POST /api/research/reply` returns `410 Gone`; `/research` redirects when `RESEARCH_INBOX_URL` is configured and otherwise renders a local-app handoff notice
- Old Maker research files remain inactive pending explicit deletion approval

## JSON persistence

`apps/research-inbox/src/lib/research/repository.ts` owns `.local/research-inbox.json`. The versioned document contains workspace metadata, sanitized evidence, item-state deltas, optional article drafts, visible IDs, browser mode, revision, and update time. It never contains a Supabase user/project ID.

Writes use a private directory/file mode, a PID/nonce-owned exclusive cross-process lock with orphan recovery, an on-disk revision check, a 2 MB serialized-size guard, and temp-file rename. Stale generic writers receive `409` and reload. Article generation saves under the repository lock before returning, preventing a long generation from being lost to a client revision conflict. The full persisted schema is validated; invalid JSON or malformed nested data is renamed to a timestamped `.corrupt-*` backup, with at most five retained, before a clean seed is restored and the UI shows a recovery notice.

Older port-3000 `localStorage` keys are not imported. The first-run banner says so explicitly.

Adaptive ranking affects only newly revealed items:

- replied tags: +8
- saved tags: +4
- archived tags: -6

## Local API and process safety

Bootstrap issues a 12-hour signed token held in page memory. The signing secret is a private operational file at `.local/launch-secret`; it is not research data and never enters the browser. Mutation routes require an allowed loopback Host, an exactly matching Origin, plus the token header.

`POST /api/reply` accepts only a stored item ID. The server re-reads the item, length-bounds and JSON-delimits it as untrusted data, then starts Codex with fixed arguments: ephemeral execution, read-only sandbox, no approvals, web search disabled, ignored repository rules, private temporary directory, restricted environment, bounded output, and a hard timeout. Reply guidance requires a concrete contribution rather than agreement, praise, or summary. Server normalization enforces fewer than 100 words and no em dash. There is no reply character cap in persistence or the editor; the request and total-document byte guards remain technical safety boundaries.

`POST /api/article` accepts a stored item ID and optional explicit replace flag. The server re-derives article eligibility from a normalized `web` item and rejects known social/post hosts. It runs Codex without web access against JSON-delimited untrusted evidence, requests an original 850–1,050-word plain-text website article, rejects invented quotations/statistics/experience, parses exact JSON-only title/deck/body output, adds a server timestamp, and atomically saves the draft before responding. Existing drafts require explicit regeneration to replace. The centered native-dialog sheet renders text without HTML, supports Escape/close/copy, restores trigger focus, and fits desktop and mobile viewports.

The in-memory generation limit resets when the server restarts: replies allow 20/hour per launch token and articles allow 10/hour in a separate bucket.

`POST /api/open-source` accepts only a stored item ID and fixed browser enum. The server re-reads an HTTPS-only URL and invokes a fixed executable with argument arrays and no shell. The app never claims a public reply succeeded; it records an unknown outcome until the user marks it replied.

### Last-30-days reruns

The header action starts `POST /api/research-job` and polls `GET /api/research-job` only while its durable status is queued, running, or importing. Both routes require loopback Host and a valid launch token; POST also requires the exact same Origin and accepts only an empty JSON object. The research topic always comes from the server-owned workspace document.

One active job is allowed across processes. Codex CLI runs ephemerally in a private temporary directory with a fixed operator prompt, invokes the installed last30days skill in quick agent mode, includes X when its browser-cookie adapter is available, and times out after 10 minutes. Its final JSON is untrusted: the importer applies byte, count, source, string, tag, and HTTPS URL bounds before a locked merge. The job ID fences every transition; each merge records one of at most 100 recent idempotent receipts so a completion-write failure reconciles without double-counting a rerun. Merge deduplicates by canonical URL and stable ID, preserves case-sensitive URL paths, keeps every existing item and user state, and reveals up to six new cards.

The optional `RESEARCH_CODEX_PATH` and `RESEARCH_LAST30DAYS_SKILL_PATH` environment variables make the local executable and installed skill location configurable. Runtime `.local` data is excluded from standalone build tracing.

## Commands and verification

```bash
npm run research-inbox:dev
npm run research-inbox:typecheck
npm run research-inbox:lint
npm run research-inbox:test
npm run research-inbox:build
```

Tests cover JSON initialization/persistence/conflicts/recovery, long reply persistence, article eligibility/parsing/atomic save, Codex output and timeout bounds, source-specific card actions, dialog semantics, strict loopback policy, hostile prompt delimiting, HTTPS launch policy, neutral shell identity, and recursive source-graph isolation from Maker/Supabase imports. Article Studio browser evidence is under `ui-evidence/2026-08-15/research-inbox-article-studio/`.

# Review: Standalone Research Inbox

## Outcome

Implemented the evaluated plan as an independent app under `apps/research-inbox`, served on `127.0.0.1:4310`. It has no Maker Compass header/account UI, no auth, no Supabase import or request path, and no root source dependency. Maker Compass appears only in the seeded research workspace content.

## Persistence and migration

- Durable data: `apps/research-inbox/.local/research-inbox.json` (`0600`), inside a private local directory
- Operational signer: `.local/launch-secret` (`0600`); not research data and never returned to the browser
- No Supabase research rows existed or were created, so no Supabase deletion was necessary
- Old port-3000 browser state is intentionally not imported; the first-run UI says so
- Old Maker research implementation files remain inactive pending explicit deletion approval

## Verification

Automated:

- `npm --prefix apps/research-inbox test` — 10/10 passed, including simultaneous bootstrap and recursive import-graph isolation
- `npm --prefix apps/research-inbox run typecheck` — passed
- `npm --prefix apps/research-inbox run lint` — passed
- `npm --prefix apps/research-inbox run build` — passed; only standalone page plus four standalone APIs emitted
- `node --import tsx --test src/app/api/research/reply/route.test.ts` — passed; legacy endpoint is `410`
- `npm run typecheck` — passed
- `npm run lint` — passed with two unrelated existing warnings
- `npm audit --prefix apps/research-inbox --audit-level=moderate` — 0 vulnerabilities
- Live HTTP probes: canonical bootstrap `200`; foreign Host `403`; missing launch token `403`; old Maker reply API `410`
- JSON and signing-secret file modes verified `0600`

Real UI:

- Route: `http://127.0.0.1:4310/`
- Desktop Chrome: neutral header, local/JSON status, persisted research feed and browser choice
- Mobile Chrome: 390×844; `scrollWidth === clientWidth === 390` after fixing filter-rail overflow
- Workflow: save item → Saved filter shows one result → choose Chrome → reveal next adaptive batch → full reload preserves save/browser/nine visible items
- Real Codex CLI generation completed in 20.8 seconds and produced an editable JSON-persisted draft
- No automatic public post was performed; “Post reply” is a copy/open handoff and outcome remains unknown until the user confirms it

Evidence:

- `ui-evidence/2026-08-15/research-inbox-standalone/chrome-desktop.png`
- `ui-evidence/2026-08-15/research-inbox-standalone/chrome-mobile.png`
- `ui-evidence/2026-08-15/research-inbox-standalone/reply-generated.png`

The existing Maker server on port 3000 belonged to the surrounding workspace and was not stopped. This task owns the separate, required port-4310 server and leaves it running for the user.

## Security review

- Strict canonical loopback Host/Origin validation precedes mutation parsing
- Signed 12-hour token is header-only and held in page memory
- Request bodies, stored drafts, JSON size, and process output are bounded
- Untrusted research is control-normalized and JSON-delimited before Codex
- Codex uses fixed args, no shell, private temp directory, read-only/no-approval mode, disabled web search, restricted environment, process-group timeout, and cleanup
- Browser launch takes item ID plus fixed enum, re-reads stored HTTPS URL, and uses fixed executable argument arrays with no shell
- CSP, frame denial, MIME sniffing denial, referrer, and permissions headers are set
- Recursive source scan proves no Maker/Supabase import crossing

Accepted operational limitation: the local 20/hour reply limiter resets on server restart. Public hosting remains out of scope until an abuse, cost, and identity boundary is designed.

## Findings fixed during verification

1. Next inferred the parent repository and compiled Maker proxy code; fixed by pinning the standalone build root.
2. Turbopack CSS worker failed on the current Node 23 environment; switched this plain-CSS package to supported Webpack builds.
3. In-memory launch tokens did not cross independently bundled API routes; replaced with signed tokens backed by a private local key.
4. Mobile filter rows caused document-level horizontal overflow; contained them and verified exact 390px width.
5. Simultaneous first bootstraps shared a timestamp temp filename; changed to UUID temp names and added concurrency coverage.

## Remaining product boundary

“Show next curated batch” reveals the finite sanitized research pass and adapts its ranking from saved/replied/archived feedback. It does not yet run a new `/last30days` network crawl. That ingestion service is the next independent feature, not something the UI falsely claims today.

# Research Inbox rerun review

## Outcome

Implementation adds a single-flight Codex CLI research job, a strict last30days JSON import boundary, an atomic state-preserving merge, and an accessible header control with active-only polling.

The opposite-CLI plan evaluation was attempted and failed because its API hostname could not resolve (`ENOTFOUND`). This work is externally unevaluated; the outage is not counted as review coverage.

## Security and architecture review

- The browser supplies only `{}`. Topic, skill path, Codex arguments, sandbox, working directory, output path, and timeout are server-owned.
- Loopback Host, same Origin for POST, and the signed launch token gate the endpoint. This remains a local tool and must not be exposed publicly.
- Codex runs without a shell in a private temporary directory. Full local sandbox access is necessary for authenticated browser-cookie research, so the fixed prompt treats retrieved material as evidence and forbids repository edits.
- Import is JSON-only and bounded by bytes, counts, strings, tags, known normalized sources, HTTPS URLs without credentials, stable IDs, and canonical URL deduplication.
- Single-flight uses a private atomic JSON file and exclusive lock. Job-ID fencing prevents a stale runner from overwriting a newer run.
- Merge holds the existing inbox lock, preserves all prior cards and interaction state, and writes only after the full import validates.
- Runtime `.local` content is excluded from standalone output tracing so research data and the launch secret are not copied into production artifacts.

## Verification

- `npm test`: final 24/24 passed, including merge preservation and fixed-prompt coverage.
- `npm run typecheck`: passed.
- `npm run lint`: initial failure was one `prefer-const` error plus two unused-variable warnings; all were corrected before final verification.
- `git diff --check`: passed.
- Real Chrome, `http://127.0.0.1:4310/`, normal desktop viewport: the header action loaded enabled, changed to disabled `Research running` within 400 ms, and announced `Codex is searching the last 30 days…` through a live status region.
- The live run completed in 2 minutes 51 seconds, scanned 6 additional raw candidates, imported 3 new deduplicated cards, reported 0 import warnings, preserved prior interaction state, and refreshed the page from 56/10 to 62/13 scanned/curated.
- X authentication had passed a direct browser-cookie probe before this run, but this pass produced no usable X result. The UI now distinguishes “no usable results” from an authentication failure; the Codex prompt requires an X attempt through the configured adapter.
- Final production build passed from an isolated copy so the already-running local site stayed available. Inspection found no `research-inbox.json`, `research-run.json`, or `launch-secret` beneath `.next/standalone`.
- The page produced no application console error. Chrome recorded three identical extension message-channel errors during extension reconnect; these were browser-extension noise, not emitted by the app.
- Evidence: `ui-evidence/2026-08-15/research-inbox-rerun/01-ready.png`, `02-running.png`, `03-complete.png`, and `04-final.png`.

## Remaining risk

The background promise belongs to the local Next server process. A process exit interrupts it; stale-job recovery exposes a retry instead of attempting distributed resume. This is acceptable for the documented local-only runtime.

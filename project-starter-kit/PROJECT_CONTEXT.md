# PROJECT_CONTEXT.md — System Docs Index
{{ONE SENTENCE: WHAT THIS PRODUCT IS AND WHO IT IS FOR}}
Stack: {{CLIENT}}, {{SERVER}}, {{DATABASE/STORAGE}}, {{AUTH}}, {{KEY EXTERNAL SERVICES}}, {{RUNTIME/DEPLOY TARGET}}.
This file is only an index: system detail lives in docs/systems/, one doc per area, each with a 7-line greppable header (docs/operating-system/doc-conventions.md).
Discovery: `head -7 docs/systems/*.md` skims every system in one screen; `grep -ril <keyword> docs/systems/` finds the owning doc; open only what the task needs.
Self-healing rule: a change that alters behavior described in a docs/systems/ doc must update that doc in the same commit; new systems get a new doc plus a row in this index.
Agent workflow rules (planning, UI verification, reviews, sweeps) live in AGENTS.md (router) and docs/operating-system/; they are deliberately not in this index.
---

**Last updated:** {{YYYY-MM-DD}}
**Project:** {{NAME}}
**Owner:** {{TEAM OR PERSON}}

## How to use this file

Replace the seven header lines above with real facts before the first feature commit. Then create system docs from `docs/systems/_TEMPLATE.md`, one at a time, as the project grows behavior worth documenting. Delete rows that will never apply; add rows this list does not anticipate. An accurate short index beats a complete inaccurate one.

## Index

| Doc | Covers | Create when |
|---|---|---|
| `docs/systems/product-overview.md` | What the product does, primary user flows, in-scope surfaces, non-goals, success measures. | Before the first feature. |
| `docs/systems/architecture.md` | System boundaries, layering, request/data flows, key patterns, sources of truth and their invariants. | Before the first feature. |
| `docs/systems/tech-stack.md` | Dependency tables with versions and purpose; runtime, package manager, build tooling, version pins. | Before the first feature. |
| `docs/systems/setup-and-build.md` | Prerequisites, environment variable **names**, install, local services, migrations/seeding, dev/test/lint/typecheck/build commands, deploy. | Before the first feature. |
| `docs/systems/coding-conventions.md` | Naming, file/module structure, error shape, typing patterns, styling tokens, path aliases. | Once two people or two agents touch the code. |
| `docs/systems/directories-and-key-files.md` | Directory purpose map and the load-bearing files an agent must not miss. | Once the tree stops being obvious. |
| `docs/systems/database-schema.md` | Tables/collections, fields, relationships, ownership and row-level access rules, retention. | With the first persisted data. |
| `docs/systems/api-endpoints.md` | Route-by-route reference: method, auth, request/response shape, timeouts, error codes. | With the first API surface. |
| `docs/systems/{{OTHER SYSTEM}}.md` | {{BILLING, QUEUES, ANALYTICS, INTEGRATIONS, TROUBLESHOOTING: whatever this project actually runs}} | When it exists. |

## Sources of truth

| Concern | Durable source | Readers/writers | Invariants |
|---|---|---|---|
| {{CONCERN}} | {{STORE/FILE/SERVICE}} | {{BOUNDARIES}} | {{RULES}} |

Keep this table here (not in a system doc): it is the fastest answer to "where does this data really live?" and every system doc should agree with it.

## Related non-system docs

- `AGENTS.md` — router for all agent rules; start there.
- `docs/operating-system/` — planning workflow, UI verification, review personas, doc conventions, analytics, transcript and issue-tracker formats.
- `brand/brand.md` — canonical positioning, voice, messaging, and visual-direction foundation.
- `marketing/` — repository-local idea captures, drafts, campaigns, and research.
- `docs/testing/` — test inventory and e2e guide.
- `docs/plans/` — per-task plan/review artifacts, `recommendation-selection-rules.md`, `backend-change-history.md`.
- `docs/reviews/` — cross-commit sweep reports and the sweep marker.

## Known constraints and decisions

- {{CONSTRAINT, ADR LINK, OR DEFERRED RISK WITH TRACKING LINK}}

# PROJECT_CONTEXT.md — System Docs Index
Maker Compass is an AI-powered SaaS that turns business ideas into structured planning documents (Market Research, Product Plan, First Version Plan, AI Prompts) and design mockups.
Stack: Next.js 16 App Router, React 19 RSC, TypeScript, Tailwind 4, Supabase (Postgres/auth/RLS/storage), OpenRouter (+ managed Exa, Perplexity/Tavily fallback), Stripe, Sentry.
This file is only an index: the former monolith was split 2026-07-11 into docs/systems/, one doc per area, each with a 7-line greppable header (docs/operating-system/doc-conventions.md).
Discovery: `head -7 docs/systems/*.md` skims every system in one screen; `grep -ril <keyword> docs/systems/` finds the owning doc; open only what the task needs.
Self-healing rule: a change that alters behavior described in a docs/systems/ doc must update that doc in the same commit; new systems get a new doc plus a row in this index.
Agent workflow rules (planning, UI verification, reviews, sweeps) live in AGENTS.md (router) and docs/operating-system/; they are deliberately not in this index.
---

**Last Updated**: 2026-07-11 (monolith split into `docs/systems/`)

## Index

| Doc | Covers |
|---|---|
| [docs/systems/product-overview.md](docs/systems/product-overview.md) | What the product does: intake wizard, planning documents, mockups, composer, analytics, pricing model, user workflow. |
| [docs/systems/tech-stack.md](docs/systems/tech-stack.md) | Frontend/backend/dev-tooling dependency tables with versions and purposes; build and runtime notes, Node pinning. |
| [docs/systems/architecture.md](docs/systems/architecture.md) | RSC layering, auth/intake/analysis/generate-all data flows, workspace layout, shared UI architecture, key design patterns, intake data model. |
| [docs/systems/directories-and-key-files.md](docs/systems/directories-and-key-files.md) | Directory purpose map, prompt architecture (`src/lib/prompts/`), Market Research v2 contract, security rules, key files reference. |
| [docs/systems/coding-conventions.md](docs/systems/coding-conventions.md) | File/code naming, component structure, styling conventions, error handling, TypeScript patterns, path aliases. |
| [docs/systems/setup-and-build.md](docs/systems/setup-and-build.md) | Prerequisites, environment variables, installation, Supabase setup, dev/build/lint/test commands, git and PR workflow, deployment, scripts reference. |
| [docs/systems/database-schema.md](docs/systems/database-schema.md) | Core tables (projects, project_intakes, analyses, prds, mvp_plans, generation_queues/items, product_events, plans/plan_prices, waitlist...). |
| [docs/systems/api-endpoints.md](docs/systems/api-endpoints.md) | Route-by-route API reference: auth, intake, projects, analysis, generate-all, mockups, Stripe, dev prompt lab, deprecated 410 routes. |
| [docs/systems/credits-and-billing.md](docs/systems/credits-and-billing.md) | Credit costs and ledger, project allowances, subscription plans, Stripe integration details. |
| [docs/systems/dev-tasks-and-troubleshooting.md](docs/systems/dev-tasks-and-troubleshooting.md) | Common development tasks (adding pages/endpoints/tables) and troubleshooting playbook. |

## Related non-system docs

- `AGENTS.md` — router for all agent rules; start there.
- `docs/operating-system/` — planning workflow, UI verification, review personas, doc conventions, analytics taxonomy, transcript/Linear formats.
- `docs/testing/test-inventory.md` — every unit test file and what it verifies; `docs/testing/e2e-guide.md` — Playwright suite.
- `docs/plans/` — per-task plan/review artifacts and `backend-change-history.md`.

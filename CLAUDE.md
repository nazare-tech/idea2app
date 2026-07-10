# Claude Code Project Instructions

## Source of Truth: AGENTS.md
**IMPORTANT:** Read `AGENTS.md` in the repo root before responding to every message. It is the single source of truth for project rules: primary context (`PROJECT_CONTEXT.md`), rules, workflow (plan files in `docs/plans/`, `/holistic-implementation`, Recommendation A selection, architecture improvement opportunities, backend-change-history), transcript sanitization, Linear evidence rules, UI verification and `ui-evidence/` screenshot requirements, standardized intake test cases, and the skills list.

Notes when applying `AGENTS.md` as Claude Code:
- It is written addressing "Codex"; every rule applies equally to Claude Code.
- Where it names Codex-specific tooling (Codex Chrome plugin, `agent.browsers.list()`, Codex in-app browser), use the Claude Code equivalents (claude-in-chrome MCP tools, Browser preview tools). The intent — real Chrome, real local dev server, real auth via `.env.e2e.local`, evidence saved under `ui-evidence/<date>/<task-slug>/` — is unchanged.

This file adds only the Claude-specific design context below. If `AGENTS.md` and this file conflict, ask which one wins.

## Design Context
Before any UI / visual / motion / copy work, also read:
- `PRODUCT.md` — register, users, voice, anti-references, design principles.
- `DESIGN.md` — visual system: colors, typography, components, do's and don'ts.
- `DESIGN.json` — sidecar with tonal ramps, motion tokens, and component snippets.

Quick reference for the five strategic principles:
1. **Practice what you preach.** Quick, clear, decisive interface; no overwrought UI.
2. **Show the work, don't sell it.** No "Powered by AI" badges, gradient logos, or marketing flourishes the product can't back up.
3. **Bias to the next action.** Every screen makes the next step obvious.
4. **Restraint with one decisive accent.** Tinted neutrals + Action Red (`#DC2626`) at ≤10% of any screen.
5. **Type and structure are the brand.** Strong scale contrast, deliberate tracking, no flat hierarchies.

Visual idioms to match:
- Sharp corners on landing surfaces; gently rounded inside `/(dashboard)`.
- Ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)` for entrance motion. No bounce.
- IBM Plex Mono UPPERCASE with `letter-spacing: 0.18em` for kicker labels and metadata.
- No em dashes in copy. Use commas, colons, semicolons, periods, or parentheses.

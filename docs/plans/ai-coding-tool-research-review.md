# Review: AI Coding Tool Research Database

## Scope
- Created `docs/research/ai-coding-tools-handoff-database.md`.
- Created `docs/plans/ai-coding-tool-research-plan.md`.
- Originally covered the broader landing-page logo set, then narrowed the active handoff database on 2026-07-01 to the product-facing recommendation set: Cursor, Claude Code, Codex, GitHub Copilot, Devin, Cline, Warp, Lovable, v0, Bolt, Replit, and Gemini Code Assist.

## Active Recommendation Coverage Check
| Active handoff tool | Research database entry |
|---|---|
| Cursor | Cursor |
| Claude Code | Claude Code |
| Codex | OpenAI Codex |
| GitHub Copilot | GitHub Copilot |
| Cline | Cline |
| Warp | Warp |
| Devin | Devin |
| Lovable | Lovable |
| v0 | v0 |
| Bolt | Bolt |
| Replit | Replit |
| Gemini | Gemini Code Assist |

## Verification
- Read `PROJECT_CONTEXT.md` before planning and research.
- Confirmed the landing-page handoff list in `src/app/page.tsx`.
- Confirmed the AI Prompts handoff surface is product-agnostic and renders generic build sections.
- Fetched official pricing/source pages for the core tools where possible.
- Read the generated markdown end-to-end with `sed`.
- Checked document size with `wc -l`.
- Searched the generated docs for unfinished markers and intentionally retained uncertainty notes where live pricing could not be reliably extracted from JavaScript-heavy pages.

## Fresh-Eyes Self Review
- Pass 1: Checked that every active handoff tool appears in the summary matrix and detailed profiles.
- Pass 2: Added community/risk source links for pricing backlash, PR acceptance research, MCP prompt-injection risk, and execution-cost research.
- Pass 3: Rechecked the narrowed scope after the product decision to keep only active handoff tools in the database.

## Code Review Findings
- No code changed.
- Documentation risk: some prices are exact and dated; some JavaScript-heavy pages could not be cleanly extracted. Status: mitigated by marking those entries as "check live" instead of inventing numbers.

## Security Review Findings
- No app behavior, auth, RLS, secrets, or backend code changed.
- Research recommendation risk: handing off to cloud tools can expose private code or business data. Status: mitigated by recommending BYOK/local/editor/enterprise-governed tools for regulated or private-code contexts.

## Remediation Checklist
- [x] Add source links for official pricing.
- [x] Label anecdotal community feedback as non-quantitative.
- [x] Add explicit recommendation rules by platform/backend/security context.

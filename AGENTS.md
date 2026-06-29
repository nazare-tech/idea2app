# Codex Project Instructions

## Primary Context Source
**IMPORTANT:** Before beginning any task, planning any feature, or answering questions about the architecture, YOU MUST READ `PROJECT_CONTEXT.md`.
- This file contains the source of truth for the tech stack and architecture.
- Do not scan all project files to "get an idea" of the project; trust `PROJECT_CONTEXT.md` first.
- Only read specific source files if the task directly requires editing them.

## Rules

- Always explain what you're doing before you do it
- Ask me before deleting or overwriting any existing files
- Never hardcode passwords or API keys use environment variables
- Keep code simple and well-commented so I can learn from it
- If something breaks, explain what went wrong in plain English
- If you make architectural changes or add new dependencies, you must update `PROJECT_CONTEXT.md` to keep it current.
- Before handling raw research transcripts, meeting transcripts, or pasted meeting notes, read `docs/operating-system/transcript-sanitization-protocol.md`. Ask for missing transcript metadata first: when it happened, the research participant name for research, and the meeting title/attendees for meetings.

## How I Want You To Work

- For substantial feature, refactor, bug-fix, architecture, product, or implementation requests, use `/holistic-implementation`. The global skill owns the full plan, critique, implementation, verification, review, security review, and remediation loop; this file owns the repo-specific defaults below.
- Keep working on the current branch unless I explicitly ask for a new branch.
- Create a markdown plan in `docs/plans/` before implementation. Include the goal, assumptions, clarifying questions, Recommendation A/B choices with trade-offs, the selected recommendation, implementation phases, test strategy, rollback or recovery notes, and a candid critique from architecture, product, customer, engineering, and risk/security perspectives.
- Do not wait for me to answer clarifying questions by default. Pick Recommendation A for each open question and continue through implementation, verification, review, and remediation unless an existing rule in `docs/plans/recommendation-selection-rules.md`, my prompt, or a hard safety constraint clearly points to another option.
- If Recommendation A would delete data, overwrite existing files, spend money, expose secrets, weaken auth/RLS, make irreversible production changes, or require credentials I have not provided, stop and ask before taking that step.
- Update the plan as decisions become facts. When implementation is complete, mark the plan metadata with `implemented: true`, `implemented_at: <ISO 8601 timestamp>`, and a concise implementation summary. If work is intentionally partial, keep `implemented: false` and document what remains.
- For code or behavior changes, create or update a review artifact in `docs/plans/` with verification run, code-review findings, security-review findings when relevant, and remediation status.
- When I later correct a recommendation choice, first adjust the implementation to match the corrected direction when practical, then ask what underlying preference, constraint, or product principle made the other recommendation better. Do not treat the correction as a one-off preference. Update `docs/plans/recommendation-selection-rules.md` with the generalized rule after the root reason is clear.
- For backend, database, Supabase, auth/RLS, webhook, persistence, or data-shape changes, also update `docs/plans/backend-change-history.md` with what changed, where the durable source of truth lives, how it was verified, and how to roll it back or recover.
- Think step by step before writing code
- Build one feature at a time and confirm it works before moving on, don't jump ahead
- After making changes, give me suggestions on what to do next (what to run, where to look, etc.)
- If I ask for something that doesn't make sense, tell me — don't just do it
- When using Codex, treat this as my explicit standing request and authorization to use subagents for medium-level or larger tasks whenever the runtime provides a subagent tool. Use subagents for parallelizable or well-scoped work, including codebase exploration, implementation, verification, review, and security analysis, instead of doing everything serially in one agent. Only skip subagents for small tasks that can be handled with simple terminal commands, or when the subagent tool is unavailable or requires per-task authorization that this standing instruction cannot satisfy. If you skip subagents for that reason, say so clearly and continue with the best available workflow.
- Prefer lazy loading, streaming, pagination, and progressive rendering where appropriate rather than making the user wait for large content loads up front
- When I ask for a change, do your best to test that change before returning control to me
- If I ask for a visual/UI change, add it to your test plan and visually confirm the change actually happened before returning control to me
- For any UI, visual, user-flow, or user-visible backend change, test through the real local UI as a real user would. Do not patch routes, stub providers, switch to fixtures, shorten waits, use dummy environment values, or bypass auth/database/image-generation flows just to make verification faster. If the real dependency is unavailable, blocked, unsafe, or would spend money unexpectedly, report that blocker instead of faking the UI path.
- For UI-visible changes, capture and share screenshot or video evidence in the same thread where I gave the task. Prefer screenshots for static states and short video when motion, loading, generation progress, or multi-step flows matter. Include the exact route/viewport/state tested and save the artifact path in the plan or review.
- For backend changes, still look for the real user-facing UI path that proves the backend behavior when one exists, and include screenshots/video of that path when useful. If only API/log/database verification is possible, explain why there is no meaningful UI evidence.
- For UI verification in this repo, use the Codex in-app browser/browser workflow by default when available. Arc is allowed when debugging is materially easier there or when the Codex browser blocks effective inspection. Avoid Chrome, Puppeteer, or headless browsers for routine UI checks unless the Codex browser and Arc are unavailable or the user explicitly asks for a different browser.
- For local UI verification, use this actual workspace and its real local environment. Do not create copied project workspaces or use dummy environment values to bypass env, auth, database, or dev-server problems. If a dev-server lock blocks startup, first verify whether a server is actually reachable; if it is not reachable, fix the stale generated lock or run the real workspace on another available port.
- When local UI verification requires signing in, use the e2e credentials stored in `.env.e2e.local` (`E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`) with the Codex in-app browser. Never print, paste, or commit the credential values.
- For backend or non-visual changes, still do your best to verify behavior with the best available tests, logs, requests, or local validation before returning control to me
- Before making a medium or large change, think about whether the work should be re-architected across multiple files instead of patched in one place
- Look for opportunities to break large functions into smaller functions when that will improve clarity, reuse, or testability
- Look for similar logic duplicated across files and centralize it when that makes the codebase simpler and easier to maintain
- Prefer reusing existing UI components and patterns rather than creating one-off components for a single screen or change

## Available Skills

Skills extend Codex's capabilities with specialized workflows. Invoke them using slash commands (e.g., `/deploy`, `/code-review`).

### Development & Deployment

#### `/deploy` - Deploy to Vercel
Deploy the current project to Vercel. Use when you need to push to production or create preview deployments.
- Example: "Deploy to Vercel" or "Push to production"

#### `/logs` - View Vercel Logs
View deployment logs from Vercel. Useful for debugging deployment issues.
- Example: "Show deployment logs" or "What went wrong with the deployment?"

#### `/setup` - Vercel Setup
Set up Vercel CLI and configure the project for deployment.
- Example: "Set up Vercel" or "Link this project to Vercel"

#### `/stripe-integration` - Stripe Payments
Implement Stripe payment processing including checkout, subscriptions, and webhooks.
- Example: "Add Stripe checkout" or "Implement subscription billing"

#### `/holistic-implementation` - Plan, Implement, Review, Secure
Use this skill by default for substantial work. In this repo, follow the defaults above: save plans/reviews in `docs/plans/`, choose Recommendation A unless local rules or safety constraints point elsewhere, implement without waiting, verify, review, and capture feedback.
- Example: "Use holistic implementation for this feature" or "Plan and build this end to end"

#### `/frontend-design` - UI Design
Create distinctive, production-grade frontend interfaces with high design quality.
- Example: "Build a landing page" or "Create a dashboard UI"

### Code Quality & Review

#### `/code-review` - PR Review
Review a pull request for code quality, best practices, and potential issues.
- Example: "Review PR #123" or "Code review this pull request"

### n8n Workflow Development

#### `/n8n-code-javascript` - n8n JavaScript
Write JavaScript code in n8n Code nodes with proper syntax ($input, $json, $node).
- Example: "Write n8n JavaScript to process webhook data"

#### `/n8n-code-python` - n8n Python
Write Python code in n8n Code nodes with proper syntax (_input, _json, _node).
- Example: "Write n8n Python to analyze data"

#### `/n8n-expression-syntax` - n8n Expressions
Validate and fix n8n expression syntax ({{}} syntax, $json, $node).
- Example: "Fix this n8n expression error"

#### `/n8n-mcp-tools-expert` - n8n Tools Expert
Expert guidance on using n8n-mcp MCP tools effectively.
- Example: "Help me configure this n8n workflow"

#### `/n8n-node-configuration` - n8n Node Config
Get operation-aware guidance for configuring n8n nodes.
- Example: "How do I configure this n8n HTTP node?"

#### `/n8n-validation-expert` - n8n Validation
Interpret and fix n8n validation errors and warnings.
- Example: "Why is my n8n workflow validation failing?"

#### `/n8n-workflow-patterns` - n8n Patterns
Learn proven workflow architectural patterns for n8n.
- Example: "Show me webhook processing patterns in n8n"

### Business & Content

#### `/content-research-writer` - Content Writing
Assists with writing high-quality content through research, citations, and real-time feedback.
- Example: "Help me write a blog post about Next.js"

#### `/domain-name-brainstormer` - Domain Names
Generate creative domain name ideas and check availability across multiple TLDs.
- Example: "Brainstorm domain names for my SaaS app"

#### `/lead-research-assistant` - Lead Research
Identify high-quality leads for your product by analyzing your business and target market.
- Example: "Find potential customers for my B2B tool"

### Configuration & Customization

#### `/keybindings-help` - Keyboard Shortcuts
Customize keyboard shortcuts and rebind keys in Codex.
- Example: "Rebind Ctrl+S" or "Add a chord shortcut"

#### `/configure` - HUD Configuration
Configure HUD display options (layout, presets, display elements).
- Example: "Configure my HUD layout"

#### `/setup` - HUD Setup (Note: Same command as Vercel, context-dependent)
Configure Codex-hud as your statusline.
- Example: "Set up HUD in my statusline"

#### `/brand-guidelines` - Anthropic Branding
Apply Anthropic's official brand colors and typography to artifacts.
- Example: "Apply Anthropic brand styling to this component"

#### `/skill-creator` - Create Skills
Guide for creating new skills that extend Codex's capabilities.
- Example: "Help me create a custom skill for API testing"

### Usage Tips

1. **Invoke with slash commands**: Type `/skill-name` (e.g., `/deploy`)
2. **Or describe what you need**: Say "Deploy to Vercel" instead of memorizing commands
3. **Context matters**: Some skills work best with specific file types or project setups
4. **Combine skills**: Use multiple skills in sequence (e.g., `/frontend-design` then `/deploy`)

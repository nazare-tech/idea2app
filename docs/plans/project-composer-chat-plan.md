---
implemented: true
implemented_at: 2026-07-06
implementation_summary: >
  Shipped on feature/project-composer-chat. New streaming route
  POST /api/projects/[id]/composer (auth + ownership + rate limits, no DB
  writes, no credits) calls OpenRouter with the web-search plugin over the
  latest saved documents for the requested scope. New ProjectComposer
  command-bar component mounted over the workspace scroll area with
  scroll-tracked section scope, suggestion chips, streamed markdown answers,
  scope toggle, New reset, Escape collapse, and the ephemeral-session note.
  Prompt added at src/lib/prompts/project-composer.ts. Verified in the browser
  against a real project: grounded doc summary answer and a live web-search
  answer (2026 competitor tools) both streamed correctly; tsc/lint clean.
---

# Project Composer ("Ask this project") Chat

Branch: `feature/project-composer-chat` (kept off `main`; MVP evaluation spike)
Design source: claude.ai/design project `961c13a1-dfe9-4434-8c2a-2e4d8da88179`, file `Project Composer v3.dc.html`

## Goal

Implement the v3 Project Composer from the design file: a floating "Ask this project" chat bar over the project workspace. Users ask questions about their generated documents; answers come from OpenRouter with live web search available. Sessions are ephemeral (never saved, read-only, no document edits), matching the design's session note. Backend changes stay minimal so `main` is unaffected: one new API route, no schema changes, no credit consumption.

## Assumptions

- General chat (`/api/chat`) stays `410 Gone`; the composer is a new, separate, deliberately-scoped surface.
- Ephemeral by design: conversation lives only in client state (the design says "This session isn't saved / History off / Read-only").
- OpenRouter web search uses the `web` plugin (`plugins: [{ id: "web" }]`), which works with any OpenRouter model; no new API keys (reuses `OPENROUTER_API_KEY`).
- Command-bar form factor only (the design default). `full-width` and `docked-pill` variants are design-tool props, not needed for the MVP evaluation.
- No credits/allowance charge: this is a read/QA surface, cheap relative to document generation; rate limiting bounds abuse.

## Clarifying Questions

### 1. Streaming vs. single response

- **A (Recommended): Stream plain text chunks.** Route pipes OpenRouter's SSE deltas into a plain text `ReadableStream`; client appends into the answer bubble. Chat feels dead without it. Trade-off: slightly more route code, no JSON envelope on success.
- **B: Non-streaming JSON.** Simplest, but 10-30s of "Reading your project" dots before a wall of text.
- **Selected: A.**

### 2. Where scope context comes from

- **A (Recommended): Server re-reads documents from Supabase per request.** Client sends only `{ message, scope, docKey, history }`; server loads the latest saved docs for that scope. Trusted context, small request bodies, no client-tamperable doc content.
- **B: Client sends the loaded doc content.** No extra DB reads but large payloads and client-controlled context.
- **Selected: A.**

### 3. Answer rendering

- **A (Recommended): Reuse `MarkdownRenderer`.** Real LLM output is markdown; the design's "blocks" are a mock of rendered markdown. Consistent styling with the rest of the workspace.
- **B: Custom block renderer per design mock.** Faithful to the mock but requires forcing the model into a JSON block contract; brittle for a spike.
- **Selected: A.**

## Architecture Improvement Opportunities

- The workspace already exposes `activeSectionId` from `useWorkspaceScrollSync`; the composer reuses it (via `SCROLLABLE_NAV_ITEMS`) for the section-scope label, no new scroll plumbing.
- Prompt lives in `src/lib/prompts/project-composer.ts` per the established prompt architecture (barrel export, `buildSecurePrompt` delimiters).
- If the composer graduates into MVP, a follow-up should extract a shared `openrouter` client singleton (currently each route constructs its own `OpenAI` instance; this plan follows the existing pattern rather than refactoring on a spike branch).

## Plan

### Phase 1 — Prompt + API route (backend, minimal)

1. `src/lib/prompts/project-composer.ts`: system prompt (grounded QA over the project's documents, honest about missing docs, may use web search results, concise markdown answers, never claims to edit documents) + `buildProjectComposerUserPrompt()` using `buildSecurePrompt` with per-doc max lengths. Export from `src/lib/prompts/index.ts`.
2. `src/app/api/projects/[id]/composer/route.ts` (`POST`, `maxDuration = 120`):
   - Supabase auth → 401; project ownership check → 404.
   - Rate limits: 30/user/hr, 90/IP/hr (mirrors `intake/questions` pattern).
   - Body: `{ message, scope: "document" | "project", docKey?, history? }`; message sanitized, history capped (last 12 turns, each truncated).
   - Context loading by scope: `executive-summary`/`market-research` → latest competitive analysis; `prd` → latest Product Plan; `mvp`/`mockups` → latest First Version Plan; `ai-prompts` → Product Plan + First Version Plan; `project` scope → all three. Mockups are images, so the prompt notes they can't be read as text.
   - OpenRouter chat completion: model `OPENROUTER_COMPOSER_MODEL || OPENROUTER_CHAT_MODEL || "anthropic/claude-sonnet-4-6"`, `plugins: [{ id: "web" }]` for online web search, `stream: true`, `max_tokens: 2048`, abort signal ~100s.
   - Response: `text/plain` streamed body. No DB writes.

### Phase 2 — Composer UI

3. `src/components/workspace/project-composer.tsx` (client): command-bar card per v3 design — collapsed input row (scope chip, auto-growing textarea, red send button); expanded state with header ("Ask this project" kicker, New, collapse chevron), suggestion chips (Summarize {active doc}, Suggest next steps, Explain a decision), message list (user bubbles right/dark, assistant cards with Assistant kicker + scope label + markdown body), "Reading your project" dots while waiting, session-note footer. Enter sends, Shift+Enter newline, Escape collapses, autofocus on open, autoscroll on growth, abort in-flight request on New/unmount.
4. Mount in `project-workspace.tsx`: wrap `ScrollableContent` in a `relative` flex column and render `<ProjectComposer>` inside it; pass `projectId`, `projectName`, and the active nav key/label derived from `activeSectionId`. Add bottom padding to the scroll container so the floating bar doesn't hide the last section.

### Phase 3 — Docs + verification

5. Update `PROJECT_CONTEXT.md` (feature description + route map + component). Update this plan's frontmatter after verification.
6. Verify: `tsc`/lint/build clean; run dev server and exercise the composer in the browser against a real project (open/close, suggestion chip, free-form question with web search, scope toggle, New).

## Milestones

- M1: Route answers a scoped question via curl-level test (auth session required, so verified through the app).
- M2: Composer renders and streams answers in the workspace.
- M3: Docs updated, build green, branch pushed.

## Validation

- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Browser: collapsed bar renders over workspace; focus expands; suggestion chip produces a streamed answer scoped to the active document; scope toggle switches label between the active doc and "Whole project"; New clears the session; Escape collapses; note row shows "This session isn't saved / History off / Read-only".

## Risks

- **Web plugin cost/latency**: web search adds per-request cost and seconds of latency. Mitigation: rate limits, 2048 max tokens, plugin `max_results: 3`.
- **Large documents blow the context**: per-doc caps (~24k chars) in `buildSecurePrompt` maxLengths.
- **Route timeout on Vercel**: `maxDuration = 120` with a 100s abort signal keeps buffer.
- **Prompt injection via stored docs**: docs are AI-generated but pass through `buildSecurePrompt` delimiters like other pipelines; user message passes `sanitizeInput`.

## Rollback

The feature is isolated to a branch. On `main`, nothing changes. Within the branch, removal = delete the component, route, prompt file, barrel export line, and the workspace mount (one wrapper div + one child).

## Open Decisions

- Whether the composer becomes part of MVP (the point of this spike); if yes: persistence, credit policy, and mobile layout need real decisions.
- Whether "Explain a decision" should become context-aware (pull a real decision from the active doc) rather than a generic prompt.

## Critique (five perspectives)

- **Product**: Matches the design's promise (scratch session, read-only) exactly; no scope creep into saved chat history.
- **Security**: Auth + ownership + rate limit + sanitization mirror existing routes; no new secrets; no client-supplied context trusted.
- **Performance**: Streaming keeps perceived latency low; doc context re-read per request is 1-3 indexed Supabase queries, negligible.
- **Maintainability**: Follows the prompt-architecture and route conventions; one deliberate deviation (no shared OpenRouter singleton) noted as a follow-up.
- **UX**: Reuses workspace markdown rendering for consistent answers; keyboard behavior (Enter/Escape) matches the design script.

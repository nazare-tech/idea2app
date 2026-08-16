---
implemented: true
implemented_at: 2026-08-15
implementation_summary: Removed reply character caps while preserving the under-100-word contract, and added locally persisted Codex Article Studio drafts with strict validation and an accessible centered sheet.
---

# Plan: Research Inbox Article Studio

## Goal

Remove the visible 500-character reply constraint while retaining the fewer-than-100-word reply contract, and turn web-source cards into a local Codex-powered article workflow that generates, saves, and opens a polished six-minute-read website article in an accessible centered sheet.

## Assumptions

- “Six-minute word article” means a six-minute read, approximately 850–1,050 words.
- Article-like normalized `web` cards use Article Studio. Known social/post hosts mapped into the web bucket remain ordinary source cards. Reddit, X, YouTube, Hacker News, and GitHub keep Reply Studio.
- Generated articles are drafts for the user’s website. Nothing publishes automatically.
- Article content persists in the existing local JSON item state. Supabase remains out of scope.

## Clarifying Questions

1. Which cards become article prompts?
   - Recommendation A: `web` cards except known social/post hosts. Deterministic, handles the importer’s broad web bucket, and matches “actually articles.”
   - Recommendation B: All `web` cards. Simpler, but TikTok, Instagram, Bluesky, and Polymarket mappings may receive an article action.
   - Selected: Recommendation A.
2. What does “six-minute” mean?
   - Recommendation A: 850–1,050 words with a displayed six-minute-read label.
   - Recommendation B: Exactly six sections, with no length target. Easier generation, weaker reading-time promise.
   - Selected: Recommendation A.
3. How should full articles open?
   - Recommendation A: Accessible centered modal sheet with title, dek, reading time, copy, close, backdrop close, Escape close, focus transfer, and internal scrolling.
   - Recommendation B: New route/page. Better deep linking, but more navigation and routing state than requested.
   - Selected: Recommendation A.

## Recommended First Step

Add failing prompt, normalization, repository-persistence, and server-render contract tests before changing generation or UI.

## Runtime and Change-Impact Analysis

### Repeated Work

- One Codex child per explicit Generate reply/article click. No background polling.
- Reply target remains fewer than 100 words. Article target is 850–1,050 words; hard process timeout 90 seconds and bounded output protect the local server.
- Modal rendering is local state only; no fetch when reopening a saved article.

### Ownership, Scope, And Lifetime

- `ResearchItemState.articleDraft` owns one latest generated article per eligible web card for the lifetime of the local workspace JSON.
- Card owns generation/loading state. Inbox owns the one open article modal.
- Regeneration replaces only that card’s prior article after successful generation and local revision-checked save.

### Boundary And Cache Semantics

- New token-gated, same-origin `POST /api/article` accepts only a stored item ID plus explicit replace intent, re-derives eligibility server-side, generates, then persists under the repository lock before responding.
- Codex output is JSON-only and parsed into bounded title, dek, and body fields before reaching the browser.
- Existing version-1 JSON remains compatible because `article` is optional item state.

### Failure And Recovery

- Codex timeout, invalid JSON, invalid item, failed size guard, or repository lock failure leaves the prior article and inbox unchanged.
- Modal close never deletes article content. Regenerate is explicit.
- Rollback removes article UI/API/type field; old JSON ignores optional article data.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Reply text still truncates | Repository + rendered markup tests | No `maxLength`, 500 counter, or 500-character slice; generated result remains under 100 words |
| Article route accepts wrong card | Prompt/route boundary inspection + tests | Only stored article-candidate item IDs generate |
| Malformed/oversized model output | Parser tests | Invalid JSON rejected; article fields bounded; body 850–1,050 words |
| Article lost after close/reload | Repository persistence test + real Chrome reload | Saved article reopens without regeneration |
| Modal inaccessible | Real Chrome keyboard/DOM verification | Dialog label present, close works, Escape works, internal scroll fits viewport |
| Long generation freezes UI | Real Chrome live generation | Immediate disabled loading state and status; rest of page remains usable |

## Architecture Improvement Opportunities

- **Selected: configurable Codex output policy.** Shared runner accepts timeout/output bounds so reply and article generation reuse safe process code without article truncation. Trade-off: slightly wider helper contract. Files: `codex-runner.ts`, reply/article routes.
- **Selected: explicit article parser, eligibility policy, and local type.** Keeps prompt/parser/render/server contracts aligned and prevents arbitrary model text from entering state. Trade-off: dedicated small module/tests.
- **Selected: atomic server-side article persistence and serialized document-size guard.** Prevents generation success from being lost to a client revision conflict and prevents accumulated articles from making the next load recover the JSON as corrupt. Trade-off: one repository method beyond generic revision updates.
- **Selected: one reusable ArticleSheet component.** Separates focus, close, scroll, and presentation from cards. Trade-off: one extra component file.
- **Deferred: article history/versioning.** Valuable later, but latest-draft storage matches current reply behavior.
- **Rejected: URL classifier.** Domain/content heuristics add false positives and maintenance without improving the explicit web-source rule.

## Critique

- Architecture: Optional item-state article keeps local-first isolation and backward compatibility. Client-mediated persistence mirrors reply drafts but still trusts same-origin page content; parser and token gates contain model/browser inputs.
- Product/customer: Web evidence becomes a publishing asset instead of an awkward social reply. Six-minute target is useful, but “article-ready” still means editorial review before publishing.
- Engineering: A modal sheet is smaller than a route and matches requested interaction. Focus restoration and Escape handling are required, not polish.
- Risk/security: Source content is untrusted and prompt-delimited. Articles must not invent quotes, metrics, or firsthand claims. No automatic publication or external transmission.

## Phases

- [x] Phase 1: Add red tests for reply cap removal, article prompt/parser, local persistence, and card action labels.
- [x] Phase 2: Add article type, safe parser, configurable Codex output bounds, and `/api/article`.
- [x] Phase 3: Add Article Studio and centered Article Sheet with accessible interactions.
- [x] Phase 4: Run tests, typecheck, lint, build, then real Chrome generation/open/close/reload verification.
- [x] Phase 5: Record review/security findings, remediate, update system/history docs, and mark complete.

## Test Strategy

- Node tests for reply word normalization without character truncation, article prompt delimiting, article JSON parsing/word bounds, eligibility policy, atomic repository article persistence/write guard, and server-rendered source-specific actions.
- Standalone test suite, typecheck, lint, isolated production build, trace inspection.
- Real Chrome at `http://localhost:4310/`: generate one real web article, inspect loading and completed states, open centered sheet, close with Escape, reload, reopen saved article, capture evidence.

## Rollback And Recovery

- Remove Article Studio, sheet, `/api/article`, and optional article state field. Existing reply behavior remains.
- Optional article fields in local JSON can remain inert; no migration or destructive cleanup is required.

## Open Decisions

- None. Repository Recommendation A policy applied.

## Plan Evaluation

- Opposite-CLI evaluation attempted on 2026-08-15. Reviewer unavailable because its API host could not resolve (`ENOTFOUND`). Plan remains externally unevaluated; outage is not counted as review coverage.

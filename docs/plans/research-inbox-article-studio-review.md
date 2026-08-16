# Research Inbox Article Studio review

## Outcome

Reply drafts no longer have a 500-character editor, persistence, normalization, or Codex-output truncation. Generated replies remain fewer than 100 words. Article-like web cards now generate and atomically save original 850–1,050-word website drafts through Codex CLI, then open them in one centered accessible article sheet.

The opposite-CLI plan evaluation failed because its API host could not resolve (`ENOTFOUND`). This work remains externally unevaluated; the outage is not counted as review coverage.

## Architecture and code review

- Selected shared Codex runner policy landed: reply/article calls share fixed shell-free process code while owning separate timeout and output bounds. Oversized output is rejected, never truncated.
- Selected article domain contract landed: one eligibility predicate is reused client/server; known social/post hosts in the broad web bucket remain reply/source cards.
- Selected atomic persistence landed: article generation saves under the repository lock before the route responds. Explicit replacement protects existing work, and the serialized 2 MB guard matches the next-load boundary.
- Selected reusable sheet landed: one native dialog owns centered layout, internal scroll, Escape/close, focus restoration, copy, responsive sizing, and plain-text rendering.
- Article history/versioning remains deferred. Latest-draft semantics match reply regeneration and current product scope.
- No new duplication, non-idempotent hidden write, cross-project dependency, Supabase import, or recovery blind spot found in final diff.

## Security review

- Route accepts only stored item ID and boolean replace intent; topic, source evidence, prompt, model operation, timeout, and output shape remain server-owned.
- Loopback Host, exact Origin, signed launch token, and a separate 10/hour article limiter guard the expensive local action.
- Stored source data is bounded, JSON-delimited, and labeled untrusted. Prompt forbids source instructions, copied prose, invented quotations, statistics, research, experience, and results.
- Codex runs ephemerally, read-only, without approvals, web search, repository rules, or user config. Output uses exact-key JSON, plain text only, 20 KB transport, 12 KB body, and 850–1,050-word validation.
- UI never renders model HTML or calls `dangerouslySetInnerHTML`. No automatic publication or external transmission occurs.
- Article and launch-secret data remain absent from standalone build artifacts.

## Verification

- `npm test`: 44/44 passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Isolated `npm run build`: passed with `/api/article`; standalone trace inspection found no local research JSON, run JSON, or launch secret.
- Real Chrome, desktop: web finding showed Generate article, immediate Writing article state appeared, real Codex completed in under one minute, strict parser accepted a 989-word draft, and dialog opened automatically.
- Dialog: full title/deck/body visible, six-minute label and copy/close controls present, Escape closed it, focus returned to Open article.
- Persistence: page reload retained Open article and Regenerate article; saved draft reopened without another generation.
- Mobile 390×844: dialog measured 337×793 px inside viewport; body client/scroll widths matched at 375 px, proving no horizontal overflow.
- Chrome logged only its recurring extension message-channel closure noise during controller reconnects; no application exception, React error, API error, or failed generation appeared.
- Evidence: `ui-evidence/2026-08-15/research-inbox-article-studio/01-ready.png`, `02-writing.png`, `03-article-sheet.png`, `04-mobile-sheet.png`, `05-final-desktop.png`.

## Remaining risk

Local JSON has a deliberate 2 MB total ceiling. A large library of generated articles will eventually need separate per-article files or an archive/export flow. Current route fails closed with a clear storage message before corrupting the document.

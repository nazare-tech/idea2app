# Motion Lab: Variant D "Live fill" (skeleton + streaming text inside designed blocks)

## Question being tested
Can we keep the designed UI structure (competitor table, numbered 01/02/03 lists,
comparison tables) visible while the text streams into it cell by cell, instead of
buffering structure behind an assembling chip (block-commit) or plain skeleton bars?

## Why it is technically possible
- Designed blocks are pure renders of `CompetitiveAnalysisStructuredData`.
- The v2 parsers are already lenient on partial text:
  - `extractSectionsByHeading(content, 3)`: a streaming `### Productbo` yields a
    competitor entry whose name grows char by char (table row appears, name streams).
  - `parseLabeledList`: a field only materializes once `**Label**: value` has a colon;
    the value then grows char by char (cell text streams).
  - `parseListItems`: the last, still-growing bullet is included, so numbered slots
    appear and the newest one streams.
  - `parseMarkdownTable`: header renders once the separator row lands; the partial
    last row streams into its cells.
- Only hazard: an unclosed trailing `**` shows literal asterisks. Trim it.

## Changes (lab-only variant, production keeps block-commit)
1. `src/lib/competitive-analysis-streaming.ts`
   - `sanitizeLiveSectionContent(content)`: drop a trailing unclosed `**` marker.
2. `src/components/analysis/competitive-streaming-document.tsx`
   - Add variant `"live-fill"` to `CompetitiveStreamingVariant`.
   - `buildStructuredData` accepts the active (incomplete) section so its partial
     content reaches the designed renderers.
   - Render: full contract skeleton (like variant B); the active recognized section
     renders its real designed block with a "Writing" badge; per-section readiness
     guard avoids empty-state flashes (Direct Competitors waits for first `### `).
3. `src/components/dev/motion-lab-client.tsx`: add "D · Live fill" button.

## Verify
Run dev server, open /dev/motion-lab, variant D at Real-ish speed with both
token-stream and 2s-poll delivery. Watch: table appears with first competitor,
cells fill; Market Landscape numbered items appear and stream.

## Follow-up if it works
- Decide ghost slots (pre-render 01-04 empty) vs grow-as-they-arrive.
- Promote to production workspace variant or strip streaming entirely.

## Phase 2: promote to product (2026-07-10)
1. `scrollable-content.tsx`: both streaming usages switch to `variant="live-fill"`;
   Market Research section shows the streaming skeleton from the first token
   (drop the `hasStreamedDetailSections` gate).
2. Header parity with the final document: `CompetitiveStreamingDocument` renders
   the same `TopLevelDocumentHeader` the saved document uses ("Executive Summary" /
   "Market Research" + descriptions) when rendering `parts="overview"|"detail"`,
   with a Writing badge while streaming. Overview drops the duplicate inner H2
   (the final document has none).
3. Navigation timing: intake wizard keeps the submission loading panel up and only
   `router.push`es to the workspace after the first streamed token is visible in
   `/api/generate-all/status` (`streamingPreview.content` non-empty), with escape
   hatches: queue errored/finished, or 60s timeout.

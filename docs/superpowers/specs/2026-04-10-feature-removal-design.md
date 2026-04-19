# Feature Removal Design
**Date**: 2026-04-10
**Status**: Approved

## Context

The app has accumulated several features that add complexity without proportional user value:
model selection dropdowns (users rarely need to choose models), Edit with AI (inline AI editing of documents), a Regenerate button (re-running generation for already-generated documents), and a Download Markdown option. Removing these simplifies the UI, reduces maintenance surface, and avoids confusion over credit costs from different model choices.

---

## Features Being Removed

### 1. AI Model Selection Dropdowns

**Problem**: Users see model dropdowns on every tab. Different models have different credit costs and quality, creating confusion. The app already has sensible defaults.

**Change**: Remove all model selector UI. Lock each tab to its default model. Expose defaults in a single constant so they're easy to change in code.

**Single source of truth** after removal — in `src/lib/prompt-chat-config.ts`:
```typescript
// Change your defaults here — one place for all tabs
export const DEFAULT_MODELS = {
  prompt:      "anthropic/claude-sonnet-4-6",
  competitive: "google/gemini-3.1-pro-preview",
  prd:         "anthropic/claude-sonnet-4-6",
  mvp:         "anthropic/claude-sonnet-4-6",
  mockups:     "anthropic/claude-sonnet-4-6",
  launch:      "openai/gpt-5.4-mini",
};
```

**No DB migration needed**: The `generation_queues.model_selections` JSONB column stays in the schema but is no longer read or written. API routes stop accepting a `model` param and use `DEFAULT_MODELS` directly.

---

### 2. Edit with AI

**Problem**: Inline AI editing (select text → toolbar → edit popup) adds ~400 lines of complex selection-handling code to `markdown-renderer.tsx`, and credit cost per edit adds billing friction.

**Change**: Remove the entire inline editing pipeline — UI, API route, prompt file. `markdown-renderer.tsx` reverts to its simpler form (no selection detection, no conditional component switching).

---

### 3. Regenerate Option

**Problem**: Two distinct regenerate paths exist. Removing both simplifies the post-generation state.

**Changes**:
- **Regenerate as V2** (legacy competitive analysis upgrade button): Remove entirely — props `onUpgrade` and `isUpgrading` removed from `CompetitiveAnalysisDocument`.
- **Main Generate button when content exists**: Hide the generate button once content has been successfully generated. If generation fails, the pipeline refunds credits and saves no content — so `content` stays empty and the button remains naturally visible for retry. No separate error state handling needed.

---

### 4. Download Markdown

**Problem**: Two download options (PDF + Markdown) require a dropdown. Most users only need PDF.

**Change**: Remove `handleDownloadMarkdown()` and the dropdown. Replace with a single direct "Download PDF" button. This simplifies the header action bar.

---

## Files to Delete

| File | Reason |
|------|--------|
| `src/components/ui/model-selector.tsx` | Base model selector component |
| `src/components/ui/prompt-model-selector.tsx` | Prompt tab model selector |
| `src/components/ui/document-model-selector.tsx` | Document tab model selector |
| `src/components/ui/inline-ai-editor.tsx` | Edit with AI popup component |
| `src/components/ui/selection-toolbar.tsx` | "Edit with AI" floating toolbar |
| `src/lib/prompts/document-edit.ts` | Prompts for document editing |
| `src/app/api/document-edit/route.ts` | API endpoint for inline edits |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/prompt-chat-config.ts` | Replace `TAB_DEFAULT_MODELS`, `AVAILABLE_MODELS`, `DOCUMENT_PRIMARY_MODELS`, `DOCUMENT_MORE_MODELS` with single `DEFAULT_MODELS` export |
| `src/components/layout/content-editor.tsx` | Remove model state + selector rendering; remove `handleDownloadMarkdown` + dropdown → direct PDF button; hide generate button when content exists (keep for no-content or error states); remove `enableInlineEditing` + `onContentUpdate` from MarkdownRenderer |
| `src/components/ui/markdown-renderer.tsx` | Remove `enableInlineEditing` prop, mouseup listener, selection state, `SelectionToolbar`/`InlineAiEditor` rendering, conditional component switching |
| `src/components/analysis/competitive-analysis-document.tsx` | Remove `onUpgrade`, `isUpgrading` props and "Regenerate as V2" button |
| `src/components/workspace/generate-all-block.tsx` | Remove `ModelPill` component and per-tab model dropdown |
| `src/stores/generate-all-store.ts` | Remove `modelSelections` state and `updateModelSelection` action |
| `src/app/api/analysis/[type]/route.ts` | Ignore `model` from request body; use `DEFAULT_MODELS[type]` |
| `src/app/api/generate-all/execute/route.ts` | Use `DEFAULT_MODELS` instead of reading `model_selections` from DB row |
| `src/app/api/generate-all/start/route.ts` | Stop accepting/persisting `modelSelections` |

---

## Behavioral Rules Post-Removal

| Scenario | Behavior |
|----------|----------|
| Document has content | Generate button hidden |
| Document has no content (including after failed generation) | Generate button visible ("Generate X credits") |
| User selects text in a document | Nothing happens (no toolbar) |
| User tries to download | Single "Download PDF" button (no dropdown) |
| Model used per tab | Fixed to `DEFAULT_MODELS` constant |

---

## What Is NOT Removed

- PDF download functionality
- Copy to clipboard
- Version navigation (switching between saved versions)
- The generate flow itself (first-time generation still works)
- All AI analysis pipelines
- Prompt chat tab functionality
- Credit system

---

## Verification

1. Generate a document → generate button should disappear after success
2. Force a generation failure → generate button should reappear
3. Select text in a document → no toolbar should appear
4. Check header actions → only "Download PDF" button, no dropdown
5. Check all tabs → no model selector dropdowns visible
6. Trigger "Generate All" → all steps run with default models (verify in server logs)
7. TypeScript build passes: `npm run build`

# Feature Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove AI model selection dropdowns, Edit with AI, Regenerate option, and Download Markdown — leaving the app simpler with locked-in default models per tab.

**Architecture:** Surgical deletion first (files that are entirely removed), then modifications to files that lose specific sections. The `DEFAULT_MODELS` constant in `prompt-chat-config.ts` becomes the single place to change any per-tab model. No DB migrations needed.

**Tech Stack:** Next.js App Router, React, TypeScript, Zustand

---

## File Map

**Delete entirely (7 files):**
- `src/components/ui/model-selector.tsx`
- `src/components/ui/prompt-model-selector.tsx`
- `src/components/ui/document-model-selector.tsx`
- `src/components/ui/inline-ai-editor.tsx`
- `src/components/ui/selection-toolbar.tsx`
- `src/lib/prompts/document-edit.ts`
- `src/app/api/document-edit/route.ts`

**Modify (9 files):**
- `src/lib/prompt-chat-config.ts` — collapse to single `DEFAULT_MODELS` export
- `src/stores/generate-all-store.ts` — remove `modelSelections` state + `updateModelSelection`
- `src/app/api/generate-all/start/route.ts` — stop requiring/persisting `modelSelections`
- `src/app/api/generate-all/execute/route.ts` — use `GENERATE_ALL_DEFAULT_MODELS` from document-definitions
- `src/app/api/analysis/[type]/route.ts` — use hardcoded default per type instead of request `model` param
- `src/components/layout/content-editor.tsx` — remove model state/selectors, markdown download → direct PDF button, hide generate button when content exists
- `src/components/ui/markdown-renderer.tsx` — remove inline editing: prop, selection state, toolbar/editor rendering
- `src/components/analysis/competitive-analysis-document.tsx` — remove `onUpgrade`/`isUpgrading` + Regenerate as V2 button
- `src/components/workspace/generate-all-block.tsx` — remove `ModelPill` and model dropdown

---

### Task 1: Consolidate model defaults in `prompt-chat-config.ts`

**Files:**
- Modify: `src/lib/prompt-chat-config.ts`

- [ ] **Step 1: Replace the entire file content**

Replace the full file with:

```typescript
// Prompt constants live in @/lib/prompts — re-exported here so that
// existing imports of prompt-chat-config.ts continue to work unchanged.
export { PROMPT_CHAT_SYSTEM, IDEA_SUMMARY_PROMPT, POST_SUMMARY_SYSTEM } from "@/lib/prompts"

/**
 * Default AI model per tab. Change these to switch the model used for each pipeline.
 * Keys match the DocumentType values used throughout the app.
 */
export const DEFAULT_MODELS: Record<string, string> = {
  prompt:      "anthropic/claude-sonnet-4-6",   // Prompt chat
  competitive: "google/gemini-3.1-pro-preview",  // Competitive Research
  prd:         "anthropic/claude-sonnet-4-6",    // PRD
  mvp:         "anthropic/claude-sonnet-4-6",    // MVP Plan
  mockups:     "anthropic/claude-sonnet-4-6",    // Mockups
  launch:      "openai/gpt-5.4-mini",            // Marketing Plan
}

/** Fallback when a tab key isn't in DEFAULT_MODELS */
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6"
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/prompt-chat-config.ts
git commit -m "refactor: collapse model config to single DEFAULT_MODELS constant"
```

---

### Task 2: Delete the 7 removed-feature files

**Files:**
- Delete: `src/components/ui/model-selector.tsx`
- Delete: `src/components/ui/prompt-model-selector.tsx`
- Delete: `src/components/ui/document-model-selector.tsx`
- Delete: `src/components/ui/inline-ai-editor.tsx`
- Delete: `src/components/ui/selection-toolbar.tsx`
- Delete: `src/lib/prompts/document-edit.ts`
- Delete: `src/app/api/document-edit/route.ts`

- [ ] **Step 1: Delete all seven files**

```bash
rm src/components/ui/model-selector.tsx
rm src/components/ui/prompt-model-selector.tsx
rm src/components/ui/document-model-selector.tsx
rm src/components/ui/inline-ai-editor.tsx
rm src/components/ui/selection-toolbar.tsx
rm src/lib/prompts/document-edit.ts
rm src/app/api/document-edit/route.ts
```

- [ ] **Step 2: Commit**

```bash
git add -u
git commit -m "feat: remove model selector, inline AI editor, and selection toolbar components"
```

---

### Task 3: Update `generate-all-store.ts` — remove `modelSelections`

**Files:**
- Modify: `src/stores/generate-all-store.ts`

The store currently holds `modelSelections: Record<string, string>` in state and has an `updateModelSelection` action. These are no longer needed. The store must still compute `totalCredits` and `queue` — it will use `GENERATE_ALL_DEFAULT_MODELS` directly instead.

- [ ] **Step 1: Update imports at the top of the file**

Find the existing import block:
```typescript
import {
  GENERATE_ALL_QUEUE_ORDER,
  GENERATE_ALL_DEFAULT_MODELS,
  type DocumentType,
} from "@/lib/document-definitions"
import {
  estimateGenerateAllCost,
  GENERATE_ALL_ACTION_MAP,
  getTokenCost,
} from "@/lib/token-economics"
```

This stays unchanged — `GENERATE_ALL_DEFAULT_MODELS` will now be used directly where `modelSelections` was.

- [ ] **Step 2: Remove `modelSelections` from the `GenerateAllState` interface**

Find:
```typescript
interface GenerateAllState {
  status: GenerateAllStatus
  queue: QueueItem[]
  currentIndex: number
  modelSelections: Record<string, string>
  totalCredits: number
  creditsUsed: number
  startedAt: Date | null
  error: string | null
}
```

Replace with:
```typescript
interface GenerateAllState {
  status: GenerateAllStatus
  queue: QueueItem[]
  currentIndex: number
  totalCredits: number
  creditsUsed: number
  startedAt: Date | null
  error: string | null
}
```

- [ ] **Step 3: Remove `updateModelSelection` from the `GenerateAllActions` interface**

Find:
```typescript
  updateModelSelection: (docType: string, modelId: string) => void
```

Delete that line.

- [ ] **Step 4: Update initial state in the store factory (remove `modelSelections`)**

Find:
```typescript
    // Initial state
    status: "idle",
    queue: [],
    currentIndex: 0,
    modelSelections: { ...GENERATE_ALL_DEFAULT_MODELS },
    totalCredits: 0,
    creditsUsed: 0,
    startedAt: null,
    error: null,
```

Replace with:
```typescript
    // Initial state
    status: "idle",
    queue: [],
    currentIndex: 0,
    totalCredits: 0,
    creditsUsed: 0,
    startedAt: null,
    error: null,
```

- [ ] **Step 5: Update `_updateCallbacks` to use `GENERATE_ALL_DEFAULT_MODELS` directly**

Find:
```typescript
      // Only sync state when idle — no-op during generation
      if (get().status !== "idle") return

      const { modelSelections } = get()
      const newQueue = buildQueue(modelSelections, getDocStatus)
      const skipTypes = new Set<string>(
        GENERATE_ALL_QUEUE_ORDER.filter(
          (dt) => getDocStatus(dt as DocumentType) === "done",
        ),
      )
      const newTotal = estimateGenerateAllCost(modelSelections, skipTypes)
      set(() => ({ queue: newQueue, totalCredits: newTotal }))
```

Replace with:
```typescript
      // Only sync state when idle — no-op during generation
      if (get().status !== "idle") return

      const newQueue = buildQueue(GENERATE_ALL_DEFAULT_MODELS, getDocStatus)
      const skipTypes = new Set<string>(
        GENERATE_ALL_QUEUE_ORDER.filter(
          (dt) => getDocStatus(dt as DocumentType) === "done",
        ),
      )
      const newTotal = estimateGenerateAllCost(GENERATE_ALL_DEFAULT_MODELS, skipTypes)
      set(() => ({ queue: newQueue, totalCredits: newTotal }))
```

- [ ] **Step 6: Update `hydrate` — remove `modelSelections` from the set calls**

In `hydrate`, find the block that restores terminal states:
```typescript
        set(() => ({
          queue: dbRow.queue,
          currentIndex: dbRow.current_index,
          modelSelections: dbRow.model_selections ?? get().modelSelections,
          startedAt: dbRow.started_at ? new Date(dbRow.started_at) : null,
          status: dbRow.status as GenerateAllStatus,
          error: dbRow.error_info?.message ?? null,
        }))
```

Replace with:
```typescript
        set(() => ({
          queue: dbRow.queue,
          currentIndex: dbRow.current_index,
          startedAt: dbRow.started_at ? new Date(dbRow.started_at) : null,
          status: dbRow.status as GenerateAllStatus,
          error: dbRow.error_info?.message ?? null,
        }))
```

- [ ] **Step 7: Remove the `updateModelSelection` action implementation**

Find and delete the entire action (it will look something like):
```typescript
    updateModelSelection: (docType: string, modelId: string) => {
      set((s) => ({
        modelSelections: { ...s.modelSelections, [docType]: modelId },
      }))
    },
```

- [ ] **Step 8: Update `startGenerateAll` — remove `modelSelections` from the API call**

In `startGenerateAll`, find the fetch to `/api/generate-all/start`. It sends `modelSelections` in the body. Find that section and remove `modelSelections` from the body. It will look like:

```typescript
      body: JSON.stringify({ projectId, queue: initialQueue, modelSelections: get().modelSelections }),
```

Replace with:
```typescript
      body: JSON.stringify({ projectId, queue: initialQueue }),
```

- [ ] **Step 9: Verify TypeScript compiles for the store**

```bash
npx tsc --noEmit 2>&1 | grep "generate-all-store"
```

Expected: no errors from this file.

- [ ] **Step 10: Commit**

```bash
git add src/stores/generate-all-store.ts
git commit -m "refactor: remove modelSelections from generate-all store, use fixed defaults"
```

---

### Task 4: Update `generate-all` API routes

**Files:**
- Modify: `src/app/api/generate-all/start/route.ts`
- Modify: `src/app/api/generate-all/execute/route.ts`

- [ ] **Step 1: Update `/api/generate-all/start/route.ts`**

Replace the entire file with:

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, queue } = body

    if (!projectId || !queue) {
      return NextResponse.json(
        { error: "projectId and queue are required" },
        { status: 400 },
      )
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Upsert: replace any existing queue for this project+user
    const { data, error } = await supabase
      .from("generation_queues")
      .upsert(
        {
          project_id: projectId,
          user_id: user.id,
          status: "running",
          queue,
          current_index: 0,
          model_selections: {},
          started_at: new Date().toISOString(),
          completed_at: null,
          error_info: null,
        },
        { onConflict: "project_id,user_id" },
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ queue: data })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Update `/api/generate-all/execute/route.ts` — replace `modelSelections` lookup with `GENERATE_ALL_DEFAULT_MODELS`**

Find the import section at the top. Add `GENERATE_ALL_DEFAULT_MODELS` to the import from `@/lib/document-definitions`:

```typescript
import {
  GENERATE_ALL_QUEUE_ORDER,
  GENERATE_ALL_DEFAULT_MODELS,
  type DocumentType,
} from "@/lib/document-definitions"
```

(If it already imports from `document-definitions`, just add `GENERATE_ALL_DEFAULT_MODELS` to the existing import.)

- [ ] **Step 3: Replace `modelSelections` lookup in the execute route**

Find:
```typescript
  const modelSelections: Record<string, string> = (queueRow.model_selections as Record<string, string>) ?? {}
  const queue: QueueItem[] = (queueRow.queue as unknown as QueueItem[]) ?? []
```

Replace with:
```typescript
  const queue: QueueItem[] = (queueRow.queue as unknown as QueueItem[]) ?? []
```

- [ ] **Step 4: Replace per-step model lookup**

Find:
```typescript
    const action = GENERATE_ALL_ACTION_MAP[item.docType]
    const model = modelSelections[item.docType]
    const creditCost = action ? getTokenCost(action, model) : item.creditCost
```

Replace with:
```typescript
    const action = GENERATE_ALL_ACTION_MAP[item.docType]
    const model = GENERATE_ALL_DEFAULT_MODELS[item.docType]
    const creditCost = action ? getTokenCost(action, model) : item.creditCost
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/generate-all/start/route.ts src/app/api/generate-all/execute/route.ts
git commit -m "refactor: generate-all routes use fixed default models instead of user selections"
```

---

### Task 5: Update `/api/analysis/[type]/route.ts` — use fixed defaults

**Files:**
- Modify: `src/app/api/analysis/[type]/route.ts`

- [ ] **Step 1: Add a model-lookup constant near the top of the route file (after the imports)**

After the last import line, add:

```typescript
// Fixed default models per analysis type — user model selection removed
const ANALYSIS_DEFAULT_MODELS: Record<string, string> = {
  "competitive-analysis": "google/gemini-3.1-pro-preview",
  "prd":                  "anthropic/claude-sonnet-4-6",
  "mvp-plan":             "anthropic/claude-sonnet-4-6",
  "tech-spec":            "anthropic/claude-sonnet-4-6",
}
```

- [ ] **Step 2: Replace the `model` extraction from the request body**

Find:
```typescript
    const { idea, name, competitiveAnalysis, prd, model, stream: streamRequested } = body
```

Replace with:
```typescript
    const { idea, name, competitiveAnalysis, prd, stream: streamRequested } = body
    const model = ANALYSIS_DEFAULT_MODELS[type] ?? "anthropic/claude-sonnet-4-6"
```

That's the only change needed — `model` is now derived from the type rather than the request body. All downstream uses of `model` (pipeline calls and `getTokenCost`) remain unchanged.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/analysis/[type]/route.ts"
git commit -m "refactor: analysis route uses fixed default models per type"
```

---

### Task 6: Update `content-editor.tsx`

**Files:**
- Modify: `src/components/layout/content-editor.tsx`

This has four separate removals: model state/selectors, markdown download + dropdown → direct button, generate button hidden when content exists, inline editing props.

- [ ] **Step 1: Remove model selector imports**

Find any imports of `DocumentModelSelector`, `PromptModelSelector`, `TAB_DEFAULT_MODELS`, `DEFAULT_DOCUMENT_MODEL`, `AVAILABLE_MODELS`, `DOCUMENT_PRIMARY_MODELS`, `DOCUMENT_MORE_MODELS` — remove those import lines entirely.

- [ ] **Step 2: Remove `selectedDocModel` and `selectedPromptModel` state**

Find:
```typescript
  const [selectedDocModel, setSelectedDocModel] = useState(TAB_DEFAULT_MODELS[documentType] ?? DEFAULT_DOCUMENT_MODEL)
  const [selectedPromptModel, setSelectedPromptModel] = useState(TAB_DEFAULT_MODELS.prompt)
```

Delete both lines.

- [ ] **Step 3: Remove `handleDownloadMarkdown` function**

Find and delete the `handleDownloadMarkdown` function (it creates a Blob from `content` and triggers a `.md` download). The surrounding `handleDownloadPDF` function stays.

- [ ] **Step 4: Replace the download dropdown with a direct PDF button**

The current UI has a dropdown button group showing "Download PDF" and "Download Markdown". Find the JSX that renders this dropdown (it will have two options and a chevron/dropdown trigger).

Replace the entire download dropdown with a simple direct PDF button:

```tsx
{content && documentType !== "mockups" && (
  <button
    onClick={handleDownloadPDF}
    disabled={downloadingPdf || isGenerating}
    className="ui-row-gap-2 px-3 ui-py-2 rounded-md border border-border text-xs ui-font-semibold transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {downloadingPdf ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : (
      <Download className="h-3.5 w-3.5" />
    )}
    <span>Download PDF</span>
  </button>
)}
```

Note: The competitive analysis tab has its own PDF button — check whether the original code had a separate condition for it. Keep whatever condition was there (e.g. `documentType !== "competitive-analysis"`) on the existing competitive analysis PDF button and apply this new button only to non-competitive, non-mockup types.

- [ ] **Step 5: Hide the generate button when content already exists**

Find the generate button JSX. It currently shows for all states. Wrap it with a condition so it only renders when there is no content:

```tsx
{!content && (
  <div className="relative group">
    <button
      onClick={() => onGenerateContent(undefined, documentType === "launch" ? { marketingBrief } : undefined)}
      disabled={isGenerating || !canGenerate}
      className={cn(
        "ui-row-gap-2 px-5 ui-py-2 rounded-md transition-colors",
        canGenerate
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-muted text-muted-foreground cursor-not-allowed"
      )}
    >
      {isGenerating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      <span className="text-xs ui-font-semibold">
        {isGenerating ? "Generating..." : `Generate (${dynamicCreditCost} credits)`}
      </span>
    </button>
    {!canGenerate && disabledReason && !isGenerating && (
      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
        <div className="bg-popover text-popover-foreground ui-px-3 ui-py-2 rounded-md text-xs shadow-lg border border-border whitespace-nowrap">
          {disabledReason}
        </div>
      </div>
    )}
  </div>
)}
```

Important: also remove `selectedDocModel` from the `onGenerateContent` call — pass `undefined` so the API falls back to its fixed default.

- [ ] **Step 6: Remove the `DocumentModelSelector` JSX renders**

Find and delete both places where `<DocumentModelSelector ... />` is rendered (there are two — one in the header, one elsewhere).

- [ ] **Step 7: Remove `enableInlineEditing` and `onContentUpdate` from the `MarkdownRenderer` usage**

Find where `<MarkdownRenderer>` is rendered with `enableInlineEditing={true}` and `onContentUpdate={onUpdateContent}`. Remove both props.

- [ ] **Step 8: Remove `onUpdateContent` from the component props interface**

Find the props interface for `ContentEditor` and delete the `onUpdateContent?: (newContent: string) => Promise<void>` line. Also remove it from the destructured props.

- [ ] **Step 9: Commit**

```bash
git add src/components/layout/content-editor.tsx
git commit -m "feat: remove model selectors, markdown download, and regenerate from content editor"
```

---

### Task 7: Update `markdown-renderer.tsx` — remove inline editing

**Files:**
- Modify: `src/components/ui/markdown-renderer.tsx`

- [ ] **Step 1: Remove imports of deleted components**

Find and delete import lines for:
- `InlineAiEditor` (from `./inline-ai-editor`)
- `SelectionToolbar` (from `./selection-toolbar`)

- [ ] **Step 2: Remove `enableInlineEditing` and `onContentUpdate` from the component props**

Find the props interface (likely named `MarkdownRendererProps`). Remove:
```typescript
  enableInlineEditing?: boolean
  onContentUpdate?: (newContent: string) => Promise<void>
```

Remove them from the destructured props as well.

- [ ] **Step 3: Remove all selection-related state**

Find and delete state declarations for: `selection`, `showEditor`, `editorData`, `pendingEdit`, and any other state related to the inline editing flow.

- [ ] **Step 4: Remove the mouseup event listener and selection capture logic**

Find the `useEffect` that adds a `mouseup` listener (it uses `requestAnimationFrame` to capture `window.getSelection()`). Delete the entire `useEffect`.

- [ ] **Step 5: Remove the conditional component switching**

The component currently switches between "minimal" custom components (no pending edit) and "full" custom components (pending edit with diff markers). Remove the `pendingEdit`-conditional logic — keep only the minimal component set (just `code` for syntax highlighting). The `useMemo` blocks for `fullComponents` and `minimalComponents` should collapse to a single `components` definition used unconditionally.

- [ ] **Step 6: Remove the `SelectionToolbar` and `InlineAiEditor` JSX**

Find and delete:
```tsx
{showEditor && selection && (
  <SelectionToolbar ... />
)}
{showEditor && editorData && (
  <InlineAiEditor ... />
)}
```
(The exact conditions may vary — delete whatever renders these two components.)

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/markdown-renderer.tsx
git commit -m "feat: remove inline AI editing from markdown renderer"
```

---

### Task 8: Update `competitive-analysis-document.tsx` — remove Regenerate as V2

**Files:**
- Modify: `src/components/analysis/competitive-analysis-document.tsx`

- [ ] **Step 1: Remove `onUpgrade` and `isUpgrading` from the component props**

Find the props interface (likely named `CompetitiveAnalysisDocumentProps`). Remove:
```typescript
  onUpgrade?: () => void
  isUpgrading?: boolean
```

Remove them from the destructured props as well.

- [ ] **Step 2: Remove the "Regenerate as V2" button JSX**

Find the JSX block that conditionally renders the Regenerate as V2 button — it checks `viewModel.legacyNotice` and renders a button with `RefreshCw` icon and text toggling between "Regenerate as V2" / "Regenerating...". Delete the entire block.

- [ ] **Step 3: Remove `enableInlineEditing` prop from the `MarkdownRenderer` usage in this file**

Find the `<MarkdownRenderer ... enableInlineEditing={true} ...>` and remove the `enableInlineEditing` prop.

- [ ] **Step 4: Commit**

```bash
git add src/components/analysis/competitive-analysis-document.tsx
git commit -m "feat: remove regenerate-as-v2 button from competitive analysis document"
```

---

### Task 9: Update `generate-all-block.tsx` — remove model UI

**Files:**
- Modify: `src/components/workspace/generate-all-block.tsx`

- [ ] **Step 1: Remove imports**

Delete imports of:
- `DOCUMENT_PRIMARY_MODELS`, `DOCUMENT_MORE_MODELS` (from `@/lib/prompt-chat-config`)
- Any model-related icons used only in ModelPill (e.g. `ChevronDown`, `Check` if only used there)
- `updateModelSelection` from the store usage

- [ ] **Step 2: Delete the `ModelPill` component**

Find and delete the entire `ModelPill` component definition (it renders the selected model name with a dropdown to change it).

- [ ] **Step 3: Remove `modelSelections` and `updateModelSelection` references**

Find where the component reads `modelSelections` from the store and where it calls `updateModelSelection`. Remove these.

- [ ] **Step 4: Remove `ModelPill` from each queue item render**

In the JSX that renders each queue item, find `<ModelPill ... />` and delete it.

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace/generate-all-block.tsx
git commit -m "feat: remove model pill and model selection from generate-all block"
```

---

### Task 10: Final build verification

- [ ] **Step 1: Run TypeScript type check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors. Fix any remaining type errors (likely stale references to removed props or state).

- [ ] **Step 2: Run the dev server and manually verify**

```bash
npm run dev
```

Check each scenario:
1. Open any project — no model dropdowns visible in any tab
2. Open a document with no content — Generate button visible with credit count
3. Generate a document — on success, Generate button disappears
4. Simulate a failed generation (e.g. disconnect network mid-generate) — Generate button reappears (no content saved)
5. Select text in a rendered document — no floating toolbar appears
6. Open header actions on a generated document — single "Download PDF" button, no dropdown
7. Trigger Generate All — all steps complete; check server logs show `GENERATE_ALL_DEFAULT_MODELS` values

- [ ] **Step 3: Final cleanup commit**

```bash
git add -u
git commit -m "fix: resolve any remaining type errors after feature removal"
```

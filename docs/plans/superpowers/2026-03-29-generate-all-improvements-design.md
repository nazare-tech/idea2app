# Generate All — Improvements Design
**Date:** 2026-03-29
**Status:** Approved
**Approach:** B — Zustand Global Store Migration

---

## Context

The Generate All feature (released 2026-03-28) uses a React Context (`GenerateAllContext`) for client-side orchestration of sequential document generation. Several edge cases have surfaced:

1. The block disappears when the user types a new query (tied to `conversationStage`)
2. Model dropdowns are locked during a running queue, even for items not yet started
3. Mockups shows a hardcoded "Fixed" tag instead of an AI model dropdown
4. Status text says "Completed" / "Already generated" instead of "Done"
5. No navigation link to the generated document after an item completes
6. Same-tab project switching loses Generate All state (context unmounts)
7. Two concurrent projects need proper isolation

The root cause of most issues is that the React Context is ephemeral (destroyed on unmount) and tightly coupled to the chat interface's `conversationStage` for visibility. Migrating to a **Zustand global store with a per-project store map** resolves these structurally.

---

## Architecture

### Zustand Store Factory

**New file:** `src/stores/generate-all-store.ts`

A module-level `Map<projectId, StoreAPI>` persists across React renders and route navigation:

```
// Module scope — lives for the entire browser session
const projectStores = new Map<string, StoreAPI>()

function getGenerateAllStore(projectId: string): StoreAPI {
  if (!projectStores.has(projectId)) {
    projectStores.set(projectId, createGenerateAllStore(projectId))
  }
  return projectStores.get(projectId)!
}

// React hook for components
export function useGenerateAll(projectId: string) {
  return useStore(getGenerateAllStore(projectId))
}
```

**Concurrent project handling:**
- **Same-tab switching:** Store persists in memory when navigating away. State and generation progress survive unmount/remount.
- **Two browser tabs:** Each tab is an isolated JS context with its own `projectStores` Map and its own Supabase row (unique constraint on `project_id + user_id` already enforces isolation).

### Store State & Actions

```typescript
interface GenerateAllState {
  status: "idle" | "loading" | "running" | "completed" | "cancelled" | "error"
  queue: QueueItem[]
  currentIndex: number
  modelSelections: Record<string, string>
  totalCredits: number
  creditsUsed: number
  startedAt: Date | null
  error: string | null
}

interface GenerateAllActions {
  hydrate: (deps: HydrateDeps) => Promise<void>       // called on project mount
  startGenerateAll: () => Promise<void>
  cancelGenerateAll: () => Promise<void>
  updateModelSelection: (docType: string, modelId: string) => void
}
```

### Key Simplification: Eliminating workingQueueRef

The current context uses a `workingQueueRef` mutable pattern to work around React 18 async state staleness in `useEffect`. With Zustand:

- `get()` always returns current state — no stale closures
- `set()` is synchronous and immediately visible to the next `get()` call
- The generation loop in `startGenerateAll()` reads `get().queue[i]` and `get().modelSelections[docType]` at call time, always getting the latest values

`cancelledRef`, `abortControllerRef`, and `isRunningRef` remain as refs in the store's closure (not React state), functioning identically to before.

### Hydration Component

**New file:** `src/components/workspace/generate-all-hydrator.tsx`

A thin component that replaces the `useEffect` hydration logic from the old context. Mounts when the project workspace mounts, calls `store.hydrate(deps)` once. Renders nothing. The store itself is not destroyed when this component unmounts (it lives in the module-level Map).

---

## Bug Fixes

### 1. Block Disappears on New Query
**File:** `src/components/chat/prompt-chat-interface.tsx:531`

```tsx
// Before
{conversationStage === "summarized" && <GenerateAllBlock />}

// After
{(conversationStage === "summarized" || storeStatus !== "idle") && <GenerateAllBlock />}
```

Once the user has ever triggered Generate All (status transitions out of "idle"), the block persists regardless of subsequent chat input.

### 2. Model Selection on Pending Items During Running State
**File:** `src/components/workspace/generate-all-block.tsx`

Enable model dropdown for items where `item.status === "pending"`. Disable for `generating`, `done`, `skipped`, `cancelled`, `error`.

Since `startGenerateAll()` reads `get().modelSelections[docType]` at generation time (not captured in a closure), any model change the user makes before an item starts is automatically used.

### 3. Mockups Model Dropdown
**Files:** `src/lib/document-definitions.ts`, `src/components/workspace/generate-all-block.tsx`

- Change `GENERATE_ALL_DEFAULT_MODELS.mockups` from `"stitch"` to `"grok-4-1-fast"`
- Remove the "Fixed" tag special-case for mockups in the block UI
- Mockups uses the same model list as all other document types
- The Stitch renderer remains the output mechanism; the selected AI model controls which LLM writes the Stitch system prompt
- Credit calculation uses the AI model's multiplier (same as other docs)

### 4. "Done" Status Text
**File:** `src/components/workspace/generate-all-block.tsx` (`ItemStatusText`)

| Status | Old text | New text |
|--------|----------|----------|
| `done` | "Completed" | "Done" |
| `skipped` | "Already generated" | "Done" |
| `cancelled` | "Cancelled" | "Cancelled" (unchanged) |
| `error` | "Failed" | "Failed" (unchanged) |
| `generating` | stage message | stage message (unchanged) |
| `pending` | credit cost | credit cost (unchanged) |

### 5. Navigation Links After Completion
**File:** `src/components/workspace/generate-all-block.tsx`

Add a clickable `↗` link icon next to items with status `done` or `skipped`. Uses Next.js `<Link>` with `?tab={docType}` — the same URL param pattern already used by project-workspace for tab switching.

```tsx
const TAB_MAP: Record<string, string> = {
  competitive: "competitive",
  prd: "prd",
  mvp: "mvp",
  mockups: "mockups",
  launch: "launch",
}

{(item.status === "done" || item.status === "skipped") && (
  <Link href={`?tab=${TAB_MAP[item.docType]}`}>
    <ArrowUpRight className="h-3 w-3 text-muted-foreground hover:text-foreground" />
  </Link>
)}
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/contexts/generate-all-context.tsx` | **Delete** | Replaced by Zustand store |
| `src/stores/generate-all-store.ts` | **New** | Zustand store factory, module-level Map, `useGenerateAll(projectId)` hook |
| `src/components/workspace/generate-all-hydrator.tsx` | **New** | Thin component; calls `store.hydrate()` on mount |
| `src/components/workspace/generate-all-block.tsx` | **Modify** | Use store hook, fix model dropdowns (incl. mockups), nav links, "Done" text |
| `src/components/workspace/generate-all-nav-badge.tsx` | **Modify** | Switch `useGenerateAll()` import to store hook |
| `src/components/workspace/project-workspace.tsx` | **Modify** | Remove `<GenerateAllProvider>`, add `<GenerateAllHydrator projectId={projectId} ...deps />` |
| `src/components/chat/prompt-chat-interface.tsx` | **Modify** | Fix block visibility: add `|| storeStatus !== "idle"` condition |
| `src/lib/document-definitions.ts` | **Modify** | `GENERATE_ALL_DEFAULT_MODELS.mockups`: `"stitch"` → `"grok-4-1-fast"` |

**Unchanged:** All 4 API routes (`/start`, `/status`, `/update`, `/cancel`), Supabase migration, `generate-all-helpers.ts`, `generate-all-helpers.test.ts`, `token-economics.ts`

---

## Unchanged: DB Persistence Layer

The Supabase persistence strategy is unchanged. The store still:
1. POSTs to `/api/generate-all/start` when starting
2. PATCHes to `/api/generate-all/update` after each item completes
3. POSTs to `/api/generate-all/cancel` on cancellation
4. GETs `/api/generate-all/status` on hydration

The only difference is that these calls happen from the Zustand store's async actions instead of from `useEffect` callbacks.

---

## Verification Plan

1. **Block persistence:** Start a chat conversation to "summarized" stage, click Generate All, type a new message in the chat → block must stay visible
2. **Model change during run:** Start generation, immediately change model on the 3rd item (while 1st is generating) → 3rd item generates with new model and correct credit cost
3. **Mockups model dropdown:** In idle state, change mockups model to gpt-5 → credit cost updates. Verify mockup generates correctly.
4. **"Done" text:** After generation completes, all items should show "Done" (not "Completed" or "Already generated")
5. **Nav links:** Click the `↗` arrow on a completed item → navigates to that tab
6. **Same-tab concurrent:** Open Project A, start Generate All, navigate to Project B, navigate back to Project A → generation state preserved
7. **Two-tab concurrent:** Open Project A in Tab 1 and Project B in Tab 2, start Generate All in both simultaneously → both generate correctly, progress shown independently
8. **Pending model selection:** Open Generate All in idle, note the queued model selections; start generation; while item 1 is generating, change item 3's model → item 3 should use the new model

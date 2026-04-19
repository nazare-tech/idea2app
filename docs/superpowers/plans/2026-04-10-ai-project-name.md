# AI Project Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the Prompt tab Q&A completes and the AI generates an idea summary, automatically generate and save a short project name, updating the header with a fade-in animation; until then the header shows a locked "✦ AI naming" badge.

**Architecture:** Server-side name generation runs in `/api/prompt-chat/route.ts` atomically after saving the description (both streaming and non-streaming paths). The name is returned in the existing `done` event as a new `projectName` field. The callback bubbles up through `PromptChatInterface` → `ContentEditor` → `ProjectWorkspace` where header state is updated. The locked badge state is controlled by `isNameSet` derived from `project.name !== "Untitled" || !!project.description`.

**Tech Stack:** Next.js App Router, OpenRouter (already wired), Supabase, React useState/useCallback, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/api/prompt-chat/route.ts` | Modify | Generate name server-side, add `projectName` to stream + JSON response |
| `src/components/chat/prompt-chat-interface.tsx` | Modify | Accept + call `onProjectNameGenerated` prop when `done` event has `projectName` |
| `src/components/layout/content-editor.tsx` | Modify | Thread `onProjectNameGenerated` prop down to `PromptChatInterface` |
| `src/components/workspace/project-workspace.tsx` | Modify | `isNameSet` state, locked header UI, fade-in on name update |

---

## Task 1: Server-side name generation (streaming path)

**Files:**
- Modify: `src/app/api/prompt-chat/route.ts`

The streaming path lives inside the `ReadableStream` `start()` callback. After saving the description (around line 396–404), add the name generation call. The `project` variable is already in scope with `project.name` available.

- [ ] **Step 1: Add name generation helper after the description-save block (streaming path)**

Find the streaming block that looks like this (around line 396–421):

```typescript
// Update project description with the latest summary if this was a summary stage
if (stage === "summary" && assistantContent) {
  await supabase
    .from("projects")
    .update({
      description: assistantContent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId!)
}

modelUsed = selectedModel

let conversationStage: "refining" | "summarized" = "refining"
if (stage === "summary") {
  conversationStage = "summarized"
} else if (isInitial) {
  conversationStage = "refining"
}

sendEvent({
  type: "done",
  userMessage,
  assistantMessage,
  stage: conversationStage,
  summary: stage === "summary" ? assistantContent : null,
})
```

Replace it with:

```typescript
// Update project description with the latest summary if this was a summary stage
if (stage === "summary" && assistantContent) {
  await supabase
    .from("projects")
    .update({
      description: assistantContent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId!)
}

modelUsed = selectedModel

// Generate a project name if still "Untitled" and we just summarized
let generatedProjectName: string | null = null
if (stage === "summary" && assistantContent && project.name === "Untitled") {
  try {
    const nameResponse = await openrouter.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "user",
          content: `Given this business idea summary, generate a short project name (3–6 words, title case, no quotes, no punctuation at end). Return only the name, nothing else.\n\nSummary:\n${assistantContent}`,
        },
      ],
      max_tokens: 20,
    })
    const rawName = nameResponse.choices[0]?.message?.content?.trim()
    if (rawName) {
      generatedProjectName = rawName
      await supabase
        .from("projects")
        .update({ name: generatedProjectName, updated_at: new Date().toISOString() })
        .eq("id", projectId!)
    }
  } catch (nameError) {
    console.error("[PromptChat] Project name generation failed (non-fatal):", nameError)
  }
}

let conversationStage: "refining" | "summarized" = "refining"
if (stage === "summary") {
  conversationStage = "summarized"
} else if (isInitial) {
  conversationStage = "refining"
}

sendEvent({
  type: "done",
  userMessage,
  assistantMessage,
  stage: conversationStage,
  summary: stage === "summary" ? assistantContent : null,
  projectName: generatedProjectName,
})
```

- [ ] **Step 2: Update the `PromptChatStreamEvent` type** (top of file, around line 26–30)

Find:
```typescript
type PromptChatStreamEvent =
  | { type: "start"; userMessage: unknown }
  | { type: "token"; content: string }
  | { type: "done"; userMessage: unknown; assistantMessage: unknown; stage: string; summary: string | null }
  | { type: "error"; error: string }
```

Replace with:
```typescript
type PromptChatStreamEvent =
  | { type: "start"; userMessage: unknown }
  | { type: "token"; content: string }
  | { type: "done"; userMessage: unknown; assistantMessage: unknown; stage: string; summary: string | null; projectName: string | null }
  | { type: "error"; error: string }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prompt-chat/route.ts
git commit -m "feat: generate AI project name server-side on summary (streaming path)"
```

---

## Task 2: Server-side name generation (non-streaming path)

**Files:**
- Modify: `src/app/api/prompt-chat/route.ts`

The non-streaming path is the `else` branch (no ReadableStream). It saves the description around line 491–499 and returns JSON at line 503–508.

- [ ] **Step 1: Add name generation after description-save in non-streaming path**

Find the non-streaming description-save block (around line 491–508):
```typescript
// Update project description with the latest summary if this was a summary stage
if (stage === "summary" && assistantContent) {
  await supabase
    .from("projects")
    .update({
      description: assistantContent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
}

console.log(`[PromptChat] project=${projectId} model=${selectedModel} stage=${stage}`)

return NextResponse.json({
  userMessage,
  assistantMessage,
  stage: conversationStage,
  summary: stage === "summary" ? assistantContent : null,
})
```

Replace with:
```typescript
// Update project description with the latest summary if this was a summary stage
if (stage === "summary" && assistantContent) {
  await supabase
    .from("projects")
    .update({
      description: assistantContent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
}

// Generate a project name if still "Untitled" and we just summarized
let generatedProjectName: string | null = null
if (stage === "summary" && assistantContent && project.name === "Untitled") {
  try {
    const nameResponse = await openrouter.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "user",
          content: `Given this business idea summary, generate a short project name (3–6 words, title case, no quotes, no punctuation at end). Return only the name, nothing else.\n\nSummary:\n${assistantContent}`,
        },
      ],
      max_tokens: 20,
    })
    const rawName = nameResponse.choices[0]?.message?.content?.trim()
    if (rawName) {
      generatedProjectName = rawName
      await supabase
        .from("projects")
        .update({ name: generatedProjectName, updated_at: new Date().toISOString() })
        .eq("id", projectId)
    }
  } catch (nameError) {
    console.error("[PromptChat] Project name generation failed (non-fatal):", nameError)
  }
}

console.log(`[PromptChat] project=${projectId} model=${selectedModel} stage=${stage}`)

return NextResponse.json({
  userMessage,
  assistantMessage,
  stage: conversationStage,
  summary: stage === "summary" ? assistantContent : null,
  projectName: generatedProjectName,
})
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/prompt-chat/route.ts
git commit -m "feat: generate AI project name server-side on summary (non-streaming path)"
```

---

## Task 3: Thread `onProjectNameGenerated` through PromptChatInterface

**Files:**
- Modify: `src/components/chat/prompt-chat-interface.tsx`

- [ ] **Step 1: Add prop to the interface**

Find the props interface (around line 33–38):
```typescript
  projectId: string
  projectName: string
  initialIdea: string
  selectedModel: string
  onIdeaSummary?: (summary: string) => void
  credits?: number
```

Replace with:
```typescript
  projectId: string
  projectName: string
  initialIdea: string
  selectedModel: string
  onIdeaSummary?: (summary: string) => void
  onProjectNameGenerated?: (name: string) => void
  credits?: number
```

- [ ] **Step 2: Destructure the new prop**

Find the function signature (around line 55–60):
```typescript
export function PromptChatInterface({
  projectId,
  initialIdea,
  selectedModel,
  onIdeaSummary,
  credits = 0,
}: PromptChatInterfaceProps) {
```

Replace with:
```typescript
export function PromptChatInterface({
  projectId,
  initialIdea,
  selectedModel,
  onIdeaSummary,
  onProjectNameGenerated,
  credits = 0,
}: PromptChatInterfaceProps) {
```

- [ ] **Step 3: Call the callback in the streaming `done` handler**

Find the streaming done handler (around line 180–184):
```typescript
      setConversationStage(stage)
      if (summary && onIdeaSummary) onIdeaSummary(summary)
    }
```

Replace with:
```typescript
      setConversationStage(stage)
      if (summary && onIdeaSummary) onIdeaSummary(summary)
      if (event.projectName && onProjectNameGenerated) onProjectNameGenerated(event.projectName)
    }
```

- [ ] **Step 4: Call the callback in the non-streaming done handler**

Find the non-streaming stage check (around line 421–424):
```typescript
      if (data.stage === "summarized" && data.summary && onIdeaSummary) {
        onIdeaSummary(data.summary)
      }
```

Replace with:
```typescript
      if (data.stage === "summarized" && data.summary && onIdeaSummary) {
        onIdeaSummary(data.summary)
      }
      if (data.projectName && onProjectNameGenerated) {
        onProjectNameGenerated(data.projectName)
      }
```

- [ ] **Step 5: Add `onProjectNameGenerated` to the `useCallback` deps array**

Find the `useCallback` that wraps `sendMessage` — it currently has `[onIdeaSummary]` in its deps. Update to:
```typescript
  }, [onIdeaSummary, onProjectNameGenerated])
```

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/prompt-chat-interface.tsx
git commit -m "feat: thread onProjectNameGenerated prop through PromptChatInterface"
```

---

## Task 4: Thread prop through ContentEditor

**Files:**
- Modify: `src/components/layout/content-editor.tsx`

- [ ] **Step 1: Add prop to ContentEditor's props type**

Find the props type (around line 54–58):
```typescript
  onGenerateContent: (model?: string, options?: { marketingBrief?: MarketingBrief }) => Promise<void>
  onUpdateDescription: (description: string) => Promise<void>
  onUpdateContent?: (newContent: string) => Promise<void>
```

Replace with:
```typescript
  onGenerateContent: (model?: string, options?: { marketingBrief?: MarketingBrief }) => Promise<void>
  onUpdateDescription: (description: string) => Promise<void>
  onProjectNameGenerated?: (name: string) => void
  onUpdateContent?: (newContent: string) => Promise<void>
```

- [ ] **Step 2: Destructure and pass it down**

Find the destructuring of `ContentEditor` props (around line 81–87 where props are listed). Add `onProjectNameGenerated` to the destructure list.

Then find the `<PromptChatInterface>` usage (around line 491–496):
```typescript
              projectId={projectId}
              projectName={projectName}
              initialIdea={projectDescription}
              selectedModel={selectedPromptModel}
              onIdeaSummary={handleIdeaSummary}
              credits={credits}
```

Replace with:
```typescript
              projectId={projectId}
              projectName={projectName}
              initialIdea={projectDescription}
              selectedModel={selectedPromptModel}
              onIdeaSummary={handleIdeaSummary}
              onProjectNameGenerated={onProjectNameGenerated}
              credits={credits}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/content-editor.tsx
git commit -m "feat: thread onProjectNameGenerated prop through ContentEditor"
```

---

## Task 5: Header locked state + name update in ProjectWorkspace

**Files:**
- Modify: `src/components/workspace/project-workspace.tsx`

- [ ] **Step 1: Add `isNameSet` state and `nameJustSet` state for fade animation**

Find the existing state declarations near the top of `ProjectWorkspace` (around line 98–103):
```typescript
  const [projectName, setProjectName] = useState(project.name)
  const [draftProjectName, setDraftProjectName] = useState(project.name)
  const [isEditingProjectName, setIsEditingProjectName] = useState(false)
  const [isSavingProjectName, setIsSavingProjectName] = useState(false)
```

Replace with:
```typescript
  const [projectName, setProjectName] = useState(project.name)
  const [draftProjectName, setDraftProjectName] = useState(project.name)
  const [isEditingProjectName, setIsEditingProjectName] = useState(false)
  const [isSavingProjectName, setIsSavingProjectName] = useState(false)
  const [isNameSet, setIsNameSet] = useState(
    project.name !== "Untitled" || !!project.description
  )
  const [nameJustSet, setNameJustSet] = useState(false)
```

- [ ] **Step 2: Add the `handleProjectNameGenerated` callback and a fallback unlock in `handleIdeaSummary`**

Add this function after `handleProjectNameUpdate` (around line 630):
```typescript
  const handleProjectNameGenerated = useCallback((name: string) => {
    setProjectName(name)
    setDraftProjectName(name)
    setIsNameSet(true)
    setNameJustSet(true)
    setTimeout(() => setNameJustSet(false), 1200)
  }, [])
```

Also find the existing `handleIdeaSummary` (or the place where `onUpdateDescription` is called after the summary fires). The summary callback is the safety net: if name generation fails silently server-side and `onProjectNameGenerated` never fires, we still want to unblock the user. Add `setIsNameSet(true)` there:

In `project-workspace.tsx`, find where `onUpdateDescription` / the description update is wired up (search for `onUpdateDescription`). It's passed as a prop down to `ContentEditor`. In `content-editor.tsx` it's called inside `handleIdeaSummary`. We can't easily set `isNameSet` from there since it lives in `ProjectWorkspace`.

Instead, pass an `onIdeaSummaryReceived` callback down the same chain. In `project-workspace.tsx`, add a handler:
```typescript
  const handleIdeaSummaryReceived = useCallback(() => {
    // Fallback: if AI name generation failed, unblock editing after a short delay
    // so the badge doesn't persist forever
    setTimeout(() => setIsNameSet(prev => prev || true), 3000)
  }, [])
```

Wire it down as a new prop `onIdeaSummaryReceived` on `ContentEditor` → `PromptChatInterface` (or simply call `setIsNameSet(true)` after a delay in the existing `onUpdateDescription` path in `project-workspace.tsx` where `handleUpdateDescription` is defined). The simplest approach: in `project-workspace.tsx`, find where `onUpdateDescription` is passed to `ContentEditor` and wrap it:

```typescript
  const handleUpdateDescription = async (description: string) => {
    // ... existing update logic ...
    // Fallback: unblock name editing if AI name didn't arrive within 3s
    setTimeout(() => setIsNameSet(prev => prev || true), 3000)
  }
```

Add this `setTimeout` line at the end of the existing `handleUpdateDescription` function (after the fetch call).

- [ ] **Step 3: Set `isNameSet = true` when user manually saves a name**

Find `finishProjectRename` function (around line 617–635). At the point where it calls `handleProjectNameUpdate`, ensure `isNameSet` is set to true. Find the try block:

```typescript
    setIsSavingProjectName(true)
    try {
      await handleProjectNameUpdate(nextName)
      setDraftProjectName(nextName)
    } catch {
      setDraftProjectName(projectName)
    } finally {
      setIsSavingProjectName(false)
    }
```

Replace with:
```typescript
    setIsSavingProjectName(true)
    try {
      await handleProjectNameUpdate(nextName)
      setDraftProjectName(nextName)
      setIsNameSet(true)
    } catch {
      setDraftProjectName(projectName)
    } finally {
      setIsSavingProjectName(false)
    }
```

- [ ] **Step 4: Update the header JSX to show locked state**

Find the header breadcrumb section (around line 1173–1182):
```typescript
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingProjectName(true)}
              className="ui-row-gap-2 min-w-0 text-left"
            >
              <span className="truncate font-semibold tracking-tight">{projectName}</span>
              <Pencil className="h-3.5 w-3.5 text-text-secondary" />
            </button>
          )}
```

Replace with:
```typescript
          ) : isNameSet ? (
            <button
              type="button"
              onClick={() => setIsEditingProjectName(true)}
              className="ui-row-gap-2 min-w-0 text-left"
            >
              <span
                className={`truncate font-semibold tracking-tight transition-opacity duration-700 ${nameJustSet ? "opacity-0 animate-[fadeIn_0.7s_ease_forwards]" : ""}`}
              >
                {projectName}
              </span>
              <Pencil className="h-3.5 w-3.5 text-text-secondary" />
            </button>
          ) : (
            <div className="flex items-center gap-2 cursor-default select-none">
              <span className="truncate font-semibold tracking-tight text-text-secondary">
                {projectName}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-950/40 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                ✦ AI naming
              </span>
            </div>
          )}
```

- [ ] **Step 5: Add `fadeIn` keyframe to global CSS (if not already present)**

Open `src/app/globals.css` (or whichever global CSS file the project uses). Add at the end:
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

If `animate-[fadeIn_0.7s_ease_forwards]` Tailwind arbitrary animation doesn't work in this project's Tailwind version, use an inline style instead:
```tsx
style={nameJustSet ? { animation: "fadeIn 0.7s ease forwards" } : undefined}
```

- [ ] **Step 6: Wire `handleProjectNameGenerated` into ContentEditor**

Find the `<ContentEditor>` usage in the JSX. It will have props like `onUpdateDescription`. Add:
```tsx
onProjectNameGenerated={handleProjectNameGenerated}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/workspace/project-workspace.tsx src/app/globals.css
git commit -m "feat: locked project name badge + AI name update with fade-in"
```

---

## Verification

1. Create a new project → header shows "Untitled" in muted grey with `✦ AI naming` badge; pencil hidden.
2. Complete the Prompt tab Q&A (answer the AI's questions).
3. When the summary generates: header name fades in to the AI-generated name (3–6 words, title case); badge disappears; pencil icon reappears.
4. Click the pencil → rename input opens and saves correctly.
5. Open an existing project with a custom name → badge never shows.
6. Open an existing project named "Untitled" that already has a description → badge never shows (the `|| !!project.description` guard).

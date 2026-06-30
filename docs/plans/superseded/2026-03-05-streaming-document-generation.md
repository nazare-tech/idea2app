# Streaming Document Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real-time chain-of-thought streaming to all document generation (PRD, MVP Plan, Tech Spec, Competitive Analysis, Mockups) — pipeline stage messages followed by live token-by-token document content.

**Architecture:** Reuse the existing NDJSON streaming format from `/api/chat`. Add `StreamCallbacks` to `analysis-pipelines.ts`, add a `stream: true` branch to all document API routes, and wire up a new `GenerationStreamPanel` component in `content-editor.tsx`. Polling fallback works automatically since `saveGeneratingState` is called before the fetch.

**Tech Stack:** Next.js App Router, OpenAI SDK (OpenRouter), React state, existing `MarkdownRenderer`

---

## Shared Types (reference throughout plan)

```typescript
// Used across files
export interface StreamStage {
  message: string
  step: number
  totalSteps: number
}

// NDJSON event union
type StreamEvent =
  | { type: "stage"; message: string; step: number; totalSteps: number }
  | { type: "token"; content: string }
  | { type: "done"; model: string }
  | { type: "error"; message: string }
```

---

## Task 1: Add StreamCallbacks to analysis-pipelines.ts

**Files:**
- Modify: `src/lib/analysis-pipelines.ts`

### Step 1: Add StreamCallbacks interface after existing type definitions (after line 48)

```typescript
export interface StreamCallbacks {
  onStage?: (message: string, step: number, totalSteps: number) => void
  onToken?: (content: string) => void
}
```

### Step 2: Modify `runCompetitiveAnalysis` signature (line 52)

Change:
```typescript
export async function runCompetitiveAnalysis(
  input: CompetitiveAnalysisInput
): Promise<AnalysisResult> {
```
To:
```typescript
export async function runCompetitiveAnalysis(
  input: CompetitiveAnalysisInput,
  callbacks?: StreamCallbacks
): Promise<AnalysisResult> {
```

### Step 3: Add stage calls + streaming in `runCompetitiveAnalysis`

After `const model = input.model || DEFAULT_MODEL`, add:
```typescript
  callbacks?.onStage?.("Identifying top competitors...", 1, 4)
```

After the Perplexity try/catch block (after line 87), add:
```typescript
  callbacks?.onStage?.("Extracting competitor details...", 2, 4)
```

After the Tavily try/catch block (after line 106), add:
```typescript
  callbacks?.onStage?.("Writing competitive analysis...", 3, 4)
```

Replace the non-streaming OpenRouter call (lines 117-132) with:
```typescript
  const stream = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: COMPETITIVE_ANALYSIS_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildCompetitiveAnalysisUserPrompt(
          input.idea,
          input.name,
          competitorContext
        ),
      },
    ],
    max_tokens: 8192,
    temperature: 0.3,
    stream: callbacks?.onToken ? true : false,
  })

  let content: string
  if (callbacks?.onToken && Symbol.asyncIterator in stream) {
    content = ""
    for await (const chunk of stream as AsyncIterable<import("openai/resources/chat/completions").ChatCompletionChunk>) {
      const token = chunk.choices?.[0]?.delta?.content ?? ""
      if (token) {
        content += token
        callbacks.onToken(token)
      }
    }
  } else {
    const resp = stream as import("openai/resources/chat/completions").ChatCompletion
    content = resp.choices[0]?.message?.content ?? ""
  }

  if (!content) throw new Error("No content returned from OpenRouter synthesis")
  callbacks?.onStage?.("Finalizing analysis...", 4, 4)
```

### Step 4: Modify `runPRD` signature and add stages (line 142)

Change signature:
```typescript
export async function runPRD(input: PRDInput, callbacks?: StreamCallbacks): Promise<AnalysisResult> {
```

After `const model = input.model || DEFAULT_MODEL`:
```typescript
  callbacks?.onStage?.("Analyzing your idea...", 1, 3)
```

Replace the non-streaming OpenRouter call with streaming version:
```typescript
  callbacks?.onStage?.("Writing product requirements...", 2, 3)
  const stream = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: PRD_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildPRDUserPrompt(input.idea, input.name, competitiveContext),
      },
    ],
    max_tokens: 8192,
    temperature: 0.3,
    stream: callbacks?.onToken ? true : false,
  })

  let content: string
  if (callbacks?.onToken && Symbol.asyncIterator in stream) {
    content = ""
    for await (const chunk of stream as AsyncIterable<import("openai/resources/chat/completions").ChatCompletionChunk>) {
      const token = chunk.choices?.[0]?.delta?.content ?? ""
      if (token) { content += token; callbacks.onToken(token) }
    }
  } else {
    const resp = stream as import("openai/resources/chat/completions").ChatCompletion
    content = resp.choices[0]?.message?.content ?? ""
  }

  if (!content) throw new Error("No content returned from OpenRouter for PRD")
  callbacks?.onStage?.("Finalizing PRD...", 3, 3)
```

### Step 5: Modify `runMVPPlan` signature and add stages (line 170)

Change signature:
```typescript
export async function runMVPPlan(input: MVPPlanInput, callbacks?: StreamCallbacks): Promise<AnalysisResult> {
```

After `const model = input.model || DEFAULT_MODEL`:
```typescript
  callbacks?.onStage?.("Reviewing PRD requirements...", 1, 3)
```

Replace non-streaming call with:
```typescript
  callbacks?.onStage?.("Writing MVP roadmap...", 2, 3)
  const stream = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: MVP_PLAN_SYSTEM_PROMPT },
      { role: "user", content: buildMVPPlanUserPrompt(input.idea, input.name, prdContext) },
    ],
    max_tokens: 8192,
    temperature: 0.3,
    stream: callbacks?.onToken ? true : false,
  })

  let content: string
  if (callbacks?.onToken && Symbol.asyncIterator in stream) {
    content = ""
    for await (const chunk of stream as AsyncIterable<import("openai/resources/chat/completions").ChatCompletionChunk>) {
      const token = chunk.choices?.[0]?.delta?.content ?? ""
      if (token) { content += token; callbacks.onToken(token) }
    }
  } else {
    const resp = stream as import("openai/resources/chat/completions").ChatCompletion
    content = resp.choices[0]?.message?.content ?? ""
  }

  if (!content) throw new Error("No content returned from OpenRouter for MVP Plan")
  callbacks?.onStage?.("Finalizing MVP plan...", 3, 3)
```

### Step 6: Modify `runTechSpec` signature and add stages (line 199)

Change signature:
```typescript
export async function runTechSpec(input: TechSpecInput, callbacks?: StreamCallbacks): Promise<AnalysisResult> {
```

After `const model = input.model || DEFAULT_MODEL`:
```typescript
  callbacks?.onStage?.("Reviewing product requirements...", 1, 3)
```

Replace non-streaming call with:
```typescript
  callbacks?.onStage?.("Writing technical specifications...", 2, 3)
  const stream = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: TECH_SPEC_SYSTEM_PROMPT },
      { role: "user", content: buildTechSpecUserPrompt(input.idea, input.name, input.prd) },
    ],
    max_tokens: 8192,
    temperature: 0.3,
    stream: callbacks?.onToken ? true : false,
  })

  let content: string
  if (callbacks?.onToken && Symbol.asyncIterator in stream) {
    content = ""
    for await (const chunk of stream as AsyncIterable<import("openai/resources/chat/completions").ChatCompletionChunk>) {
      const token = chunk.choices?.[0]?.delta?.content ?? ""
      if (token) { content += token; callbacks.onToken(token) }
    }
  } else {
    const resp = stream as import("openai/resources/chat/completions").ChatCompletion
    content = resp.choices[0]?.message?.content ?? ""
  }

  if (!content) throw new Error("No content returned from OpenRouter for Tech Spec")
  callbacks?.onStage?.("Finalizing tech spec...", 3, 3)
```

### Step 7: Verify TypeScript compiles

Run: `npx tsc --noEmit`
Expected: No errors related to analysis-pipelines.ts

### Step 8: Commit

```bash
git add src/lib/analysis-pipelines.ts
git commit -m "feat: add StreamCallbacks to analysis pipeline functions"
```

---

## Task 2: Add streaming branch to /api/analysis/[type]/route.ts

**Files:**
- Modify: `src/app/api/analysis/[type]/route.ts`

### Step 1: Add helper at top of route handler (after imports, before `export const maxDuration`)

```typescript
const encoder = new TextEncoder()

function createStreamSender(controller: ReadableStreamDefaultController) {
  return (event: object) =>
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
}
```

### Step 2: Read the `stream` flag from request body

In the POST handler, modify the body destructuring (line 45):
```typescript
const { idea, name, competitiveAnalysis, prd, model, stream: streamRequested } = body
```

### Step 3: Insert streaming branch before the `// Route to the appropriate in-house pipeline` comment (before line 105)

Insert after the credits check block and before the pipeline routing:

```typescript
    // ─── Streaming path ────────────────────────────────────────────────
    if (streamRequested === true) {
      const readableStream = new ReadableStream({
        async start(controller) {
          const send = createStreamSender(controller)
          let generatedContent = ""

          try {
            const callbacks: import("@/lib/analysis-pipelines").StreamCallbacks = {
              onStage: (message, step, totalSteps) =>
                send({ type: "stage", message, step, totalSteps }),
              onToken: (content) => {
                generatedContent += content
                send({ type: "token", content })
              },
            }

            let streamResult: { content: string; source: string; model: string }

            if (type === "competitive-analysis") {
              streamResult = await runCompetitiveAnalysis({ idea, name, model }, callbacks)
            } else if (type === "prd") {
              streamResult = await runPRD({ idea, name, competitiveAnalysis, model }, callbacks)
            } else if (type === "mvp-plan") {
              streamResult = await runMVPPlan({ idea, name, prd, model }, callbacks)
            } else if (type === "tech-spec") {
              streamResult = await runTechSpec({ idea, name, prd, model }, callbacks)
            } else {
              streamResult = await callOpenRouterFallback(type, idea, name, model)
            }

            // Save to DB (same as non-streaming path)
            const metadata = {
              source: streamResult.source,
              model: streamResult.model,
              generated_at: new Date().toISOString(),
            }
            if (type === "prd") {
              await supabase.from("prds").insert({ project_id: projectId, content: streamResult.content })
            } else if (type === "mvp-plan") {
              await supabase.from("mvp_plans").insert({ project_id: projectId, content: streamResult.content })
            } else if (type === "tech-spec") {
              await supabase.from("tech_specs").insert({ project_id: projectId, content: streamResult.content })
            } else {
              await supabase.from("analyses").insert({ project_id: projectId, type, content: streamResult.content, metadata })
            }

            await supabase
              .from("projects")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("id", projectId)

            modelUsed = streamResult.model
            aiSource = streamResult.source as "openrouter" | "inhouse"
            send({ type: "done", model: streamResult.model })
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Generation failed"
            send({ type: "error", message: msg })
            errorType = "generation_error"
            errorMessage = msg
            statusCode = 500
          } finally {
            controller.close()
          }
        },
      })

      return new Response(readableStream, {
        headers: { "Content-Type": "application/x-ndjson" },
      })
    }
    // ─── End streaming path ─────────────────────────────────────────────
```

### Step 4: Verify TypeScript compiles

Run: `npx tsc --noEmit`

### Step 5: Smoke test with curl

```bash
curl -X POST http://localhost:3000/api/analysis/prd \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"projectId":"<id>","idea":"test idea","name":"test","stream":true}' \
  --no-buffer
```
Expected: NDJSON lines appear incrementally (stage events, then token events, then done)

### Step 6: Commit

```bash
git add "src/app/api/analysis/[type]/route.ts"
git commit -m "feat: add NDJSON streaming branch to analysis API route"
```

---

## Task 3: Add streaming to /api/mockups/generate/route.ts

**Files:**
- Modify: `src/app/api/mockups/generate/route.ts`

### Step 1: Add helper and read stream flag

Add after imports:
```typescript
const encoder = new TextEncoder()
function createStreamSender(controller: ReadableStreamDefaultController) {
  return (event: object) =>
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
}
```

In the body destructuring (line 37), change:
```typescript
const { mvpPlan, projectName, model } = body
```
To:
```typescript
const { mvpPlan, projectName, model, stream: streamRequested } = body
```

### Step 2: Insert streaming branch before `// Generate mockup using OpenRouter` (before line 88)

```typescript
    // ─── Streaming path ─────────────────────────────────────────────────
    if (streamRequested === true) {
      const readableStream = new ReadableStream({
        async start(controller) {
          const send = createStreamSender(controller)
          let generatedContent = ""

          try {
            send({ type: "stage", message: "Analyzing MVP plan...", step: 1, totalSteps: 3 })

            const openrouterStream = new OpenAI({
              baseURL: "https://openrouter.ai/api/v1",
              apiKey: process.env.OPENROUTER_API_KEY || "",
            })

            send({ type: "stage", message: "Generating UI mockups...", step: 2, totalSteps: 3 })

            const streamResp = await openrouterStream.chat.completions.create({
              model: selectedModel,
              messages: [{ role: "user", content: buildMockupPrompt(mvpPlan, projectName) }],
              max_tokens: 16384,
              stream: true,
            })

            for await (const chunk of streamResp) {
              const token = chunk.choices?.[0]?.delta?.content ?? ""
              if (token) {
                generatedContent += token
                send({ type: "token", content: token })
              }
            }

            if (!generatedContent) throw new Error("No content returned from OpenRouter")

            send({ type: "stage", message: "Saving mockups...", step: 3, totalSteps: 3 })
            modelUsed = selectedModel

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from("mockups").insert({
              project_id: projectId,
              content: generatedContent,
              model_used: selectedModel,
              metadata: { source: "openrouter", model: selectedModel, generated_at: new Date().toISOString() },
            })

            await supabase
              .from("projects")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("id", projectId)

            send({ type: "done", model: selectedModel })
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Mockup generation failed"
            send({ type: "error", message: msg })
            statusCode = 500
            errorType = "generation_error"
            errorMessage = msg
          } finally {
            controller.close()
          }
        },
      })

      return new Response(readableStream, {
        headers: { "Content-Type": "application/x-ndjson" },
      })
    }
    // ─── End streaming path ─────────────────────────────────────────────
```

### Step 3: Compile check + commit

```bash
npx tsc --noEmit
git add src/app/api/mockups/generate/route.ts
git commit -m "feat: add NDJSON streaming to mockups generate route"
```

---

## Task 4: Create parse-document-stream.ts utility

**Files:**
- Create: `src/lib/parse-document-stream.ts`

### Step 1: Create the file

```typescript
// src/lib/parse-document-stream.ts
// NDJSON stream parser for document generation endpoints.
// Mirrors the parseChatStream pattern in chat-interface.tsx.

export interface StreamStage {
  message: string
  step: number
  totalSteps: number
}

export interface ParseDocumentStreamCallbacks {
  onStage: (stage: StreamStage) => void
  onToken: (content: string) => void
  onDone: (model: string) => void
  onError: (message: string) => void
}

export async function parseDocumentStream(
  response: Response,
  callbacks: ParseDocumentStreamCallbacks
): Promise<void> {
  if (!response.body) {
    callbacks.onError("No response body")
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? "" // keep incomplete last line

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        try {
          const event = JSON.parse(trimmed) as
            | { type: "stage"; message: string; step: number; totalSteps: number }
            | { type: "token"; content: string }
            | { type: "done"; model: string }
            | { type: "error"; message: string }

          if (event.type === "stage") {
            callbacks.onStage({ message: event.message, step: event.step, totalSteps: event.totalSteps })
          } else if (event.type === "token") {
            callbacks.onToken(event.content)
          } else if (event.type === "done") {
            callbacks.onDone(event.model)
            return
          } else if (event.type === "error") {
            callbacks.onError(event.message)
            return
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
```

### Step 2: Compile check

```bash
npx tsc --noEmit
```

### Step 3: Commit

```bash
git add src/lib/parse-document-stream.ts
git commit -m "feat: add NDJSON document stream parser utility"
```

---

## Task 5: Create GenerationStreamPanel component

**Files:**
- Create: `src/components/workspace/generation-stream-panel.tsx`

### Step 1: Create the file

```tsx
// src/components/workspace/generation-stream-panel.tsx
"use client"

import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { StreamStage } from "@/lib/parse-document-stream"

interface GenerationStreamPanelProps {
  documentTitle: string
  stages: StreamStage[]
  currentStep: number  // 0 means not started, 1+ means that step is active
  streamContent: string
  projectId: string
}

export function GenerationStreamPanel({
  documentTitle,
  stages,
  currentStep,
  streamContent,
  projectId,
}: GenerationStreamPanelProps) {
  // Derive all stage entries to display from the latest stage event
  const totalSteps = stages.length > 0 ? stages[stages.length - 1].totalSteps : 0
  const displayStages = stages.length > 0 ? stages : []

  return (
    <div className="flex flex-col gap-6 py-8 px-4">
      {/* Stage progress */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground mb-3">
          Generating {documentTitle}...
        </p>
        {displayStages.map((stage) => {
          const isDone = stage.step < currentStep
          const isActive = stage.step === currentStep
          return (
            <div key={stage.step} className="flex items-center gap-3">
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : isActive ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span
                className={
                  isDone
                    ? "text-sm text-muted-foreground line-through"
                    : isActive
                    ? "text-sm font-medium text-foreground"
                    : "text-sm text-muted-foreground/50"
                }
              >
                {stage.message}
              </span>
            </div>
          )
        })}
      </div>

      {/* Live streaming content */}
      {streamContent && (
        <>
          <div className="border-t border-border" />
          <MarkdownRenderer
            content={streamContent}
            projectId={projectId}
            enableInlineEditing={false}
          />
        </>
      )}

      {/* Empty state when waiting for first token */}
      {!streamContent && currentStep > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Waiting for content...</span>
        </div>
      )}
    </div>
  )
}
```

### Step 2: Compile check

```bash
npx tsc --noEmit
```

### Step 3: Commit

```bash
git add src/components/workspace/generation-stream-panel.tsx
git commit -m "feat: add GenerationStreamPanel component for live streaming UI"
```

---

## Task 6: Update ContentEditor to accept streaming props

**Files:**
- Modify: `src/components/layout/content-editor.tsx`

### Step 1: Add import at top of file (after existing imports)

```typescript
import { GenerationStreamPanel } from "@/components/workspace/generation-stream-panel"
import type { StreamStage } from "@/lib/parse-document-stream"
```

### Step 2: Add new props to `ContentEditorProps` interface (after `isGenerating: boolean`)

```typescript
  streamStages?: StreamStage[]
  streamCurrentStep?: number
  streamContent?: string
```

### Step 3: Destructure new props in component signature

Find:
```typescript
export function ContentEditor({
  documentType,
  projectId,
  projectName,
  projectDescription,
  content,
  onGenerateContent,
  onUpdateDescription,
  onUpdateContent,
  isGenerating,
  credits,
  prerequisiteValidation,
  currentVersion,
  totalVersions,
  onVersionChange,
}: ContentEditorProps) {
```
Add the new props:
```typescript
  streamStages,
  streamCurrentStep,
  streamContent,
```
(after `onVersionChange`)

### Step 4: Replace the `isGenerating` loading block (lines 453-463)

Find this block:
```tsx
                    {isGenerating ? (
                      <div className="flex flex-col items-center justify-center py-24">
                        <span className="loader"></span>
                        <div className="mt-6 text-center">
                          <p className="text-sm ui-font-medium text-foreground mb-2">
                            Generating {config.title}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            This may take a moment
                          </p>
                        </div>
                      </div>
                    ) : content ? (
```

Replace with:
```tsx
                    {isGenerating ? (
                      streamStages && streamStages.length > 0 ? (
                        <GenerationStreamPanel
                          documentTitle={config.title}
                          stages={streamStages}
                          currentStep={streamCurrentStep ?? 0}
                          streamContent={streamContent ?? ""}
                          projectId={projectId}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-24">
                          <span className="loader"></span>
                          <div className="mt-6 text-center">
                            <p className="text-sm ui-font-medium text-foreground mb-2">
                              Generating {config.title}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              This may take a moment
                            </p>
                          </div>
                        </div>
                      )
                    ) : content ? (
```

### Step 5: Compile check

```bash
npx tsc --noEmit
```

### Step 6: Commit

```bash
git add src/components/layout/content-editor.tsx
git commit -m "feat: update ContentEditor to render GenerationStreamPanel when streaming"
```

---

## Task 7: Wire streaming into project-workspace.tsx

**Files:**
- Modify: `src/components/workspace/project-workspace.tsx`

### Step 1: Add imports at top

```typescript
import { parseDocumentStream } from "@/lib/parse-document-stream"
import type { StreamStage } from "@/lib/parse-document-stream"
```

### Step 2: Add streaming state (near other useState declarations, after `generatingDocuments` state)

```typescript
  const [streamStages, setStreamStages] = useState<StreamStage[]>([])
  const [streamCurrentStep, setStreamCurrentStep] = useState<number>(0)
  const [streamContent, setStreamContent] = useState<string>("")
```

### Step 3: Add a helper to clear streaming state

After the state declarations:
```typescript
  const clearStreamState = useCallback(() => {
    setStreamStages([])
    setStreamCurrentStep(0)
    setStreamContent("")
  }, [])
```

### Step 4: Modify `handleGenerateContent` to use streaming

The current fetch block (lines 660-688) sends a POST and awaits JSON. Replace with a streaming-aware version.

**Replace** the `response = await fetch(endpoint, {...})` block and subsequent `if (!response.ok)` check and `didGenerate = true` with:

```typescript
      clearStreamState()

      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          projectId: project.id,
          idea: project.description,
          name: projectName,
          stream: true,
          ...(model && { model }),
          ...(generatingType === "deploy" && { appType: "dynamic" }),
          ...(generatingType === "prd" && competitiveAnalysis?.content && {
            competitiveAnalysis: competitiveAnalysis.content
          }),
          ...(generatingType === "mvp" && latestPrd?.content && {
            prd: latestPrd.content
          }),
          ...(generatingType === "mockups" && latestMvp?.content && {
            mvpPlan: latestMvp.content,
            projectName: project.name
          }),
          ...(generatingType === "techspec" && latestPrd?.content && {
            prd: latestPrd.content
          }),
        }),
      })

      if (!response.ok) {
        let errorMsg = "Failed to generate content"
        try {
          const errorData = await response.json()
          if (errorData?.error) errorMsg = errorData.error
        } catch { /* ignore */ }
        throw new Error(errorMsg)
      }

      const contentType = response.headers.get("Content-Type") ?? ""
      if (contentType.includes("application/x-ndjson")) {
        // Streaming path
        let streamError: string | null = null
        await parseDocumentStream(response, {
          onStage: (stage) => {
            setStreamStages(prev => {
              // Deduplicate by step number
              const existing = prev.find(s => s.step === stage.step)
              if (existing) return prev
              return [...prev, stage]
            })
            setStreamCurrentStep(stage.step)
          },
          onToken: (content) => {
            setStreamContent(prev => prev + content)
          },
          onDone: () => {
            didGenerate = true
          },
          onError: (message) => {
            streamError = message
          },
        })
        if (streamError) throw new Error(streamError)
      } else {
        // Fallback: non-streaming JSON response
        didGenerate = true
      }
```

### Step 5: Clear streaming state in `finally` block

In the `finally` block (lines 709-713), after clearing `generatingDocuments`, add:
```typescript
      clearStreamState()
```

So the finally block becomes:
```typescript
    } finally {
      setGeneratingDocuments(prev => ({ ...prev, [generatingType]: false }))
      saveGeneratingState(generatingType, false)
      clearStreamState()
    }
```

### Step 6: Pass streaming props to ContentEditor in JSX (around line 869)

Find:
```tsx
          <ContentEditor
            documentType={activeDocument}
            projectId={project.id}
            projectName={projectName}
            projectDescription={project.description || ""}
            content={getDocumentContent(activeDocument)}
            onGenerateContent={handleGenerateContent}
            onUpdateDescription={handleUpdateDescription}
            onUpdateContent={handleUpdateContent}
            isGenerating={generatingDocuments[activeDocument]}
            credits={credits}
            prerequisiteValidation={checkPrerequisites(activeDocument)}
            currentVersion={selectedVersionIndex[activeDocument] || 0}
            totalVersions={getTotalVersions(activeDocument)}
            onVersionChange={(index) => handleVersionChange(activeDocument, index)}
          />
```

Add 3 new props:
```tsx
            streamStages={streamStages}
            streamCurrentStep={streamCurrentStep}
            streamContent={streamContent}
```

### Step 7: Full compile check

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 8: Run dev server and test manually

```bash
npm run dev
```

Test checklist:
- [ ] Open a project, navigate to PRD tab
- [ ] Click Generate — stages appear immediately ("Analyzing your idea...", spinner)
- [ ] Stage checkmarks appear as pipeline progresses
- [ ] Document content streams in token by token below the stages
- [ ] On completion: streaming UI disappears, full rendered document appears
- [ ] Navigate away mid-generation, come back — polling detects completion and loads document
- [ ] Test all 5 document types: competitive, prd, mvp, mockups, techspec
- [ ] Regenerating an existing doc shows stream panel again

### Step 9: Commit

```bash
git add src/components/workspace/project-workspace.tsx
git commit -m "feat: wire streaming state into project-workspace for live document generation"
```

---

## Task 8: End-to-end verification

### Verify streaming works for all document types

1. **Competitive Analysis** — should show 4 stages including Perplexity + Tavily steps
2. **PRD** — 3 stages, content streams markdown with headers
3. **MVP Plan** — 3 stages
4. **Tech Spec** — 3 stages
5. **Mockups** — 3 stages (mockup JSON streams — note: mockup renderer only parses complete JSON, so the final render happens after streaming completes via `router.refresh()`, which is correct)

### Verify fallback (non-streaming)

Test that removing `stream: true` from the fetch body still returns proper JSON:
```bash
curl -X POST http://localhost:3000/api/analysis/prd \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{"projectId":"<id>","idea":"test","name":"test"}'
```
Expected: JSON response `{ content, source, model, type }`

### Verify background generation fallback

1. Start generating a PRD
2. Immediately navigate to a different browser tab
3. Come back after ~30 seconds
4. Verify the polling mechanism detected completion and document loaded

### Final commit

```bash
git add docs/plans/2026-03-05-streaming-document-generation.md
git commit -m "docs: add streaming document generation implementation plan"
```

---

## Notes for Implementer

- **Mockup streaming UX**: The `MockupRenderer` parses JSON, so streaming raw JSON tokens won't render incrementally — that's fine. The streaming panel shows stages + the raw text stream. When generation completes, `router.refresh()` loads the saved mockup for proper rendering.
- **TypeScript stream typing**: The OpenAI SDK returns `ChatCompletion | Stream<ChatCompletionChunk>` based on the `stream` flag type. We guard with `Symbol.asyncIterator in stream` to handle both cases.
- **Error recovery**: If the stream errors mid-way, `streamError` is captured and thrown, which triggers the existing error alert. The `finally` block clears all streaming state cleanly.
- **Deploy tab**: `generatingType === "deploy"` is not streaming — it goes to `/api/generate-app` which is a different system. The `stream: true` flag will be ignored there and fall back to the JSON path.

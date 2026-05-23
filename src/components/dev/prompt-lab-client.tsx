"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { AlertCircle, CheckCircle2, FlaskConical, History, Loader2, Play, Save, Wand2 } from "lucide-react"

import {
  CompetitiveDetailSection,
  CompetitiveOverviewSection,
} from "@/components/analysis/competitive-analysis-document"
import {
  MvpPlanDocumentBlocks,
  PrdDocumentBlocks,
} from "@/components/analysis/planning-document-blocks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { MockupRenderer } from "@/components/ui/mockup-renderer"
import { Textarea } from "@/components/ui/textarea"
import {
  PROMPT_LAB_ARTIFACT_LABELS,
  PROMPT_LAB_ARTIFACTS,
  PROMPT_LAB_DEFAULT_LAUNCH_BRIEF,
  getPromptLabModelOptions,
  type PromptLabArtifact,
} from "@/lib/prompt-lab-shared"
import { cn } from "@/lib/utils"

export interface PromptLabProjectOption {
  id: string
  name: string
  description: string | null
  updatedAt: string | null
}

interface PromptLabDraft {
  id: string
  title: string
  artifact_type: string
  model_id: string
  system_prompt: string
  user_prompt: string
  updated_at: string
}

interface PromptLabRun {
  id: string
  title: string
  artifact_type: string
  model_id: string
  system_prompt: string
  user_prompt: string
  output_content: string | null
  status: string
  error_message: string | null
  notes: string | null
  created_at: string
}

interface PromptLabContextResponse {
  project: {
    id: string
    name: string
    idea: string
    updatedAt: string | null
  }
  promptDefaults: {
    systemPrompt: string
    userPrompt: string
    model: string
  }
  upstream: Record<string, { id: string; content: string; created_at?: string | null; metadata?: Record<string, unknown> | null } | null>
}

const ARTIFACTS = PROMPT_LAB_ARTIFACTS
const MOCKUP_OPTIONS = ["A", "B", "C"] as const

function formatTime(value: string | null | undefined) {
  if (!value) return "No timestamp"
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function buildLaunchUserPrompt(projectName: string, idea: string, brief: typeof PROMPT_LAB_DEFAULT_LAUNCH_BRIEF) {
  return `Product idea: ${idea}

Product name: ${projectName}

Launch brief:
- Target audience: ${brief.targetAudience}
- Current stage: ${brief.stage}
- Budget: ${brief.budget}
- Preferred channels: ${brief.channels}
- Launch window: ${brief.launchWindow}`
}

function LabPreviewDiagnostics({ content }: { content: string }) {
  const stats = useMemo(() => {
    const lines = content.split("\n")
    return {
      characters: content.length,
      words: content.trim() ? content.trim().split(/\s+/).length : 0,
      headings: lines.filter((line) => /^#{1,6}\s/.test(line)).length,
      tables: lines.filter((line) => /^\s*\|.+\|\s*$/.test(line)).length,
      checkboxes: lines.filter((line) => /^\s*[-*]\s+\[[ x]\]/i.test(line)).length,
    }
  }, [content])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="rounded-md border border-border-subtle bg-background p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{key}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>
      <MarkdownRenderer content={content} />
    </div>
  )
}

function ArtifactPreview({
  artifact,
  content,
  projectId,
  projectName,
  mode,
}: {
  artifact: PromptLabArtifact
  content: string
  projectId: string
  projectName: string
  mode: "production" | "experimental"
}) {
  if (!content) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-border-subtle bg-card p-8 text-center text-sm text-muted-foreground">
        Run an artifact or choose a saved run to preview output here.
      </div>
    )
  }

  if (mode === "experimental") {
    return (
      <div className="rounded-lg border border-border-subtle bg-card p-5">
        <LabPreviewDiagnostics content={content} />
      </div>
    )
  }

  if (artifact === "competitive") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border-subtle bg-card p-5">
          <CompetitiveOverviewSection content={content} metadata={null} projectId={projectId} />
        </div>
        <div className="rounded-lg border border-border-subtle bg-card p-5">
          <CompetitiveDetailSection content={content} metadata={null} projectId={projectId} />
        </div>
      </div>
    )
  }

  if (artifact === "prd") {
    return (
      <div className="rounded-lg border border-border-subtle bg-card p-5">
        <PrdDocumentBlocks content={content} projectId={projectId} />
      </div>
    )
  }

  if (artifact === "mvp") {
    return (
      <div className="rounded-lg border border-border-subtle bg-card p-5">
        <MvpPlanDocumentBlocks content={content} projectId={projectId} />
      </div>
    )
  }

  if (artifact === "mockups") {
    return (
      <div className="rounded-lg border border-border-subtle bg-card p-5">
        <MockupRenderer content={content} projectName={projectName} projectId={projectId} />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-card p-5">
      <MarkdownRenderer content={content} projectId={projectId} />
    </div>
  )
}

export function PromptLabClient({ projects }: { projects: PromptLabProjectOption[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "")
  const [artifact, setArtifact] = useState<PromptLabArtifact>("competitive")
  const [mockupOption, setMockupOption] = useState<typeof MOCKUP_OPTIONS[number]>("A")
  const [context, setContext] = useState<PromptLabContextResponse | null>(null)
  const [systemPrompt, setSystemPrompt] = useState("")
  const [userPrompt, setUserPrompt] = useState("")
  const [model, setModel] = useState("")
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [output, setOutput] = useState("")
  const [drafts, setDrafts] = useState<PromptLabDraft[]>([])
  const [runs, setRuns] = useState<PromptLabRun[]>([])
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<"production" | "experimental">("production")
  const [launchBrief, setLaunchBrief] = useState(PROMPT_LAB_DEFAULT_LAUNCH_BRIEF)
  const [busyAction, setBusyAction] = useState<"draft" | "run" | null>(null)
  const [isPending, startTransition] = useTransition()
  const lastLoadedArtifactRef = useRef<PromptLabArtifact>(artifact)

  const selectedProject = projects.find((project) => project.id === projectId) ?? null
  const modelOptions = useMemo(() => getPromptLabModelOptions(artifact, model), [artifact, model])
  const selectedModelOption = modelOptions.find((option) => option.id === model) ?? null
  const canRun = Boolean(projectId && artifact && systemPrompt.trim() && userPrompt.trim() && model.trim())

  const contextUrl = useMemo(() => {
    if (!projectId) return ""
    const params = new URLSearchParams({ projectId, artifact, mockupOption })
    return `/api/dev/prompt-lab/context?${params.toString()}`
  }, [artifact, mockupOption, projectId])

  async function loadHistory(nextProjectId = projectId, nextArtifact = artifact) {
    if (!nextProjectId) return
    const params = new URLSearchParams({ projectId: nextProjectId, artifact: nextArtifact })
    const [draftResponse, runResponse] = await Promise.all([
      fetch(`/api/dev/prompt-lab/drafts?${params.toString()}`),
      fetch(`/api/dev/prompt-lab/runs?${params.toString()}`),
    ])

    if (draftResponse.ok) {
      const data = await draftResponse.json()
      setDrafts(data.drafts ?? [])
    }
    if (runResponse.ok) {
      const data = await runResponse.json()
      setRuns(data.runs ?? [])
    }
  }

  useEffect(() => {
    if (!contextUrl) return
    let cancelled = false
    setError(null)
    setStatus("Loading project context...")

    fetch(contextUrl)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Failed to load context")
        return data as PromptLabContextResponse
      })
      .then((data) => {
        if (cancelled) return
        const artifactChanged = lastLoadedArtifactRef.current !== artifact
        lastLoadedArtifactRef.current = artifact
        setContext(data)
        setSystemPrompt((currentSystemPrompt) =>
          artifactChanged || !currentSystemPrompt.trim()
            ? data.promptDefaults.systemPrompt
            : currentSystemPrompt,
        )
        setUserPrompt(data.promptDefaults.userPrompt)
        setModel((currentModel) =>
          artifactChanged || !currentModel.trim()
            ? data.promptDefaults.model
            : currentModel,
        )
        setTitle((currentTitle) =>
          artifactChanged || !currentTitle.trim()
            ? `${PROMPT_LAB_ARTIFACT_LABELS[artifact]} prompt test`
            : currentTitle,
        )
        setOutput("")
        setStatus(null)
        void loadHistory(data.project.id, artifact)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load Prompt Lab context")
        setStatus(null)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextUrl])

  function saveDraft() {
    if (!canRun) return
    setError(null)
    setStatus("Saving draft...")
    setBusyAction("draft")

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/dev/prompt-lab/drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              artifact,
              title,
              systemPrompt,
              userPrompt,
              model,
            }),
          })
          const data = await response.json()
          if (!response.ok) {
            setError(data.error || "Failed to save draft")
          } else {
            setStatus("Draft saved")
            await loadHistory()
          }
        } finally {
          setBusyAction(null)
        }
      })()
    })
  }

  function runArtifact() {
    if (!canRun || !selectedProject) return
    setError(null)
    setStatus(`Running ${PROMPT_LAB_ARTIFACT_LABELS[artifact]}...`)
    setBusyAction("run")

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/dev/prompt-lab/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              artifact,
              title,
              notes,
              systemPrompt,
              userPrompt,
              model,
              mockupOption,
            }),
          })
          const data = await response.json()
          if (!response.ok) {
            setError(data.error || "Prompt Lab run failed")
            setStatus(null)
            await loadHistory()
            return
          }
          setOutput(data.content || data.run?.output_content || "")
          setModel(data.model || model)
          setStatus("Run saved")
          await loadHistory()
        } finally {
          setBusyAction(null)
        }
      })()
    })
  }

  function applyDraft(draft: PromptLabDraft) {
    setTitle(draft.title)
    setModel(draft.model_id)
    setSystemPrompt(draft.system_prompt)
    setStatus(`Loaded system draft from ${formatTime(draft.updated_at)}`)
  }

  function applyRun(run: PromptLabRun) {
    setTitle(run.title)
    setModel(run.model_id)
    setSystemPrompt(run.system_prompt)
    setUserPrompt(run.user_prompt)
    setNotes(run.notes ?? "")
    setOutput(run.output_content ?? "")
    setStatus(`Loaded run from ${formatTime(run.created_at)}`)
  }

  function updateLaunchBrief(key: keyof typeof PROMPT_LAB_DEFAULT_LAUNCH_BRIEF, value: string) {
    const next = { ...launchBrief, [key]: value }
    setLaunchBrief(next)
    if (artifact === "launch" && context) {
      setUserPrompt(buildLaunchUserPrompt(context.project.name, context.project.idea, next))
    }
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-card p-8 text-center">
        <p className="font-semibold text-foreground">No projects available.</p>
        <p className="mt-2 text-sm text-muted-foreground">Create a project first, then return to the Prompt Lab.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="rounded-lg border border-border-subtle bg-card p-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Experiment setup</h2>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Project</span>
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="h-11 w-full rounded-xl border border-surface-strong bg-surface-soft px-3 text-sm text-foreground"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Artifact</span>
              <select
                value={artifact}
                onChange={(event) => setArtifact(event.target.value as PromptLabArtifact)}
                className="h-11 w-full rounded-xl border border-surface-strong bg-surface-soft px-3 text-sm text-foreground"
              >
                {ARTIFACTS.map((item) => (
                  <option key={item} value={item}>{PROMPT_LAB_ARTIFACT_LABELS[item]}</option>
                ))}
              </select>
            </label>

            {artifact === "mockups" && (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Mockup option</span>
                <select
                  value={mockupOption}
                  onChange={(event) => setMockupOption(event.target.value as typeof MOCKUP_OPTIONS[number])}
                  className="h-11 w-full rounded-xl border border-surface-strong bg-surface-soft px-3 text-sm text-foreground"
                >
                  {MOCKUP_OPTIONS.map((option) => (
                    <option key={option} value={option}>Option {option}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Model override</span>
              <select
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="h-11 w-full rounded-xl border border-surface-strong bg-surface-soft px-3 text-sm text-foreground"
              >
                {!model && <option value="">Loading model options...</option>}
                {modelOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} - {option.id}
                  </option>
                ))}
              </select>
              {selectedModelOption?.description && (
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  {selectedModelOption.description}
                </span>
              )}
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Run title</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-[88px]" />
            </label>
          </div>
        </section>

        {artifact === "launch" && (
          <section className="rounded-lg border border-border-subtle bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Launch brief</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(launchBrief).map(([key, value]) => (
                <label key={key} className="block space-y-1.5">
                  <span className="text-xs font-medium capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</span>
                  <Input
                    value={value}
                    onChange={(event) => updateLaunchBrief(key as keyof typeof launchBrief, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-lg border border-border-subtle bg-card p-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Saved drafts</h2>
          </div>
          <div className="mt-3 space-y-2">
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shared system drafts for this artifact yet.</p>
            ) : drafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => applyDraft(draft)}
                className="block w-full rounded-md border border-border-subtle bg-background p-3 text-left transition-colors hover:border-primary/40"
              >
                <span className="block text-sm font-medium text-foreground">{draft.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{draft.model_id} · {formatTime(draft.updated_at)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Recent runs</h2>
          <div className="mt-3 space-y-2">
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs for this artifact yet.</p>
            ) : runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => applyRun(run)}
                className="block w-full rounded-md border border-border-subtle bg-background p-3 text-left transition-colors hover:border-primary/40"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {run.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                  {run.title}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{run.model_id} · {formatTime(run.created_at)}</span>
                {run.error_message && <span className="mt-1 block text-xs text-red-500">{run.error_message}</span>}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className="min-w-0 space-y-4">
        <section className="rounded-lg border border-border-subtle bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Local only</Badge>
                <Badge variant="secondary">{PROMPT_LAB_ARTIFACT_LABELS[artifact]}</Badge>
                {selectedProject && <Badge variant="secondary">{selectedProject.name}</Badge>}
              </div>
              {context?.project.idea && (
                <p className="mt-3 max-w-[88ch] text-sm leading-relaxed text-muted-foreground">
                  {context.project.idea.slice(0, 360)}{context.project.idea.length > 360 ? "..." : ""}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={saveDraft} disabled={!canRun || isPending || Boolean(busyAction)}>
                <Save className="h-4 w-4" />
                Save draft
              </Button>
              <Button onClick={runArtifact} disabled={!canRun || isPending || Boolean(busyAction)}>
                {busyAction === "run" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run isolated
              </Button>
            </div>
          </div>

          {(status || error) && (
            <div className={cn(
              "mt-4 rounded-md border px-4 py-3 text-sm",
              error ? "border-red-200 bg-red-50 text-red-700" : "border-border-subtle bg-background text-muted-foreground",
            )}>
              {error || status}
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <label className="block space-y-2 rounded-lg border border-border-subtle bg-card p-4">
            <span className="text-sm font-semibold text-foreground">System prompt</span>
            <Textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              className="min-h-[420px] font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
          </label>

          <label className="block space-y-2 rounded-lg border border-border-subtle bg-card p-4">
            <span className="text-sm font-semibold text-foreground">User prompt and context</span>
            <Textarea
              value={userPrompt}
              onChange={(event) => setUserPrompt(event.target.value)}
              className="min-h-[420px] font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
          </label>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Output viewer</h2>
            </div>
            <div className="flex rounded-md border border-border-subtle bg-background p-1">
              {(["production", "experimental"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                    previewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode === "production" ? "Workspace-style" : "Lab playground"}
                </button>
              ))}
            </div>
          </div>

          <ArtifactPreview
            artifact={artifact}
            content={output}
            projectId={projectId}
            projectName={selectedProject?.name ?? "Prompt Lab"}
            mode={previewMode}
          />
        </section>
      </main>
    </div>
  )
}

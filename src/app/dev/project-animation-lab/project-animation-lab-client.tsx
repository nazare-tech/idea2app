"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import {
  CheckCircle2,
  Circle,
  FileText,
  LayoutGrid,
  Loader2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react"

import {
  MvpPlanDocumentBlocks,
  PrdDocumentBlocks,
} from "@/components/analysis/planning-document-blocks"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { WorkspaceDocumentFrame } from "@/components/layout/workspace-document-frame"
import { cn } from "@/lib/utils"
import type { AnimationLabDocumentChunk, AnimationLabFixture } from "./fixtures"

type LabDocumentStatus = "waiting" | "generating" | "ready"

type TimedDocumentState = {
  status: LabDocumentStatus
  revealedCount: number
  activeIndex: number | null
  activeProgress: number
  overallProgress: number
}

type TimelineState = {
  market: TimedDocumentState
  productPlan: TimedDocumentState
  firstVersionPlan: TimedDocumentState
  mockups: TimedDocumentState
  completed: boolean
}

type ProjectAnimationLabClientProps = {
  fixtures: AnimationLabFixture[]
}

const MARKET_DURATION_MS = 2200
const GAP_AFTER_MARKET_MS = 700
const CHUNK_DURATION_MS = 1700
const BETWEEN_DOCS_MS = 800
const MOCKUP_DURATION_MS = 2600
const TICK_MS = 80
const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)")
      query.addEventListener("change", onStoreChange)
      return () => query.removeEventListener("change", onStoreChange)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  )
}

function getDocumentState(
  elapsedMs: number,
  startMs: number,
  chunkCount: number,
  chunkDurationMs: number,
): TimedDocumentState {
  if (elapsedMs < startMs) {
    return {
      status: "waiting",
      revealedCount: 0,
      activeIndex: null,
      activeProgress: 0,
      overallProgress: 0,
    }
  }

  const activeElapsed = Math.max(0, elapsedMs - startMs)
  const totalDuration = Math.max(1, chunkCount * chunkDurationMs)
  const revealedCount = Math.min(chunkCount, Math.floor(activeElapsed / chunkDurationMs))
  const status: LabDocumentStatus = revealedCount >= chunkCount ? "ready" : "generating"
  const activeIndex = status === "generating" ? revealedCount : null
  const activeProgress =
    status === "generating"
      ? Math.min(96, ((activeElapsed % chunkDurationMs) / chunkDurationMs) * 100)
      : 100

  return {
    status,
    revealedCount,
    activeIndex,
    activeProgress,
    overallProgress: status === "ready" ? 100 : Math.min(94, (activeElapsed / totalDuration) * 100),
  }
}

function getTimelineState(fixture: AnimationLabFixture, elapsedMs: number): TimelineState {
  const prdStart = MARKET_DURATION_MS + GAP_AFTER_MARKET_MS
  const prdDuration = fixture.productPlan.chunks.length * CHUNK_DURATION_MS
  const mvpStart = prdStart + prdDuration + BETWEEN_DOCS_MS
  const mvpDuration = fixture.firstVersionPlan.chunks.length * CHUNK_DURATION_MS
  const mockupsStart = mvpStart + mvpDuration + BETWEEN_DOCS_MS
  const endAt = mockupsStart + MOCKUP_DURATION_MS

  return {
    market: getDocumentState(elapsedMs, 0, 1, MARKET_DURATION_MS),
    productPlan: getDocumentState(
      elapsedMs,
      prdStart,
      fixture.productPlan.chunks.length,
      CHUNK_DURATION_MS,
    ),
    firstVersionPlan: getDocumentState(
      elapsedMs,
      mvpStart,
      fixture.firstVersionPlan.chunks.length,
      CHUNK_DURATION_MS,
    ),
    mockups: getDocumentState(elapsedMs, mockupsStart, 1, MOCKUP_DURATION_MS),
    completed: elapsedMs >= endAt,
  }
}

function getTotalTimelineDuration(fixture: AnimationLabFixture) {
  return (
    MARKET_DURATION_MS +
    GAP_AFTER_MARKET_MS +
    fixture.productPlan.chunks.length * CHUNK_DURATION_MS +
    BETWEEN_DOCS_MS +
    fixture.firstVersionPlan.chunks.length * CHUNK_DURATION_MS +
    BETWEEN_DOCS_MS +
    MOCKUP_DURATION_MS
  )
}

function buildDocumentContent(title: string, chunks: AnimationLabDocumentChunk[], revealedCount: number) {
  const visibleChunks = chunks.slice(0, revealedCount)
  if (visibleChunks.length === 0) return ""
  return [title, ...visibleChunks.map((chunk) => chunk.markdown)].join("\n\n")
}

function statusLabel(status: LabDocumentStatus) {
  if (status === "ready") return "Ready"
  if (status === "generating") return "Writing"
  return "Waiting"
}

function rowMessage(status: LabDocumentStatus, fallback: string) {
  if (status === "ready") return "Ready"
  if (status === "waiting") return "Waiting"
  return fallback
}

function StatusIcon({ status }: { status: LabDocumentStatus }) {
  if (status === "ready") return <CheckCircle2 className="size-4 text-[#166534]" aria-hidden="true" />
  if (status === "generating") return <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
  return <Circle className="size-4 text-muted-foreground/60" aria-hidden="true" />
}

function ProgressRow({
  icon,
  label,
  message,
  status,
  progress,
}: {
  icon: "document" | "mockups"
  label: string
  message: string
  status: LabDocumentStatus
  progress: number
}) {
  const Icon = icon === "mockups" ? LayoutGrid : FileText

  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 border-b border-border-subtle py-4 last:border-b-0">
      <div className="flex size-11 items-center justify-center rounded-lg border border-border-subtle bg-background">
        <Icon className="size-5 text-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">{label}</p>
            <p className={cn("mt-1 text-sm text-muted-foreground", status === "ready" && "text-[#166534]")}>
              {message}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
            <StatusIcon status={status} />
            <span>{statusLabel(status)}</span>
          </div>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E8DDD5]"
          role="progressbar"
          aria-label={`${label}: ${statusLabel(status)}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(status === "ready" ? 100 : progress)}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width,background-color] duration-200 ease-out",
              status === "ready" ? "bg-[#166534]" : "bg-primary",
            )}
            style={{ width: `${Math.max(status === "generating" ? 8 : 0, progress)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function LoadingBlock({
  label,
  summary,
  progress,
}: {
  label: string
  summary: string
  progress: number
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{summary}</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
          Drafting
        </div>
      </div>

      <div className="mt-5 space-y-3" aria-hidden="true">
        <div className="project-lab-skeleton h-5 w-4/5 rounded" />
        <div className="project-lab-skeleton h-4 w-full rounded" />
        <div className="project-lab-skeleton h-4 w-11/12 rounded" />
        <div className="space-y-2 pt-2">
          <div className="project-lab-skeleton h-4 w-2/3 rounded" />
          <div className="project-lab-skeleton h-4 w-5/6 rounded" />
          <div className="project-lab-skeleton h-4 w-3/5 rounded" />
        </div>
      </div>

      <div
        className="mt-5 h-1 overflow-hidden rounded-full bg-[#E8DDD5]"
        role="progressbar"
        aria-label={`${label}: drafting block`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function PendingDocument({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-subtle bg-card p-6 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-2 leading-6">{detail}</p>
    </div>
  )
}

function CreationPanel({ fixture, timeline }: { fixture: AnimationLabFixture; timeline: TimelineState }) {
  return (
    <section className="min-w-0 rounded-lg border border-border-subtle bg-card p-5 lg:sticky lg:top-5 lg:self-start">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Creation loading</p>
      <h2 className="mt-2 text-2xl font-bold text-foreground">Creating your project plan</h2>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{fixture.projectSummary}</p>

      <div className="mt-6 border-y border-border-subtle">
        <ProgressRow
          icon="document"
          label="Executive Summary"
          message={rowMessage(timeline.market.status, "Finding market patterns")}
          status={timeline.market.status}
          progress={timeline.market.overallProgress}
        />
        <ProgressRow
          icon="document"
          label="Market Research"
          message={rowMessage(timeline.market.status, "Scoping opportunity")}
          status={timeline.market.status}
          progress={timeline.market.overallProgress}
        />
        <ProgressRow
          icon="document"
          label="Product Plan"
          message={rowMessage(timeline.productPlan.status, "Revealing product blocks")}
          status={timeline.productPlan.status}
          progress={timeline.productPlan.overallProgress}
        />
        <ProgressRow
          icon="document"
          label="First Version Plan"
          message={rowMessage(timeline.firstVersionPlan.status, "Sequencing first build")}
          status={timeline.firstVersionPlan.status}
          progress={timeline.firstVersionPlan.overallProgress}
        />
        <ProgressRow
          icon="mockups"
          label="Design Mockups"
          message={rowMessage(timeline.mockups.status, "Preparing visual directions")}
          status={timeline.mockups.status}
          progress={timeline.mockups.overallProgress}
        />
      </div>
    </section>
  )
}

function MarketResearchPreview({ fixture, status }: { fixture: AnimationLabFixture; status: LabDocumentStatus }) {
  if (status !== "ready") {
    return (
      <WorkspaceDocumentFrame navKey="market-research-loading">
        <LoadingBlock
          label="Market Research"
          summary="Reading the market before document blocks start"
          progress={72}
        />
      </WorkspaceDocumentFrame>
    )
  }

  return (
    <WorkspaceDocumentFrame navKey="market-research">
      <div className="mb-6 rounded-lg border border-border-subtle bg-[#F5F0EB] p-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Market ready</p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{fixture.marketResearch.summary}</p>
      </div>
      <MarkdownRenderer content={fixture.marketResearch.markdown} projectId={`animation-lab-${fixture.id}`} />
    </WorkspaceDocumentFrame>
  )
}

function ProductPlanPreview({
  fixture,
  state,
}: {
  fixture: AnimationLabFixture
  state: TimedDocumentState
}) {
  const content = buildDocumentContent(
    fixture.productPlan.title,
    fixture.productPlan.chunks,
    state.revealedCount,
  )
  const activeChunk = state.activeIndex === null ? null : fixture.productPlan.chunks[state.activeIndex]

  return (
    <div className="space-y-4">
      {content ? (
        <WorkspaceDocumentFrame navKey="prd">
          <PrdDocumentBlocks content={content} projectId={`animation-lab-${fixture.id}`} />
        </WorkspaceDocumentFrame>
      ) : (
        <PendingDocument
          title="Product Plan"
          detail="Waiting for Market Research to finish before the first product block appears."
        />
      )}
      {state.status === "generating" && activeChunk ? (
        <WorkspaceDocumentFrame navKey={`prd-${activeChunk.id}`}>
          <LoadingBlock
            label={activeChunk.label}
            summary={activeChunk.summary}
            progress={state.activeProgress}
          />
        </WorkspaceDocumentFrame>
      ) : null}
    </div>
  )
}

function FirstVersionPreview({
  fixture,
  state,
}: {
  fixture: AnimationLabFixture
  state: TimedDocumentState
}) {
  const content = buildDocumentContent(
    fixture.firstVersionPlan.title,
    fixture.firstVersionPlan.chunks,
    state.revealedCount,
  )
  const activeChunk = state.activeIndex === null ? null : fixture.firstVersionPlan.chunks[state.activeIndex]

  return (
    <div className="space-y-4">
      {content ? (
        <WorkspaceDocumentFrame navKey="mvp">
          <MvpPlanDocumentBlocks content={content} projectId={`animation-lab-${fixture.id}`} />
        </WorkspaceDocumentFrame>
      ) : (
        <PendingDocument
          title="First Version Plan"
          detail="Waiting for the Product Plan blocks to complete before first-version planning starts."
        />
      )}
      {state.status === "generating" && activeChunk ? (
        <WorkspaceDocumentFrame navKey={`mvp-${activeChunk.id}`}>
          <LoadingBlock
            label={activeChunk.label}
            summary={activeChunk.summary}
            progress={state.activeProgress}
          />
        </WorkspaceDocumentFrame>
      ) : null}
    </div>
  )
}

export function ProjectAnimationLabClient({ fixtures }: ProjectAnimationLabClientProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [fixtureId, setFixtureId] = useState(fixtures[0]?.id ?? "")
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1)

  const fixture = useMemo(
    () => fixtures.find((item) => item.id === fixtureId) ?? fixtures[0],
    [fixtureId, fixtures],
  )
  const effectiveElapsedMs = prefersReducedMotion ? getTotalTimelineDuration(fixture) : elapsedMs
  const timeline = useMemo(() => getTimelineState(fixture, effectiveElapsedMs), [effectiveElapsedMs, fixture])
  const playbackActive = isPlaying && !prefersReducedMotion && !timeline.completed

  useEffect(() => {
    if (!playbackActive) return

    const interval = window.setInterval(() => {
      setElapsedMs((current) => {
        const next = current + TICK_MS * speed
        const nextTimeline = getTimelineState(fixture, next)
        return nextTimeline.completed ? getTotalTimelineDuration(fixture) : next
      })
    }, TICK_MS)

    return () => window.clearInterval(interval)
  }, [fixture, playbackActive, speed])

  const restart = () => {
    setElapsedMs(0)
    setIsPlaying(!prefersReducedMotion)
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <style>{`
        .project-lab-skeleton {
          background: #E8DDD5;
        }
      `}</style>

      <div className="mx-auto flex max-w-[1680px] flex-col gap-5">
        <header className="rounded-lg border border-border-subtle bg-card p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Local development</p>
              <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Project Animation Lab</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                A static sandbox for tuning the project creation timeline and block reveal states before backend streaming exists.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="fixture-select">Fixture project</label>
              <select
                id="fixture-select"
                value={fixture.id}
                onChange={(event) => {
                  setFixtureId(event.target.value)
                  setElapsedMs(0)
                  setIsPlaying(!prefersReducedMotion)
                }}
                className="h-10 rounded-md border border-border-subtle bg-background px-3 text-sm text-foreground"
              >
                {fixtures.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.projectName}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="speed-select">Playback speed</label>
              <select
                id="speed-select"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value) as typeof speed)}
                className="h-10 rounded-md border border-border-subtle bg-background px-3 text-sm text-foreground"
              >
                {SPEED_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}x
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsPlaying((current) => !current)}
                disabled={prefersReducedMotion || timeline.completed}
                title={playbackActive ? "Pause" : "Play"}
                aria-label={playbackActive ? "Pause animation" : "Play animation"}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border-subtle bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-[#F5F0EB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {playbackActive ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
                <span>{playbackActive ? "Pause" : "Play"}</span>
              </button>

              <button
                type="button"
                onClick={restart}
                title="Restart"
                aria-label="Restart animation"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                <span>Restart</span>
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <CreationPanel fixture={fixture} timeline={timeline} />

          <section className="min-w-0 rounded-lg border border-border-subtle bg-[#F5F0EB] p-3 sm:p-4 xl:min-h-[720px]">
            <div className="mb-4 rounded-lg border border-border-subtle bg-card p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Workspace preview</p>
              <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{fixture.projectName}</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">{fixture.projectSummary}</p>
                </div>
                <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
                  {timeline.completed ? "All prototype stages complete" : "Prototype timeline running"}
                </p>
              </div>
            </div>

            <div className="max-h-[calc(100vh-210px)] space-y-5 overflow-y-auto pr-1">
              <MarketResearchPreview fixture={fixture} status={timeline.market.status} />
              <ProductPlanPreview fixture={fixture} state={timeline.productPlan} />
              <FirstVersionPreview fixture={fixture} state={timeline.firstVersionPlan} />
              <WorkspaceDocumentFrame navKey="mockups">
                {timeline.mockups.status === "ready" ? (
                  <div className="rounded-lg border border-border-subtle bg-card p-5">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Design Mockups</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">Visual directions ready</h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      Early visual directions are ready for the next workspace pass.
                    </p>
                  </div>
                ) : (
                  <LoadingBlock
                    label="Design Mockups"
                    summary="Preparing visual directions after the written plan"
                    progress={timeline.mockups.status === "generating" ? timeline.mockups.activeProgress : 0}
                  />
                )}
              </WorkspaceDocumentFrame>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

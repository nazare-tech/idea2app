"use client"

// Motion Lab: local-development-only playground for streaming-generation
// animation experiments. It simulates a document stream from real sample
// content and renders it through the same components the workspace uses,
// so experiments can never drift from production UI.

import { useEffect, useMemo, useRef, useState } from "react"

import { CompetitiveStreamingDocument, type CompetitiveStreamingVariant } from "@/components/analysis/competitive-streaming-document"
import { AnchorNav } from "@/components/layout/anchor-nav"
import { WorkspaceDocumentFrame } from "@/components/layout/workspace-document-frame"
import { parseStreamingCompetitiveAnalysis } from "@/lib/competitive-analysis-streaming"
import { SCROLLABLE_NAV_ITEMS } from "@/lib/document-sections"
import { LANDING_SAMPLE_CONTENT } from "@/lib/landing-sample-content"
import { useSmoothedStream } from "@/hooks/use-smoothed-stream"
import { cn } from "@/lib/utils"

const SAMPLE_CONTENT = LANDING_SAMPLE_CONTENT.competitive.content
const SAMPLE_PROJECT_NAME = LANDING_SAMPLE_CONTENT.exportedFrom.projectName

// Lab stand-in for the live competitor source pairs the workspace receives via
// the generate-all streaming preview (partial_metadata), so mention links can
// be exercised during simulated streaming too.
const SAMPLE_COMPETITOR_SOURCES = [
  { name: "Productboard", url: "https://www.productboard.com" },
  { name: "Dovetail", url: "https://dovetail.com" },
  { name: "Zendesk AI", url: "https://www.zendesk.com" },
]

const VARIANTS: { key: CompetitiveStreamingVariant; label: string; blurb: string }[] = [
  {
    key: "block-commit",
    label: "A · Block commit",
    blurb:
      "Prose streams word by word; structured blocks (competitor cards, tables) buffer behind an assembling chip and commit whole with entrance motion.",
  },
  {
    key: "skeleton",
    label: "B · Skeleton contract",
    blurb:
      "The section order is contract-fixed, so the full document skeleton is promised up front and sections fill in place as the stream reaches them.",
  },
  {
    key: "ticker",
    label: "C · Ticker + snap",
    blurb:
      "No mid-text streaming. A mono ticker narrates pipeline events while finished sections snap into the document fully formed.",
  },
  {
    key: "live-fill",
    label: "D · Live fill",
    blurb:
      "Full document skeleton up front; the active section renders its real designed block immediately and text streams into table cells and numbered slots as it arrives.",
  },
]

const SPEEDS = [
  { key: "slow", label: "Slow", multiplier: 2.2 },
  { key: "real", label: "Real-ish", multiplier: 1 },
  { key: "fast", label: "Fast", multiplier: 0.3 },
] as const

type SpeedKey = (typeof SPEEDS)[number]["key"]
type DeliveryMode = "stream" | "poll"

/** Pipeline stage narration matching the real market research pipeline stages. */
const STAGE_EVENTS: { atFraction: number; message: string }[] = [
  { atFraction: 0, message: "Identifying top competitors..." },
  { atFraction: 0.02, message: "Extracting competitor details..." },
  { atFraction: 0.05, message: "Writing competitive analysis..." },
  { atFraction: 1, message: "Finalizing analysis..." },
]

interface TickerEvent {
  seconds: number
  tag: string
  message: string
  tone: "info" | "done"
}

interface SimulationState {
  arrivedLength: number
  events: TickerEvent[]
}

const INITIAL_SIMULATION: SimulationState = { arrivedLength: 0, events: [] }

/** Advance the simulated stream and derive any newly earned ticker events. */
function advanceSimulation(
  current: SimulationState,
  chunkSize: number,
  jitter: number,
  seconds: number
): SimulationState {
  if (current.arrivedLength >= SAMPLE_CONTENT.length) return current

  const arrivedLength = Math.min(SAMPLE_CONTENT.length, current.arrivedLength + chunkSize + jitter)
  const finished = arrivedLength >= SAMPLE_CONTENT.length
  const fraction = arrivedLength / SAMPLE_CONTENT.length
  const seen = new Set(current.events.map((event) => event.message))
  const events = [...current.events]

  for (const stage of STAGE_EVENTS) {
    if (fraction >= stage.atFraction && !seen.has(stage.message)) {
      events.push({ seconds, tag: "PIPE", message: stage.message, tone: "info" })
    }
  }

  const parse = parseStreamingCompetitiveAnalysis(SAMPLE_CONTENT.slice(0, arrivedLength), {
    finished,
  })
  for (const section of parse.sections) {
    const message = `## ${section.heading} parsed`
    if (section.complete && !seen.has(message)) {
      events.push({ seconds, tag: "SECT", message, tone: "done" })
    }
  }

  return { arrivedLength, events }
}

function TickerPanel({ events }: { events: TickerEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events.length])

  return (
    <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-lg bg-[#0D1320]">
      <p className="border-b border-white/10 px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#6B7280]">
        Generation log
      </p>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[11.5px] leading-relaxed">
        {events.map((event, index) => (
          <div key={index} className="flex gap-2.5 whitespace-nowrap text-[#B8BEC9]">
            <span className="shrink-0 tabular-nums text-[#525A68]">{event.seconds.toFixed(1)}s</span>
            <span className={cn("shrink-0", event.tone === "done" ? "text-[#4ADE80]" : "text-[#F87171]")}>
              [{event.tag}]
            </span>
            <span className="truncate">{event.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MotionLabClient() {
  const [variant, setVariant] = useState<CompetitiveStreamingVariant>("block-commit")
  const [delivery, setDelivery] = useState<DeliveryMode>("stream")
  const [speedKey, setSpeedKey] = useState<SpeedKey>("real")
  const [runId, setRunId] = useState(0)
  const [sim, setSim] = useState<SimulationState>(INITIAL_SIMULATION)

  const startedAtRef = useRef(0)

  const speed = SPEEDS.find((option) => option.key === speedKey)?.multiplier ?? 1
  const finishedArriving = sim.arrivedLength >= SAMPLE_CONTENT.length

  const restart = () => {
    startedAtRef.current = Date.now()
    setSim(INITIAL_SIMULATION)
    setRunId((current) => current + 1)
  }

  // Simulate content arrival: small frequent chunks for a live token stream,
  // large 2s chunks to mirror the onboarding poll transport. All state
  // updates happen inside the interval callback, never in the effect body.
  useEffect(() => {
    if (startedAtRef.current === 0) startedAtRef.current = Date.now()

    const chunkSize = delivery === "stream" ? 24 : Math.ceil(SAMPLE_CONTENT.length / 18)
    const intervalMs = (delivery === "stream" ? 55 : 2000) * speed

    const interval = window.setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000
      const jitter = delivery === "stream" ? Math.round(Math.random() * 14) : 0
      setSim((current) => advanceSimulation(current, chunkSize, jitter, seconds))
    }, intervalMs)

    return () => window.clearInterval(interval)
  }, [runId, delivery, speed])

  const arrived = SAMPLE_CONTENT.slice(0, sim.arrivedLength)
  const smoothed = useSmoothedStream(arrived)
  const displayedContent = smoothed.text
  const finished = finishedArriving && !smoothed.isCatchingUp

  const parse = useMemo(
    () => parseStreamingCompetitiveAnalysis(displayedContent, { finished }),
    [displayedContent, finished]
  )

  const executiveDone = parse.completeSectionNames.has("Executive Summary")
  const navItems = useMemo(
    () =>
      SCROLLABLE_NAV_ITEMS.filter(
        (item) => item.key === "executive-summary" || item.key === "market-research"
      ),
    []
  )
  const documentStatuses = {
    "executive-summary": executiveDone ? ("done" as const) : ("in_progress" as const),
    "market-research": finished
      ? ("done" as const)
      : executiveDone
        ? ("in_progress" as const)
        : ("pending" as const),
  }

  const activeVariant = VARIANTS.find((option) => option.key === variant)

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-card px-4 py-3">
        <div className="flex rounded-md border border-border-subtle p-0.5">
          {VARIANTS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setVariant(option.key)
                restart()
              }}
              className={cn(
                "rounded-[5px] px-3 py-1.5 text-[13px] font-semibold transition-colors",
                variant === option.key
                  ? "bg-[#0D1320] text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Delivery
          <select
            value={delivery}
            onChange={(event) => setDelivery(event.target.value as DeliveryMode)}
            className="rounded-md border border-border-subtle bg-background px-2 py-1.5 text-[13px] text-foreground"
          >
            <option value="stream">Token stream</option>
            <option value="poll">2s poll chunks</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Speed
          <select
            value={speedKey}
            onChange={(event) => setSpeedKey(event.target.value as SpeedKey)}
            className="rounded-md border border-border-subtle bg-background px-2 py-1.5 text-[13px] text-foreground"
          >
            {SPEEDS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={restart}
          className="ml-auto rounded-md bg-[#0D1320] px-4 py-1.5 text-[13px] font-semibold text-white"
        >
          Replay
        </button>
      </div>

      {activeVariant ? (
        <p className="max-w-[80ch] text-sm text-muted-foreground">{activeVariant.blurb}</p>
      ) : null}

      {/* Workspace-like stage: real AnchorNav rail + document area */}
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="hidden self-start lg:block">
          <AnchorNav
            navItems={navItems}
            documentStatuses={documentStatuses}
            activeSectionId={null}
            onNavigate={(sectionId) => {
              const target =
                document.getElementById(`streaming-${sectionId}`) ??
                document.getElementById(sectionId)
              target?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
          />
        </div>

        <div
          className={cn(
            "min-w-0",
            variant === "ticker" && "grid gap-5 xl:grid-cols-[320px_1fr]"
          )}
        >
          {variant === "ticker" ? <TickerPanel events={sim.events} /> : null}

          {/* Mirror the workspace layout exactly: Executive Summary and
              Market Research are separate document frames rendering the same
              split parts the project page uses. */}
          <div className="min-w-0 space-y-8 rounded-lg bg-background px-3 py-3 sm:px-6 sm:py-4">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#8A8480]">
              {SAMPLE_PROJECT_NAME} · {finished ? "Ready" : "Generating"}
            </p>
            <WorkspaceDocumentFrame>
              <CompetitiveStreamingDocument
                key={`${runId}-overview`}
                content={displayedContent}
                finished={finished}
                variant={variant}
                parts="overview"
                projectName={SAMPLE_PROJECT_NAME}
                smoothTail={false}
                competitorSources={SAMPLE_COMPETITOR_SOURCES}
              />
            </WorkspaceDocumentFrame>
            <WorkspaceDocumentFrame>
              <CompetitiveStreamingDocument
                key={`${runId}-detail`}
                content={displayedContent}
                finished={finished}
                variant={variant}
                parts="detail"
                smoothTail={false}
                competitorSources={SAMPLE_COMPETITOR_SOURCES}
              />
            </WorkspaceDocumentFrame>
          </div>
        </div>
      </div>
    </div>
  )
}

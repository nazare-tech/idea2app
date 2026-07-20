"use client"

// Motion Lab: local-development-only playground for streaming-generation
// animation experiments. It simulates a document stream from real sample
// content and renders it through the same components the workspace uses,
// so experiments can never drift from production UI.

import { useEffect, useMemo, useState } from "react"

import { CompetitiveStreamingDocument } from "@/components/analysis/competitive-streaming-document"
import { AnchorNav } from "@/components/layout/anchor-nav"
import { WorkspaceDocumentFrame } from "@/components/layout/workspace-document-frame"
import { parseStreamingCompetitiveAnalysis } from "@/lib/competitive-analysis-streaming"
import { SCROLLABLE_NAV_ITEMS } from "@/lib/document-sections"
import { LANDING_SAMPLE_CONTENT } from "@/lib/landing-sample-content"
import { useSmoothedStream } from "@/hooks/use-smoothed-stream"

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

const SPEEDS = [
  { key: "slow", label: "Slow", multiplier: 2.2 },
  { key: "real", label: "Real-ish", multiplier: 1 },
  { key: "fast", label: "Fast", multiplier: 0.3 },
] as const

type SpeedKey = (typeof SPEEDS)[number]["key"]
type DeliveryMode = "stream" | "poll"

interface SimulationState {
  arrivedLength: number
}

const INITIAL_SIMULATION: SimulationState = { arrivedLength: 0 }

/** Advance the simulated stream without involving network or generation APIs. */
function advanceSimulation(
  current: SimulationState,
  chunkSize: number,
  jitter: number
): SimulationState {
  if (current.arrivedLength >= SAMPLE_CONTENT.length) return current

  const arrivedLength = Math.min(SAMPLE_CONTENT.length, current.arrivedLength + chunkSize + jitter)
  return { arrivedLength }
}

export function MotionLabClient() {
  const [delivery, setDelivery] = useState<DeliveryMode>("stream")
  const [speedKey, setSpeedKey] = useState<SpeedKey>("real")
  const [runId, setRunId] = useState(0)
  const [sim, setSim] = useState<SimulationState>(INITIAL_SIMULATION)

  const speed = SPEEDS.find((option) => option.key === speedKey)?.multiplier ?? 1
  const finishedArriving = sim.arrivedLength >= SAMPLE_CONTENT.length

  const restart = () => {
    setSim(INITIAL_SIMULATION)
    setRunId((current) => current + 1)
  }

  // Simulate content arrival: small frequent chunks for a live token stream,
  // large 2s chunks to mirror the onboarding poll transport. All state
  // updates happen inside the interval callback, never in the effect body.
  useEffect(() => {
    const chunkSize = delivery === "stream" ? 24 : Math.ceil(SAMPLE_CONTENT.length / 18)
    const intervalMs = (delivery === "stream" ? 55 : 2000) * speed

    const interval = window.setInterval(() => {
      const jitter = delivery === "stream" ? Math.round(Math.random() * 14) : 0
      setSim((current) => advanceSimulation(current, chunkSize, jitter))
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

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-card px-4 py-3">
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

      <p className="max-w-[80ch] text-sm text-muted-foreground">
        Full document skeleton up front; active section renders through production designed blocks while text arrives.
      </p>

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

        <div className="min-w-0">
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

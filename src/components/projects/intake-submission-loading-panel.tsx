"use client"

import { useEffect, useRef, useState } from "react"

import { Marquee } from "@/components/ui/marquee"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

// Single post-submit loader (Intake Flow Option 1). One large message rotates at
// a fixed cadence while a thin red line fills; the redirect to the workspace is
// driven separately by the first streamed Market Research token, so this loader
// clamps to its final "opening your workspace" line and holds until that redirect
// fires. It is intentionally decorative: no live queue status is wired in here.

export const INTAKE_LOADER_MESSAGES = [
  "Sending your idea to the research desk...",
  "Filing your answers where the plan can find them...",
  "Sizing up the market and the competition...",
  "Drafting the first cut of your product plan...",
  "Sketching mockup directions...",
  "Here it comes. Opening your workspace...",
]

// ~4s per message keeps the felt window close to the old 40s fake loader while
// leaving the final message to hold until the first-token redirect.
export const INTAKE_LOADER_MESSAGE_INTERVAL_MS = 4000
const TICK_MS = 100

interface IntakeSubmissionLoadingPanelProps {
  messages?: string[]
}

export function getLoaderMessageIndex(
  elapsedMs: number,
  messageCount: number,
  intervalMs: number = INTAKE_LOADER_MESSAGE_INTERVAL_MS,
): number {
  if (messageCount <= 0) return 0
  const raw = Math.floor(Math.max(0, elapsedMs) / Math.max(1, intervalMs))
  return Math.min(messageCount - 1, raw)
}

export function getLoaderLineWidth(
  elapsedMs: number,
  messageCount: number,
  intervalMs: number = INTAKE_LOADER_MESSAGE_INTERVAL_MS,
): number {
  if (messageCount <= 0) return 0
  const pct = (Math.max(0, elapsedMs) / Math.max(1, intervalMs * messageCount)) * 100
  return Math.min(100, pct)
}

export function IntakeSubmissionLoadingPanel({
  messages = INTAKE_LOADER_MESSAGES,
}: IntakeSubmissionLoadingPanelProps) {
  const startedAtRef = useRef(0)
  const [elapsed, setElapsed] = useState(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) return

    if (startedAtRef.current === 0) {
      startedAtRef.current = Date.now()
    }

    const interval = window.setInterval(() => {
      setElapsed(Date.now() - startedAtRef.current)
    }, TICK_MS)
    return () => window.clearInterval(interval)
  }, [reducedMotion])

  const total = messages.length
  const activeIndex = getLoaderMessageIndex(elapsed, total)
  const lineWidth = reducedMotion ? 42 : getLoaderLineWidth(elapsed, total)
  const isFinalMessage = activeIndex === total - 1

  return (
    <div
      className="flex min-h-full flex-col bg-background text-text-primary"
      data-testid="intake-submission-loading"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Rotating headline block, vertically centered */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pt-12 pb-6">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
          Creating your project
        </p>

        <div className="relative mt-5 h-24 w-full max-w-[760px]">
          {reducedMotion ? (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <span className="font-[family:var(--font-display)] text-[28px] font-bold leading-[1.15] tracking-[-0.04em] text-text-primary sm:text-[34px]">
                {messages[0]}
              </span>
            </div>
          ) : (
            messages.map((text, index) => {
              const isActive = index === activeIndex
              const offset = isActive ? "translateY(0)" : index < activeIndex ? "translateY(-16px)" : "translateY(16px)"
              return (
                <div
                  key={text}
                  className="absolute inset-0 flex items-center justify-center text-center transition-[opacity,transform] duration-500 [transition-timing-function:var(--motion-ease-out-expo)]"
                  style={{ opacity: isActive ? 1 : 0, transform: offset }}
                  aria-hidden={!isActive}
                >
                  <span className="font-[family:var(--font-display)] text-[28px] font-bold leading-[1.15] tracking-[-0.04em] text-text-primary sm:text-[34px]">
                    {text}
                    {isActive && isFinalMessage && <span className="stream-caret ml-1.5 h-6 align-[-3px]" />}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Thin red progress line */}
        <div className="mt-6 h-0.5 w-[220px] bg-border-strong">
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-linear"
            style={{ width: `${lineWidth}%` }}
          />
        </div>
      </div>

      {/* "What you're about to get" artifact marquee */}
      <div className="pb-11">
        <p className="mb-[18px] text-center font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
          What you&apos;re about to get
        </p>
        {/* Decorative preview strip: hidden from assistive tech (the rotating
            status message above is the announced progress signal). The marquee
            clamps itself to the width of one card set and centers. */}
        <div aria-hidden="true">
          <Marquee durationSeconds={45}>
            {LOADER_ARTIFACT_CARDS.map((card, index) => (
              <LoaderArtifactCard key={index} kind={card.kind} label={card.label} />
            ))}
          </Marquee>
        </div>
      </div>
    </div>
  )
}

type ArtifactKind = "bars" | "lines" | "checklist" | "grid" | "dark" | "numbered"

const LOADER_ARTIFACT_CARDS: { kind: ArtifactKind; label: string }[] = [
  { kind: "bars", label: "Market research" },
  { kind: "lines", label: "Product plan" },
  { kind: "checklist", label: "First version plan" },
  { kind: "grid", label: "Design mockups" },
  { kind: "dark", label: "AI prompts" },
  { kind: "numbered", label: "Executive summary" },
]

function LoaderArtifactCard({ kind, label }: { kind: ArtifactKind; label: string }) {
  const isDark = kind === "dark"
  return (
    <div
      className="mr-4 box-border w-[172px] shrink-0 rounded-lg border border-border-subtle p-3.5"
      style={{ background: isDark ? "#1C1917" : "#FFFFFF" }}
    >
      <div className="h-[110px]">
        <ArtifactVisual kind={kind} />
      </div>
      <p
        className="mt-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.16em]"
        style={{ color: isDark ? "#8A8480" : "#6B7280" }}
      >
        {label}
      </p>
    </div>
  )
}

function ArtifactVisual({ kind }: { kind: ArtifactKind }) {
  if (kind === "bars") {
    return (
      <div className="flex h-full items-end justify-center gap-2 pb-2">
        <div className="w-4 bg-[#E8DDD5]" style={{ height: 34 }} />
        <div className="w-4 bg-[#E8DDD5]" style={{ height: 62 }} />
        <div className="w-4 bg-[#1C1917]" style={{ height: 48 }} />
        <div className="w-4 bg-[#E8DDD5]" style={{ height: 78 }} />
      </div>
    )
  }
  if (kind === "lines") {
    return (
      <div className="pt-1.5">
        <div className="h-3 w-[70%] bg-[#1C1917]" />
        <div className="mt-3 h-[7px] w-full bg-[#F5F0EB]" />
        <div className="mt-1.5 h-[7px] w-[92%] bg-[#F5F0EB]" />
        <div className="mt-1.5 h-[7px] w-[96%] bg-[#F5F0EB]" />
        <div className="mt-1.5 h-[7px] w-[60%] bg-[#F5F0EB]" />
        <div className="mt-3 h-[7px] w-[84%] bg-[#F5F0EB]" />
      </div>
    )
  }
  if (kind === "checklist") {
    return (
      <div className="flex h-full flex-col justify-center gap-3">
        {[true, true, false, false].map((checked, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="size-3 rounded-[3px] border-[1.5px]"
              style={{
                borderColor: checked ? "#1C1917" : "#CCC2B8",
                background: checked ? "#1C1917" : "#FFFFFF",
              }}
            />
            <div className="h-[7px] flex-1 bg-[#F5F0EB]" />
          </div>
        ))}
      </div>
    )
  }
  if (kind === "grid") {
    return (
      <div className="grid h-full grid-cols-2 gap-2 py-1">
        <div className="rounded border border-[#E8DDD5] bg-[#F5F0EB]" />
        <div className="rounded border border-[#E8DDD5] bg-[#F5F0EB]" />
        <div className="rounded border border-[#E8DDD5] bg-[#F5F0EB]" />
        <div className="rounded bg-[#1C1917]" />
      </div>
    )
  }
  if (kind === "dark") {
    return (
      <div className="pt-1.5">
        <div className="h-2 w-[44%] bg-[#8A8480]" />
        <div className="mt-2.5 h-[7px] w-[88%] bg-[#2C2520]" />
        <div className="mt-1.5 h-[7px] w-[74%] bg-[#2C2520]" />
        <div className="mt-1.5 h-[7px] w-[92%] bg-[#2C2520]" />
        <div className="mt-2.5 h-2 w-[36%] bg-[#8A8480]" />
        <div className="mt-2.5 h-[7px] w-[80%] bg-[#2C2520]" />
      </div>
    )
  }
  // numbered
  return (
    <div className="pt-1.5">
      <div className="font-mono text-[22px] font-medium text-[#1C1917]">01</div>
      <div className="mt-2.5 h-[7px] w-full bg-[#F5F0EB]" />
      <div className="mt-1.5 h-[7px] w-[88%] bg-[#F5F0EB]" />
      <div className="mt-1.5 h-[7px] w-[94%] bg-[#F5F0EB]" />
      <div className="mt-1.5 h-[7px] w-[52%] bg-[#F5F0EB]" />
    </div>
  )
}

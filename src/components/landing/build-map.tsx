"use client"

import { useEffect, useRef, useState } from "react"

// --- Graphic geometry (viewBox 1400 x 700) -----------------------------------
// The SVG is drawn in a 1400x700 coordinate space; cards are positioned as a
// percentage of the same box so they stay locked to their node at any size.
// Path peaks (above-cards y=280, below-cards y=405) sit near the top half so
// the empty space above the cards stays small; the extra height below ensures
// below-cards never extend past the container at narrower desktop widths.
const VB_W = 1400
const VB_H = 700

const START = { x: 95, y: 350 }
const FINISH = { x: 1325, y: 235 }

// Gap between a node and its card, in viewBox units (so it scales with the
// container at any viewport width). Keep in sync with the connector
// stroke-dasharray in globals.css.
const CARD_GAP_VB = 38

interface BuildMapNode {
  key: string
  x: number
  y: number
  /** Whether the card sits above the node (true) or below (false). */
  above: boolean
  label: string
  description: string
}

const NODES: BuildMapNode[] = [
  {
    key: "market",
    x: 340,
    y: 280,
    above: true,
    label: "1. Market Research",
    description:
      "Map the competitive landscape: who's already solving this, what they charge, and where the open lanes are for your idea.",
  },
  {
    key: "prd",
    x: 585,
    y: 405,
    above: false,
    label: "2. PRD",
    description:
      "Translate your idea into a real product spec. User personas, requirements, and acceptance criteria so engineering knows exactly what to build.",
  },
  {
    key: "mockups",
    x: 830,
    y: 280,
    above: true,
    label: "3. Mockups",
    description:
      "Get multiple design directions for the same core screens. Compare them side-by-side and pick the one to ship before writing UI code.",
  },
  {
    key: "marketing",
    x: 1080,
    y: 405,
    above: false,
    label: "4. Marketing",
    description:
      "Plan your go-to-market in one place: audience segments, channel signals, and a budget to land your first customers.",
  },
]

// Smooth zigzag through START → each node → READY. Control points hug
// neighboring nodes so the curve feels sinusoidal rather than segmented.
const PATH_D =
  "M 95 350 " +
  "C 180 350, 240 280, 340 280 " +
  "C 440 280, 480 405, 585 405 " +
  "C 690 405, 720 280, 830 280 " +
  "C 940 280, 970 405, 1080 405 " +
  "C 1190 405, 1220 235, 1325 235"

// Total animation length in seconds. Cards reveal at fractions of this.
const DURATION_S = 3
// Fallback progress fractions used before the path is measured. Replaced at
// mount with values computed from the real path via getPointAtLength().
const NODE_PROGRESS_FALLBACK = [0.22, 0.43, 0.64, 0.83]

// --- Small sub-components ---------------------------------------------------

/** Target/crosshair icon used at START and FINISH. */
function TargetIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g stroke={color} strokeWidth={2} fill="none">
      <circle cx={x} cy={y} r={22} strokeWidth={2} />
      <circle cx={x} cy={y} r={14} strokeWidth={1.5} />
      <circle cx={x} cy={y} r={6} fill={color} />
      <line x1={x - 30} y1={y} x2={x - 25} y2={y} />
      <line x1={x + 25} y1={y} x2={x + 30} y2={y} />
      <line x1={x} y1={y - 30} x2={x} y2={y - 25} />
      <line x1={x} y1={y + 25} x2={x} y2={y + 30} />
    </g>
  )
}

function MilestoneCard({ label, description }: { label: string; description: string }) {
  return (
    <div className="w-full border border-border-subtle bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.06)] lg:w-[280px]">
      <div className="flex items-start gap-3">
        <span className="mt-1 block h-5 w-[3px] bg-text-primary" aria-hidden />
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">{label}</p>
      </div>
      <p className="mt-3 pl-[15px] text-[13px] leading-snug text-text-secondary">
        {description}
      </p>
    </div>
  )
}

// --- Main component ---------------------------------------------------------

export function BuildMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const [active, setActive] = useState(false)
  const [pathLength, setPathLength] = useState(2800)
  const [nodeProgress, setNodeProgress] = useState<number[]>(NODE_PROGRESS_FALLBACK)

  // Measure the actual path length AND the fractional path-position of each
  // node, so card reveals are synchronized with where the red line really is.
  useEffect(() => {
    const path = pathRef.current
    if (!path) return
    const total = path.getTotalLength()
    setPathLength(total)

    // For each node, walk the path in fixed-length steps and find the length at
    // which the path is closest to the node's (x, y). Convert to a 0..1 fraction.
    const STEP = 4 // px along the path
    const fractions = NODES.map((node) => {
      let bestLen = 0
      let bestDist = Infinity
      for (let len = 0; len <= total; len += STEP) {
        const pt = path.getPointAtLength(len)
        const dx = pt.x - node.x
        const dy = pt.y - node.y
        const d = dx * dx + dy * dy
        if (d < bestDist) {
          bestDist = d
          bestLen = len
        }
      }
      return bestLen / total
    })
    setNodeProgress(fractions)
  }, [])

  // Trigger animation once when the graphic scrolls into view.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(true)
            observer.disconnect()
          }
        })
      },
      // Fire when the top edge is ~15% into the viewport so the user has time
      // to settle on the graphic before the path begins drawing.
      { threshold: 0, rootMargin: "0px 0px -15% 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={`build-map relative border border-border-subtle bg-white p-6 md:p-10 ${active ? "is-active" : ""}`}
      style={{ ["--bm-duration" as string]: `${DURATION_S}s`, ["--bm-path-length" as string]: String(pathLength) }}
    >
      {/* Kicker label */}
      <div className="mb-3 inline-flex items-center rounded-full border border-border-subtle bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text-secondary">
        The Build Map
      </div>

      {/* Desktop layout — SVG + absolute-positioned cards */}
      <div className="hidden lg:block">
        <div className="relative w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            {/* Subtle background grid */}
            <defs>
              <pattern id="bm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EEF2F7" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#bm-grid)" opacity={0.6} />

            {/* Node-to-card connectors — draw out from the node toward the card */}
            {NODES.map((n, i) => {
              // Gap expressed in viewBox units so it scales with the container.
              // Must stay in sync with --bm-connector-len in globals.css and the
              // card positioning math below.
              const cardGap = CARD_GAP_VB
              const y2 = n.above ? n.y - cardGap : n.y + cardGap
              return (
                /* Drawn (not dashed) so the stroke-dashoffset animation reads
                   as a continuous reveal, matching the main path's draw motif. */
                <line
                  key={`connector-${n.key}`}
                  className="build-map__connector"
                  x1={n.x}
                  y1={n.y}
                  x2={n.x}
                  y2={y2}
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  style={{ ["--bm-delay" as string]: `${(nodeProgress[i] ?? NODE_PROGRESS_FALLBACK[i]) * DURATION_S}s` }}
                />
              )
            })}

            {/* Dashed baseline path — always visible */}
            <path
              d={PATH_D}
              fill="none"
              stroke="#1E293B"
              strokeOpacity={0.35}
              strokeWidth={2.5}
              strokeDasharray="8 6"
              strokeLinecap="round"
            />

            {/* Red progress line — animates from start to finish */}
            <path
              ref={pathRef}
              className="build-map__progress"
              d={PATH_D}
              fill="none"
              stroke="#E11D48"
              strokeWidth={3}
              strokeLinecap="round"
            />

            {/* Node dots */}
            {NODES.map((n, i) => (
              <g key={`node-${n.key}`}>
                <circle
                  className="build-map__node"
                  cx={n.x}
                  cy={n.y}
                  r={10}
                  fill="#FFFFFF"
                  stroke="#0F172A"
                  strokeWidth={2}
                  style={{ ["--bm-delay" as string]: `${(nodeProgress[i] ?? NODE_PROGRESS_FALLBACK[i]) * DURATION_S}s` }}
                />
              </g>
            ))}

            {/* Start + finish targets */}
            <TargetIcon x={START.x} y={START.y} color="#E11D48" />
            <TargetIcon x={FINISH.x} y={FINISH.y} color="#0F172A" />

            {/* START / READY labels */}
            <text x={START.x} y={START.y - 50} textAnchor="middle" className="fill-[#64748B]" style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.18em" }}>
              START
            </text>
            <text x={FINISH.x} y={FINISH.y - 50} textAnchor="middle" className="fill-[#64748B]" style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.18em" }}>
              READY TO BUILD
            </text>
          </svg>

          {/* Cards overlay — positioned in the same viewBox coordinate space.
              Above-cards anchor by `bottom` (so they rise from the node);
              below-cards anchor by `top`. Both gaps are in viewBox-relative
              percentages, which means the layout scales without ever pushing
              cards past the container edges at narrow viewports. */}
          {NODES.map((n, i) => {
            const leftPct = (n.x / VB_W) * 100
            const positioning = n.above
              ? { bottom: `${(1 - (n.y - CARD_GAP_VB) / VB_H) * 100}%` }
              : { top: `${((n.y + CARD_GAP_VB) / VB_H) * 100}%` }
            return (
              <div
                key={`card-${n.key}`}
                className="build-map__card absolute"
                style={{
                  left: `${leftPct}%`,
                  ...positioning,
                  transform: "translate(-50%, 0)",
                  ["--bm-delay" as string]: `${(nodeProgress[i] ?? NODE_PROGRESS_FALLBACK[i]) * DURATION_S}s`,
                }}
              >
                {/* Inner wrapper carries the lift+fade entrance so it doesn't
                    fight the outer positioning transform. */}
                <div className="build-map__card-inner">
                  <MilestoneCard label={n.label} description={n.description} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile / tablet layout — vertical stack with a dashed left rail */}
      <div className="lg:hidden">
        <div className="relative pl-8">
          {/* Vertical dashed rail */}
          <div
            className="build-map__rail absolute left-[11px] top-2 bottom-2 w-px border-l border-dashed border-text-primary/30"
            aria-hidden
          />

          {/* START marker */}
          <div className="relative mb-6 flex items-center gap-3">
            <span className="absolute -left-8 flex h-6 w-6 items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-primary" />
              <span className="h-2 w-2 rounded-full bg-primary" />
            </span>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Start</p>
          </div>

          {/* Milestone cards */}
          <div className="space-y-5">
            {NODES.map((n, i) => (
              <div
                key={`m-${n.key}`}
                className="build-map__mobile-card relative"
                style={{
                  opacity: 1,
                  transform: "none",
                  ["--bm-delay" as string]: `${(nodeProgress[i] ?? NODE_PROGRESS_FALLBACK[i]) * DURATION_S}s`,
                }}
              >
                <span className="absolute -left-[26px] top-4 h-3 w-3 rounded-full border-2 border-text-primary bg-white" aria-hidden />
                <MilestoneCard label={n.label} description={n.description} />
              </div>
            ))}
          </div>

          {/* READY marker */}
          <div className="relative mt-6 flex items-center gap-3">
            <span className="absolute -left-8 flex h-6 w-6 items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-text-primary" />
              <span className="h-2 w-2 rounded-full bg-text-primary" />
            </span>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Ready to Build</p>
          </div>
        </div>
      </div>

      {/* Handoff line — explains what "ready" means */}
      <p className="mt-4 max-w-[820px] text-[14px] leading-relaxed text-text-secondary lg:mt-6">
        You&rsquo;ve done the messy part: figuring out <em>what</em> to build, <em>why</em> it matters, and <em>how</em> to take it to market. From here, hand it off to your coding agent of choice (Cursor, Claude Code, Lovable, v0) and ship it.
      </p>
    </div>
  )
}

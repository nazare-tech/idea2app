"use client"

import { useEffect, useRef, type CSSProperties, type JSX } from "react"

import {
  BUILD_MAP_MOCKUPS,
  BUILD_MAP_NODE_LABELS,
  BUILD_MAP_SCENARIOS,
  CYCLE_TIMING,
  PANEL_ORDER,
  RESEARCH_FOOTNOTE,
  RESEARCH_ROW_COUNT,
  TALL_LAYOUT,
  WIDE_LAYOUT,
  type BuildMapLayout,
  type BuildMapNodeId,
  type BuildMapNodePlacement,
  type BuildMapScenario,
} from "@/lib/landing-hero-build-map"

/**
 * The hero's closing artwork: a build map of five artifact nodes (Idea,
 * Research, Plan, Design, Prompt) wired by drawn connectors, cycling through
 * three sample ideas forever.
 *
 * Two layouts are rendered and CSS-swapped at 1024px (see
 * `landing-hero-build-map.ts` for both canvases). Node content renders from one
 * shared renderer per node, so wide and tall can never drift in copy.
 *
 * Styling convention here: Tailwind for colors, structure, and static type;
 * inline styles for everything that depends on the canvas — percentage
 * geometry, container-relative type and padding, and per-element animation
 * delays.
 *
 * Every length inside a node is a percentage of that node's own width (`cqw`
 * against the node, which is its own container-query context), never a fixed
 * pixel size. That matters: node heights are percentages of a canvas whose
 * height scales with its width, so type fixed in pixels stays put while its box
 * shrinks, and the copy gets clipped mid-glyph at 1024-1280px and below 430px.
 * The design file expresses these as `min(px, cqw)` against the whole canvas
 * and does clip at those widths. Coefficients here are anchored to the design's
 * 1760px canvas, so the reference rendering is identical and narrower viewports
 * scale the whole drawing down instead of cropping it.
 *
 * The scenario cycle is plain DOM writes from one effect: five text targets and
 * four opacity targets, roughly every seven seconds. Nothing here is React
 * state, and the artwork is `aria-hidden` — the headline above it carries the
 * message for assistive tech.
 */

const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)"

/** Paper-stack and hairline shades. One-offs, no token equivalent. */
const STACK_OUTER_BORDER = "var(--border-subtle)"
const STACK_INNER_FILL = "var(--card)"
const FILE_ROW_HAIRLINE = "var(--border-subtle)"

const FIRST = BUILD_MAP_SCENARIOS[0]

/**
 * Each node's width on the design's reference canvas, derived from the layout
 * data so it cannot drift from it.
 */
const REFERENCE_NODE_WIDTH = Object.fromEntries(
  WIDE_LAYOUT.nodes.map((node) => [
    node.id,
    (Number.parseFloat(node.width) / 100) * WIDE_LAYOUT.canvas.width,
  ])
) as Record<BuildMapNodeId, number>

/**
 * A design pixel value, re-expressed as a share of the node's own width: exact
 * at the reference canvas, proportional below it. The `min()` keeps the design
 * value as a hard ceiling.
 */
function sized(id: BuildMapNodeId, px: number): string {
  const share = ((px / REFERENCE_NODE_WIDTH[id]) * 100).toFixed(3)
  return `min(${px}px, ${share}cqw)`
}

/** Content panels fade as a unit; index drives the reveal stagger. */
function panelIndex(id: BuildMapNodeId): number {
  return PANEL_ORDER.indexOf(id)
}

/** Resting state of a content panel; the cycle animates opacity only. */
const PANEL_STYLE: CSSProperties = { opacity: 1, transition: `opacity 520ms ${EXPO}` }

function NodeLabel({ id, align }: { id: BuildMapNodeId; align: "left" | "right" }) {
  const { name, detail } = BUILD_MAP_NODE_LABELS[id]
  return (
    <div
      className="hero-node-label absolute bottom-full flex whitespace-nowrap"
      style={{
        left: align === "left" ? 0 : "auto",
        right: align === "right" ? 0 : "auto",
        alignItems: align === "right" ? "flex-end" : "baseline",
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        marginBottom: sized(id, 10),
        gap: sized(id, 12),
      }}
    >
      <span
        className="font-mono font-bold uppercase text-text-primary"
        style={{ fontSize: sized(id, 11), letterSpacing: "0.04em" }}
      >
        {name}
      </span>
      <span
        className="font-mono font-normal uppercase text-text-muted"
        style={{ fontSize: sized(id, 11), letterSpacing: "0.18em" }}
      >
        {detail}
      </span>
    </div>
  )
}

/** Two offset sheets behind a card face, suggesting a stack of paper. */
function PaperStack({ id }: { id: BuildMapNodeId }) {
  const sheets = [
    { offset: sized(id, 18), border: STACK_OUTER_BORDER, fill: "var(--background)" },
    { offset: sized(id, 9), border: "var(--border-strong)", fill: STACK_INNER_FILL },
  ]
  return (
    <>
      {sheets.map((sheet) => (
        <div
          key={sheet.offset}
          className="absolute border"
          style={{
            left: sheet.offset,
            top: sheet.offset,
            right: `calc(${sheet.offset} * -1)`,
            bottom: `calc(${sheet.offset} * -1)`,
            borderColor: sheet.border,
            background: sheet.fill,
          }}
        />
      ))}
    </>
  )
}

function IdeaNode() {
  return (
    <>
      <PaperStack id="idea" />
      <div className="absolute inset-0 border border-border-strong bg-card" />
      <div
        className="absolute inset-0 box-border overflow-hidden"
        style={{ padding: `${sized("idea", 15)} ${sized("idea", 17)}` }}
      >
        <p
          className="m-0 text-left text-text-primary"
          style={{ fontSize: sized("idea", 12), lineHeight: 1.45, letterSpacing: "-0.01em" }}
        >
          <span className="font-mono text-text-muted">&gt;&nbsp;</span>
          <span data-bm-idea-text>{FIRST.idea}</span>
          <span
            className="hero-node-caret inline-block h-[0.9em] bg-primary align-[-0.08em]"
            style={{ width: sized("idea", 6), marginLeft: sized("idea", 3) }}
            aria-hidden="true"
          />
        </p>
      </div>
    </>
  )
}

function ResearchNode() {
  return (
    <>
      <div className="absolute inset-0 border border-border-strong bg-secondary" />
      <div
        data-bm-fade={panelIndex("research")}
        data-bm-research
        className="absolute inset-0 box-border flex flex-col justify-center overflow-hidden"
        style={{ ...PANEL_STYLE, gap: sized("research", 10), padding: sized("research", 16) }}
      >
        {FIRST.competitors.slice(0, RESEARCH_ROW_COUNT).map((competitor) => (
          <div
            key={competitor.domain}
            data-bm-comp
            className="flex items-center border border-border-subtle bg-card"
            style={{
              gap: sized("research", 10),
              padding: `${sized("research", 10)} ${sized("research", 12)}`,
            }}
          >
            {/* Favicon service rather than local assets: same reasoning as the
                feature stage cards, which already ship this pattern. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://www.google.com/s2/favicons?domain=${competitor.domain}&sz=64`}
              alt=""
              aria-hidden="true"
              width={18}
              height={18}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="flex-none object-contain"
              style={{ width: sized("research", 18), height: sized("research", 18) }}
            />
            <span
              data-bm-comp-name
              className="min-w-0 truncate font-bold text-text-primary"
              style={{ fontSize: sized("research", 13), letterSpacing: "-0.02em" }}
            >
              {competitor.name}
            </span>
          </div>
        ))}
        <p
          className="m-0 font-mono font-medium uppercase text-text-muted"
          style={{
            marginTop: sized("research", 2),
            fontSize: sized("research", 9),
            letterSpacing: "0.18em",
          }}
        >
          {RESEARCH_FOOTNOTE}
        </p>
      </div>
    </>
  )
}

function PlanKicker({ children }: { children: string }) {
  return (
    <p
      className="m-0 font-mono font-medium uppercase text-text-muted"
      style={{ fontSize: sized("plan", 9), letterSpacing: "0.18em" }}
    >
      {children}
    </p>
  )
}

function PlanNode() {
  return (
    <>
      <div className="absolute inset-0 border border-border-strong bg-card" />
      <div
        data-bm-fade={panelIndex("plan")}
        data-bm-plan
        className="absolute inset-0 box-border flex flex-col justify-center overflow-hidden"
        style={{ ...PANEL_STYLE, gap: sized("plan", 10), padding: sized("plan", 18) }}
      >
        <PlanKicker>Persona</PlanKicker>
        <div className="flex items-center" style={{ gap: sized("plan", 10) }}>
          <span
            data-bm-persona-ini
            className="font-display flex flex-none items-center justify-center bg-sidebar-bg font-bold text-background"
            style={{
              width: sized("plan", 30),
              height: sized("plan", 30),
              fontSize: sized("plan", 12),
            }}
          >
            {FIRST.persona.initials}
          </span>
          <span className="flex min-w-0 flex-col">
            <span
              data-bm-persona-name
              className="truncate font-bold text-text-primary"
              style={{ fontSize: sized("plan", 13), letterSpacing: "-0.02em" }}
            >
              {FIRST.persona.name}
            </span>
            <span
              data-bm-persona-role
              className="truncate font-mono font-medium uppercase text-text-muted"
              style={{ fontSize: sized("plan", 9), letterSpacing: "0.12em" }}
            >
              {FIRST.persona.role}
            </span>
          </span>
        </div>
        <div
          className="h-px flex-none bg-border-subtle"
          style={{ margin: `${sized("plan", 4)} 0` }}
        />
        <PlanKicker>Goals</PlanKicker>
        {FIRST.goals.map((goal, index) => (
          <div key={goal} className="flex items-baseline" style={{ gap: sized("plan", 8) }}>
            <span
              className="flex-none font-mono font-medium text-text-muted"
              style={{ fontSize: sized("plan", 10) }}
            >
              {`G${index + 1}`}
            </span>
            <span
              data-bm-goal
              className="min-w-0 text-text-secondary"
              style={{ fontSize: sized("plan", 12), lineHeight: 1.4 }}
            >
              {goal}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

function DesignNode() {
  return (
    <>
      <PaperStack id="design" />
      <div className="absolute inset-0 border border-border-strong bg-secondary" />
      <div
        data-bm-fade={panelIndex("design")}
        className="absolute overflow-hidden"
        style={{ ...PANEL_STYLE, inset: sized("design", 1) }}
      >
        {BUILD_MAP_MOCKUPS.map((mockup, index) => (
          // Clipped mobile mockups (portrait, transparent background): the
          // phone renders contained and centered on the node's paper backdrop
          // instead of the old desktop screenshots' full-bleed cover crop. A
          // small top offset keeps the full status-bar frame visible while the
          // bottom edge sits flush.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={mockup.src}
            data-bm-mock={index}
            src={mockup.src}
            alt=""
            aria-hidden="true"
            loading={index === FIRST.mockup ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-x-0 mx-auto object-contain"
            style={{
              top: "6%",
              height: "94%",
              opacity: index === FIRST.mockup ? 1 : 0,
              transition: `opacity 620ms ${EXPO}`,
            }}
          />
        ))}
      </div>
    </>
  )
}

function FileIcon() {
  return (
    <svg
      style={{ width: sized("prompt", 13), height: sized("prompt", 13) }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-muted)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  )
}

function PromptNode() {
  return (
    <>
      <div className="absolute inset-0 border border-border-strong bg-card" />
      <div
        data-bm-fade={panelIndex("prompt")}
        data-bm-prompt
        className="absolute inset-0 box-border flex flex-col justify-center overflow-hidden"
        style={{ ...PANEL_STYLE, padding: `${sized("prompt", 12)} ${sized("prompt", 18)}` }}
      >
        {FIRST.files.map((file, index) => (
          <div
            key={file + index}
            className="flex items-center"
            style={{
              gap: sized("prompt", 10),
              padding: `${sized("prompt", 7)} 0`,
              borderBottom:
                index === FIRST.files.length - 1 ? undefined : `1px solid ${FILE_ROW_HAIRLINE}`,
            }}
          >
            <FileIcon />
            <span
              data-bm-file
              className="min-w-0 truncate font-mono text-text-secondary"
              style={{ fontSize: sized("prompt", 11) }}
            >
              {file}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

const NODE_BODIES: Record<BuildMapNodeId, () => JSX.Element> = {
  idea: IdeaNode,
  research: ResearchNode,
  plan: PlanNode,
  design: DesignNode,
  prompt: PromptNode,
}

function Node({ placement }: { placement: BuildMapNodePlacement }) {
  const Body = NODE_BODIES[placement.id]
  return (
    <div
      className="hero-node-up absolute z-[2]"
      style={{
        // The node, not the canvas, is what `sized()` measures against, so a
        // node's contents keep their proportions at every viewport width.
        containerType: "inline-size",
        left: placement.left,
        top: placement.top,
        width: placement.width,
        height: placement.height,
        animationDelay: `${placement.delay}ms`,
      }}
    >
      <NodeLabel id={placement.id} align={placement.labelAlign} />
      <Body />
    </div>
  )
}

function Canvas({ layout, className }: { layout: BuildMapLayout; className: string }) {
  const { canvas } = layout
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <div
        className="relative mx-auto w-full"
        style={{
          // Everything inside sizes off this box's width via cqw, so the map
          // scales as one drawing.
          containerType: "inline-size",
          maxWidth: layout.maxWidth,
          aspectRatio: `${canvas.width} / ${canvas.height}`,
        }}
      >
        {/* Connectors are stretched with the canvas (`preserveAspectRatio: none`)
            while `non-scaling-stroke` keeps the hairline exactly 1.25px. */}
        <svg
          viewBox={`0 0 ${canvas.width} ${canvas.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <g
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.25"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          >
            {layout.connectors.map((connector) => (
              <path
                key={connector.d}
                d={connector.d}
                className="hero-node-draw"
                style={{ animationDelay: `${connector.delay}ms` }}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </svg>

        {layout.joints.map((joint) => (
          <div
            key={`${joint.left}-${joint.top}`}
            className="hero-node-fade absolute z-[3] h-[13px] w-[13px] rounded-full border border-border-strong bg-card"
            style={{
              left: joint.left,
              top: joint.top,
              transform: "translate(-50%, -50%)",
              animationDelay: `${joint.delay}ms`,
            }}
          />
        ))}

        {layout.nodes.map((placement) => (
          <Node key={placement.id} placement={placement} />
        ))}
      </div>
    </div>
  )
}

/** One live handle on the cycle, so a restart can retire the previous run. */
interface CycleRun {
  stale: boolean
}

export function HeroBuildMap() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const all = <T extends HTMLElement>(selector: string) =>
      Array.from(root.querySelectorAll<T>(selector))

    const setPanelOpacity = (value: string) => {
      for (const panel of all("[data-bm-fade]")) panel.style.opacity = value
    }

    const applyScenario = (scenario: BuildMapScenario) => {
      for (const box of all("[data-bm-research]")) {
        const rows = Array.from(box.querySelectorAll<HTMLElement>("[data-bm-comp]"))
        rows.forEach((row, index) => {
          const competitor = scenario.competitors[index]
          if (!competitor) return
          const icon = row.querySelector("img")
          const name = row.querySelector<HTMLElement>("[data-bm-comp-name]")
          if (icon) icon.src = `https://www.google.com/s2/favicons?domain=${competitor.domain}&sz=64`
          if (name) name.textContent = competitor.name
        })
      }
      for (const el of all("[data-bm-persona-ini]")) el.textContent = scenario.persona.initials
      for (const el of all("[data-bm-persona-name]")) el.textContent = scenario.persona.name
      for (const el of all("[data-bm-persona-role]")) el.textContent = scenario.persona.role
      for (const box of all("[data-bm-plan]")) {
        Array.from(box.querySelectorAll<HTMLElement>("[data-bm-goal]")).forEach((el, index) => {
          el.textContent = scenario.goals[index] ?? ""
        })
      }
      for (const box of all("[data-bm-prompt]")) {
        Array.from(box.querySelectorAll<HTMLElement>("[data-bm-file]")).forEach((el, index) => {
          el.textContent = scenario.files[index] ?? ""
        })
      }
      for (const image of all<HTMLImageElement>("[data-bm-mock]")) {
        image.style.opacity = image.dataset.bmMock === String(scenario.mockup) ? "1" : "0"
      }
    }

    const setIdeaText = (text: string) => {
      for (const el of all("[data-bm-idea-text]")) el.textContent = text
    }

    // Every pending timer, so a restart or unmount cannot leave one writing to
    // the DOM after the run that scheduled it was retired.
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          timers.delete(timer)
          resolve()
        }, ms)
        timers.add(timer)
      })
    const clearTimers = () => {
      for (const timer of timers) clearTimeout(timer)
      timers.clear()
    }

    const revealPanels = (run: CycleRun) => {
      for (const panel of all("[data-bm-fade]")) {
        const index = Number(panel.dataset.bmFade ?? 0)
        const timer = setTimeout(() => {
          timers.delete(timer)
          if (!run.stale) panel.style.opacity = "1"
        }, index * CYCLE_TIMING.revealStagger)
        timers.add(timer)
      }
    }

    const cycle = async (run: CycleRun) => {
      await wait(CYCLE_TIMING.initialHold)
      let index = 0
      while (!run.stale) {
        const scenario = BUILD_MAP_SCENARIOS[index % BUILD_MAP_SCENARIOS.length]
        setPanelOpacity("0")
        setIdeaText("")
        await wait(CYCLE_TIMING.clear)
        if (run.stale) return
        applyScenario(scenario)
        for (let length = 1; length <= scenario.idea.length; length += 1) {
          setIdeaText(scenario.idea.slice(0, length))
          await wait(CYCLE_TIMING.typeBase + Math.random() * CYCLE_TIMING.typeJitter)
          if (run.stale) return
        }
        await wait(CYCLE_TIMING.beforeReveal)
        if (run.stale) return
        revealPanels(run)
        index += 1
        await wait(CYCLE_TIMING.hold)
      }
    }

    /** The state a reduced-motion visitor sees: scenario 1, fully revealed. */
    const showStaticFirstScenario = () => {
      applyScenario(FIRST)
      setIdeaText(FIRST.idea)
      setPanelOpacity("1")
    }

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let run: CycleRun = { stale: false }

    const start = () => {
      run.stale = true
      clearTimers()
      run = { stale: false }
      if (reduceQuery.matches) {
        showStaticFirstScenario()
        return
      }
      void cycle(run)
    }

    // Reduced motion can be switched on while this page sits open; the loop has
    // to notice rather than keep retyping.
    reduceQuery.addEventListener("change", start)
    start()

    return () => {
      run.stale = true
      clearTimers()
      reduceQuery.removeEventListener("change", start)
    }
  }, [])

  return (
    <div ref={rootRef} aria-hidden="true">
      <Canvas layout={WIDE_LAYOUT} className="hidden lg:block" />
      <Canvas layout={TALL_LAYOUT} className="block lg:hidden" />
    </div>
  )
}

"use client"

import { useEffect, useRef } from "react"

import { FeatureStageCard } from "@/components/landing/feature-stage-card"
import {
  FEATURE_BLOCKS,
  RAIL_LABELS,
  STAGE_LANDSCAPE,
  STAGE_PORTRAIT,
  STAGE_SETS,
  type StagePosition,
} from "@/lib/landing-feature-stage"

const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)"

/** How much scroll length each pinned text block occupies, in vh. */
const BLOCK_SCROLL_VH = 86
/** Sticky offset from the top of the viewport for both columns. */
const PIN_TOP = 92
/** Vertical room given up to the sticky header and bottom breathing space. */
const PIN_GUTTER = 128
/** How far off screen the section can go before the frame loop stops working. */
const IDLE_MARGIN = 200

interface StageSetRuntime {
  el: HTMLElement
  cards: HTMLElement[]
  /** Smoothed horizontal offset for portrait "flow" sets, in px. */
  flowX: number | null
  portraitShift: number
  smallPortraitShift: number
}

/**
 * The features section: a sticky card stage on the left and a pinned column of
 * feature copy on the right, both driven by one requestAnimationFrame loop
 * reading the section's scroll position.
 *
 * The stage is a fixed-size canvas (see `landing-feature-stage.ts`) scaled to
 * fit, so card geometry is resolution independent. Below 1024px the grid
 * collapses: the stage becomes a sticky portrait strip, the text blocks go
 * `visibility: hidden` (they exist only to give the section scroll length), and
 * the short "swap panels" under the stage carry the copy instead.
 *
 * Everything the loop touches is written straight to DOM style. No React state
 * changes per frame.
 */
export function FeatureScrollytelling() {
  const sectionRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const textColRef = useRef<HTMLDivElement>(null)
  const textPinRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const grid = gridRef.current
    const stage = stageRef.current
    const canvas = canvasRef.current
    const textCol = textColRef.current
    const textPin = textPinRef.current
    if (!section || !grid || !stage || !canvas || !textCol || !textPin) return

    const blocks = Array.from(textPin.querySelectorAll<HTMLElement>("[data-feature-block]"))
    const swaps = Array.from(section.querySelectorAll<HTMLElement>("[data-swap-panel]"))
    const sets: StageSetRuntime[] = Array.from(
      canvas.querySelectorAll<HTMLElement>("[data-stage-set]")
    ).map((el) => ({
      el,
      cards: Array.from(el.querySelectorAll<HTMLElement>("[data-stage-card]")),
      flowX: null,
      portraitShift: Number(el.dataset.portraitShift || 0),
      smallPortraitShift: Number(el.dataset.smallPortraitShift || el.dataset.portraitShift || 0),
    }))
    if (!blocks.length || !sets.length) return

    const desktopQuery = window.matchMedia("(min-width: 1024px)")
    const smallQuery = window.matchMedia("(max-width: 767px)")
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const rail = railRef.current
    const railLine = rail?.querySelector<HTMLElement>("[data-rail-line]") ?? null
    const railDot = rail?.querySelector<HTMLElement>("[data-rail-dot]") ?? null
    const railChip = rail?.querySelector<HTMLElement>("[data-rail-chip]") ?? null
    const railTicks = rail ? Array.from(rail.querySelectorAll<HTMLElement>("[data-rail-tick]")) : []

    // ---- Text column: pinned crossfade (desktop) vs. plain flow (mobile) ----
    let pinned: boolean | null = null
    let activeIndex = -2

    const applyPinning = (shouldPin: boolean) => {
      if (shouldPin === pinned) return
      pinned = shouldPin
      textCol.style.height = shouldPin
        ? `calc(${blocks.length * BLOCK_SCROLL_VH}vh + 100vh - ${PIN_GUTTER}px)`
        : ""
      textPin.style.position = shouldPin ? "sticky" : "relative"
      textPin.style.top = shouldPin ? `${PIN_TOP}px` : ""
      textPin.style.height = shouldPin ? `calc(100vh - ${PIN_GUTTER}px)` : ""
      textPin.style.display = shouldPin ? "grid" : ""
      textPin.style.alignContent = shouldPin ? "center" : ""
      for (const block of blocks) {
        block.style.gridArea = shouldPin ? "1 / 1" : ""
        block.style.minHeight = shouldPin ? "0" : ""
        block.style.justifyContent = shouldPin ? "flex-start" : ""
        block.style.transition = shouldPin
          ? `opacity 560ms ${EXPO}, transform 560ms ${EXPO}`
          : ""
        if (!shouldPin) {
          block.style.opacity = ""
          block.style.transform = ""
          block.style.pointerEvents = ""
        }
      }
      activeIndex = -2
    }

    const setLineState = (block: HTMLElement, on: boolean) => {
      const lines = Array.from(block.querySelectorAll<HTMLElement>("[data-line]"))
      lines.forEach((line, i) => {
        const delay = on ? i * 80 : 0
        line.style.transition = `opacity 600ms ${EXPO} ${delay}ms, transform 600ms ${EXPO} ${delay}ms`
        line.style.opacity = on ? "1" : "0.25"
        line.style.transform = on ? "translateY(0)" : "translateY(10px)"
      })
    }

    const applyActive = (index: number) => {
      if (index === activeIndex) return
      activeIndex = index
      const resolved = Math.max(0, index)
      blocks.forEach((block, i) => {
        if (pinned) {
          const on = i === resolved
          block.style.opacity = on ? "1" : "0"
          block.style.transform = on ? "translateY(0)" : "translateY(22px)"
          block.style.pointerEvents = on ? "auto" : "none"
          setLineState(block, on)
        } else {
          setLineState(block, index < 0 ? true : i === index)
        }
      })
      swaps.forEach((panel, i) => {
        const on = i === resolved
        panel.style.opacity = on ? "1" : "0"
        panel.style.transform = on ? "translateY(0)" : "translateY(14px)"
      })
    }

    // ---- Stage ----
    let lastPortrait: boolean | null = null
    let lastScale = -1
    // Avoids re-writing identical top/left/width on every frame.
    const cardGeometry = new WeakMap<HTMLElement, string>()

    const applyCardPosition = (card: HTMLElement, position: StagePosition) => {
      const key = `${position.top}|${position.left}|${position.width}`
      if (cardGeometry.get(card) === key) return
      cardGeometry.set(card, key)
      card.style.top = position.top
      card.style.left = position.left
      card.style.width = position.width
    }

    let frame = 0

    const renderFrame = () => {
      const viewportHeight = window.innerHeight
      const sectionRect = section.getBoundingClientRect()
      const offScreen =
        sectionRect.bottom < -IDLE_MARGIN || sectionRect.top > viewportHeight + IDLE_MARGIN

      if (rail) {
        const gridRect = grid.getBoundingClientRect()
        const railOn =
          !offScreen && gridRect.top <= 100 && gridRect.bottom > viewportHeight * 0.85
        rail.style.opacity = railOn ? "1" : "0"
        rail.style.transform = railOn ? "translateX(0)" : "translateX(-24px)"
        for (const tickMark of railTicks) {
          tickMark.style.opacity = railOn ? "1" : "0"
          tickMark.style.transform = railOn ? "translateX(0)" : "translateX(-12px)"
        }
        if (railOn) {
          const travel = Math.max(1, gridRect.height - viewportHeight)
          const progress = Math.min(1, Math.max(0, -gridRect.top / travel))
          const railHeight = rail.clientHeight
          const y = progress * railHeight
          if (railLine) railLine.style.height = `${y.toFixed(1)}px`
          if (railDot) railDot.style.transform = `translateY(${(y - 4).toFixed(1)}px)`
          if (railChip) {
            const bearing = String(Math.round(progress * 360)).padStart(3, "0")
            const label = RAIL_LABELS[Math.min(RAIL_LABELS.length - 1, Math.floor(progress * 5))]
            railChip.textContent = `${bearing}° / ${label}`
            railChip.style.transform = `translateY(${Math.max(0, Math.min(y - 4, railHeight - 130)).toFixed(1)}px)`
          }
        }
      }

      // Nothing below this point is visible when the section is off screen.
      if (offScreen) return

      const isDesktop = desktopQuery.matches
      applyPinning(isDesktop)

      let index = -1
      let blockProgress = 0
      if (isDesktop) {
        const rect = textCol.getBoundingClientRect()
        const pinHeight = Math.min(rect.height, viewportHeight - PIN_GUTTER)
        const span = Math.max(1, rect.height - pinHeight)
        const position = ((PIN_TOP - rect.top) / span) * blocks.length
        index = position < 0 ? -1 : Math.min(blocks.length - 1, Math.floor(position))
        if (index >= 0) blockProgress = Math.min(1, Math.max(0, position - index))
      } else {
        const rects = blocks.map((block) => block.getBoundingClientRect())
        for (let i = 0; i < rects.length; i++) {
          if (rects[i].top < viewportHeight * 0.52) index = i
        }
        if (index >= 0 && index < rects.length - 1) {
          const spanToNext = Math.max(1, rects[index + 1].top - rects[index].top)
          blockProgress = Math.min(1, Math.max(0, (viewportHeight * 0.52 - rects[index].top) / spanToNext))
        } else if (index === rects.length - 1) {
          const spanToEnd = Math.max(1, rects[index].height)
          blockProgress = Math.min(1, Math.max(0, (viewportHeight * 0.52 - rects[index].top) / spanToEnd))
        }
      }
      applyActive(index)

      const portrait = !isDesktop
      const small = smallQuery.matches
      const canvasSize = portrait ? STAGE_PORTRAIT : STAGE_LANDSCAPE
      if (portrait !== lastPortrait) {
        lastPortrait = portrait
        stage.style.aspectRatio = `${canvasSize.width} / ${canvasSize.height}`
        // Portrait "flow" sets slide sideways past the stage edge.
        stage.style.overflow = portrait ? "visible" : "hidden"
        canvas.style.width = `${canvasSize.width}px`
        canvas.style.height = `${canvasSize.height}px`
      }
      const scale = (stage.clientWidth || canvasSize.width) / canvasSize.width
      if (Math.abs(scale - lastScale) > 0.0005) {
        lastScale = scale
        canvas.style.transform = `scale(${scale})`
      }

      const activeSetIndex = Math.max(0, Math.min(sets.length - 1, index < 0 ? 0 : index))
      sets.forEach((set, setIndex) => {
        const isActive = setIndex === activeSetIndex
        set.el.style.opacity = isActive ? "1" : "0"
        const flows = set.el.dataset.flow === "1"
        if (flows) {
          if (!portrait) {
            set.flowX = 0
            set.el.style.transform = "translateX(0px)"
          } else {
            const shiftPercent = small ? set.smallPortraitShift : set.portraitShift
            const target =
              isActive && index >= 0
                ? (Math.min(1, blockProgress * 2.1) * shiftPercent * canvasSize.width) / 100
                : 0
            if (set.flowX == null) set.flowX = target
            set.flowX += (target - set.flowX) * (reduced ? 1 : 0.2)
            if (Math.abs(target - set.flowX) < 0.5) set.flowX = target
            set.el.style.transform = `translateX(${-set.flowX}px)`
          }
        }
        set.cards.forEach((card, cardIndex) => {
          const source = STAGE_SETS[setIndex]?.cards[cardIndex]
          if (!source) return
          const position = portrait
            ? (small && source.portraitSmall) || source.portrait
            : source.landscape
          applyCardPosition(card, position)
        })
      })

      const activeSet = sets[activeSetIndex]
      const cardCount = activeSet.cards.length
      // Flow sets show every card at once and move as a strip instead.
      const flowSet = activeSet.el.dataset.flow === "1" && portrait
      const revealed =
        index < 0 ? 1 : Math.min(cardCount, 1 + Math.floor(Math.min(0.999, blockProgress * 1.6) * cardCount))
      activeSet.cards.forEach((card, cardIndex) => {
        const on = flowSet || cardIndex < revealed
        const rotation = card.dataset.rotation || "0"
        card.style.opacity = on ? "1" : "0"
        card.style.transform = on
          ? `rotate(${rotation}deg)`
          : `translateY(30px) scale(0.97) rotate(${rotation}deg)`
      })
    }

    const tick = () => {
      renderFrame()
      frame = requestAnimationFrame(tick)
    }

    // Establish a visible first frame synchronously so the artwork never waits
    // for the animation loop to leave its hidden rest state.
    renderFrame()
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      {/* Compass rail: a scroll-progress bearing in the left gutter. Decorative,
          and only rendered where there is gutter to spare. */}
      <div
        ref={railRef}
        aria-hidden="true"
        className="pointer-events-none fixed bottom-[120px] left-[18px] top-[120px] z-40 hidden w-11 opacity-0 xl:block"
        style={{ transform: "translateX(-24px)", transition: `opacity 450ms ${EXPO}, transform 450ms ${EXPO}` }}
      >
        <div
          className="absolute bottom-0 left-[3px] top-0 w-[10px]"
          style={{
            background: "repeating-linear-gradient(to bottom, #E8DDD5 0 2px, transparent 2px 18px)",
          }}
        />
        {["0", "25%", "50%", "75%", "calc(100% - 2px)"].map((top, i) => (
          <div
            key={top}
            data-rail-tick
            className="absolute left-0 h-[2px] w-4 opacity-0"
            style={{
              top,
              background: "rgba(107, 114, 128, 0.5)",
              transform: "translateX(-12px)",
              transition: `opacity 400ms ${EXPO} ${80 + i * 80}ms, transform 400ms ${EXPO} ${80 + i * 80}ms`,
            }}
          />
        ))}
        <div data-rail-line className="absolute left-[7px] top-0 h-0 w-[2px] bg-primary" />
        <div
          data-rail-dot
          className="absolute left-1 top-0 h-2 w-2 rounded-full bg-primary"
          style={{ boxShadow: "0 0 10px rgba(220, 38, 38, 0.45)", transition: `opacity 300ms ${EXPO}` }}
        />
        <div
          data-rail-chip
          className="absolute left-[22px] top-0 whitespace-nowrap font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-text-muted"
          style={{ writingMode: "vertical-rl" }}
        >
          000&deg; / 01 RESEARCH
        </div>
      </div>

      <section
        ref={sectionRef}
        id="features"
        className="landing-scrolly-section mx-auto box-border w-full max-w-[1320px] scroll-mt-20 px-4 py-10 sm:px-8 lg:px-14"
      >
        <div ref={gridRef} className="landing-scrolly">
          <div className="landing-scrolly-sticky">
            <div className="landing-scrolly-frame">
              {/* Illustrative: the feature copy alongside carries the message. */}
              <div
                ref={stageRef}
                aria-hidden="true"
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: `${STAGE_LANDSCAPE.width} / ${STAGE_LANDSCAPE.height}` }}
              >
                <div
                  ref={canvasRef}
                  className="absolute left-0 top-0 origin-top-left"
                  style={{ width: STAGE_LANDSCAPE.width, height: STAGE_LANDSCAPE.height }}
                >
                  {STAGE_SETS.map((set, setIndex) => (
                    <div
                      key={set.id}
                      data-stage-set
                      data-flow={set.flow ? "1" : undefined}
                      data-portrait-shift={set.flow?.portraitShiftPercent}
                      data-small-portrait-shift={set.flow?.smallPortraitShiftPercent}
                      className={`absolute inset-0 ${setIndex === 0 ? "opacity-100" : "opacity-0"}`}
                      style={{ transition: `opacity 420ms ${EXPO}` }}
                    >
                      {set.cards.map((card, cardIndex) => (
                        <FeatureStageCard
                          key={card.id}
                          card={card}
                          index={cardIndex}
                          initiallyVisible={setIndex === 0 && cardIndex === 0}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile copy. Hidden at >= 1024px, where the pinned column takes over. */}
            <div className="landing-scrolly-swap relative mt-6 overflow-hidden">
              {FEATURE_BLOCKS.map((block) => (
                <div
                  key={block.eyebrow}
                  data-swap-panel
                  className="absolute inset-x-0 top-0 opacity-0"
                  style={{
                    transform: "translateY(14px)",
                    transition: `opacity 500ms ${EXPO}, transform 500ms ${EXPO}`,
                  }}
                >
                  <p className="m-0 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                    {block.eyebrow}
                  </p>
                  <h3 className="mt-3 text-[26px] font-semibold leading-[1.12] tracking-[-0.04em] text-text-primary">
                    {block.title}
                  </h3>
                  <p className="mt-3 text-[16px] leading-[1.55] text-text-secondary">{block.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div ref={textColRef} data-feature-text-col className="min-w-0">
            <div ref={textPinRef} className="relative">
              {FEATURE_BLOCKS.map((block) => (
                <div key={block.eyebrow} data-feature-block className="landing-scrolly-block">
                  <p
                    data-line
                    className="m-0 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-text-muted"
                  >
                    {block.eyebrow}
                  </p>
                  <h3
                    data-line
                    className="font-display mt-5 text-[clamp(1.9rem,2.4vw,2.7rem)] font-semibold leading-[1.1] tracking-[-0.05em] text-text-primary"
                  >
                    {block.title}
                  </h3>
                  <p
                    data-line
                    className="mt-5 max-w-[26em] text-[clamp(1.05rem,1.3vw,1.25rem)] leading-[1.55] text-text-secondary"
                  >
                    {block.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

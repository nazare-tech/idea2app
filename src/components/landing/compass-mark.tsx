"use client"

import { useEffect, useRef } from "react"

import { COMPASS_WEDGE_VIEWBOX, compassWedgePathD } from "@/lib/compass-geometry"

const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)"
const MARK_COLOR = "#DC2626"

/**
 * The brand mark above the bottom CTA: the bearing wedge from the 2026-07-30
 * brand kit (a compass needle rotated 32° off vertical, notched tail). The
 * geometry is shared with the canvas hero dot field via `compass-geometry.ts`.
 *
 * Entrance: the wedge lands with a small overshoot, like a needle settling on
 * a bearing. Renders in its final state without JS and under
 * `prefers-reduced-motion`, so it never depends on the animation running.
 */
export function CompassMark() {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const wedge = wrap.querySelector<SVGPathElement>("[data-compass-wedge]")

    const showFinal = () => {
      if (wedge) {
        wedge.style.opacity = "1"
        wedge.style.transform = "scale(1) rotate(0deg)"
      }
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      showFinal()
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        wedge?.animate(
          [
            { opacity: 0, transform: "scale(0.6) rotate(-14deg)" },
            { opacity: 1, transform: "scale(1.12) rotate(3deg)", offset: 0.65 },
            { opacity: 1, transform: "scale(1) rotate(0deg)" },
          ],
          { duration: 640, delay: 120, easing: EXPO, fill: "forwards" }
        )
      },
      { threshold: 0.6 }
    )
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapRef} aria-hidden="true" className="mb-7 flex justify-center">
      <svg width="46" height="46" viewBox={`0 0 ${COMPASS_WEDGE_VIEWBOX} ${COMPASS_WEDGE_VIEWBOX}`} fill="none">
        <path
          data-compass-wedge
          d={compassWedgePathD()}
          fill={MARK_COLOR}
          style={{
            opacity: 0,
            transform: "scale(0.6) rotate(-14deg)",
            transformBox: "fill-box",
            transformOrigin: "center",
          }}
        />
      </svg>
    </div>
  )
}

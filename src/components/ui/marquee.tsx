"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"

/**
 * Looping marquee (landing tool logos, intake example rows, loader carousel).
 * The children are rendered twice (the second copy is inert and hidden from
 * assistive tech) and a shared `-50%` keyframe scrolls exactly one copy, so
 * the loop is seamless. Children must carry their own trailing spacing (for
 * example `mr-3`) so the seam between copies matches the internal gaps.
 *
 * The container's max-width is clamped to the measured width of ONE copy:
 * the marquee never spans more than a single loop of content, and is
 * centered within its parent. Hovering pauses the drift; with reduced motion
 * the row becomes a plain scrollable strip.
 */
export function Marquee({
  durationSeconds,
  fadeWidthPx = 120,
  children,
}: {
  durationSeconds: number
  fadeWidthPx?: number
  children: ReactNode
}) {
  const halfRef = useRef<HTMLDivElement>(null)
  const [halfWidth, setHalfWidth] = useState<number | null>(null)

  useEffect(() => {
    const el = halfRef.current
    if (!el) return

    const measure = () => setHalfWidth(el.getBoundingClientRect().width)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className="ui-marquee relative mx-auto w-full"
      style={{
        "--marquee-duration": `${durationSeconds}s`,
        "--marquee-fade": `${fadeWidthPx}px`,
        ...(halfWidth ? { maxWidth: `${Math.ceil(halfWidth)}px` } : {}),
      } as CSSProperties}
    >
      <div className="ui-marquee__track">
        <div ref={halfRef} className="flex w-max flex-none">
          {children}
        </div>
        <div className="flex w-max flex-none" aria-hidden="true" inert>
          {children}
        </div>
      </div>
    </div>
  )
}

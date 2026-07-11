"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Looping marquee used by intake Step 1 example rows and the submission loader
 * carousel. The children are rendered twice (the second copy is inert and hidden
 * from assistive tech) and the shared `-50%` keyframe scrolls exactly one copy,
 * so the loop is seamless. The container's max-width is clamped to the measured
 * width of ONE copy: the marquee never spans more than a single loop of content,
 * and is centered within its parent.
 */
export function IntakeMarquee({
  duration,
  children,
}: {
  duration: string
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
      className="intake-marquee relative mx-auto w-full"
      style={halfWidth ? { maxWidth: `${Math.ceil(halfWidth)}px` } : undefined}
    >
      <div
        className="intake-marquee__track"
        style={{ ["--intake-marquee-duration" as string]: duration }}
      >
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

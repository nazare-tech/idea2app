"use client"

// Live product screenshots for the landing feature sections.
//
// Each feature card embeds /landing-preview/[navKey] (the real workspace UI
// rendering exported sample content) in an iframe fixed at WORKSPACE_WIDTH
// CSS pixels. Media queries resolve against the iframe's own viewport, so the
// screenshot is always the desktop layout, even on phones. The iframe is then
// uniformly scaled so a VIEW_WIDTH x VIEW_HEIGHT (4:3) region fills the frame;
// everything to the right/below that region is cropped by the frame.

import { useCallback, useLayoutEffect, useRef, useState } from "react"

/** CSS width the iframe is laid out at (desktop viewport for media queries) */
const WORKSPACE_WIDTH = 1280
/** Visible crop region width: 60% of the workspace width (768x576 at 4:3) */
const VIEW_WIDTH = 768

interface FeatureProductPreviewProps {
  /** Which workspace nav item to preview, e.g. "market-research" */
  navKey: string
  /** Subsection rendered in its active (dark highlight) state */
  activeSectionId: string
  /** Anchor id inside the document to crop to; defaults to activeSectionId */
  cropToId?: string
}

export function FeatureProductPreview({ navKey, activeSectionId, cropToId }: FeatureProductPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number | null>(null)

  const measure = useCallback(() => {
    const frame = frameRef.current
    if (frame) setScale(frame.clientWidth / VIEW_WIDTH)
  }, [])

  useLayoutEffect(() => {
    // Measure-then-position: the scale factor depends on the frame's laid-out
    // width, so the first synchronous measure before paint is intentional.
    measure()
    const observer = new ResizeObserver(measure)
    if (frameRef.current) observer.observe(frameRef.current)
    return () => observer.disconnect()
  }, [measure])

  const src = `/landing-preview/${encodeURIComponent(navKey)}?active=${encodeURIComponent(activeSectionId)}${
    cropToId ? `&crop=${encodeURIComponent(cropToId)}` : ""
  }`

  return (
    // aria-hidden + pointer-events-none: a decorative screenshot, not a widget
    <div
      aria-hidden="true"
      className="pointer-events-none flex h-full w-full select-none items-center justify-center bg-[#F5F0EB] p-5 sm:p-6"
    >
      {/* Fixed 4:3 frame; the scaled iframe fills it and overflow is cropped.
          overflow-clip (not hidden) so the box can never be scrolled by
          find-in-page, scroll anchoring, or scrollIntoView. */}
      <div
        ref={frameRef}
        className="relative aspect-[4/3] w-full overflow-clip border border-[#E2DDD6] bg-background shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
      >
        {/* Transform lives on a plain wrapper div (not the iframe itself, which
            some engines position unreliably under transforms). Absolutely
            positioned so the fixed desktop width never contributes intrinsic
            width to the page layout; only the frame defines size. */}
        <div
          className="absolute left-0 top-0"
          style={{
            width: WORKSPACE_WIDTH,
            height: (WORKSPACE_WIDTH * 3) / 4,
            transform: `scale(${scale ?? 0})`,
            transformOrigin: "top left",
            visibility: scale === null ? "hidden" : "visible",
          }}
        >
          <iframe src={src} title="" tabIndex={-1} loading="lazy" className="h-full w-full border-0" />
        </div>
        {/* Soft bottom fade so the crop edge reads as intentional */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FAFAFA] to-transparent" />
      </div>
    </div>
  )
}

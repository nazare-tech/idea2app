"use client"

// Development-only live product screenshots for iterating on the landing
// feature sections. Production uses static captures to avoid booting five
// separate Next.js iframe documents on the marketing page.

import { useCallback, useLayoutEffect, useRef, useState } from "react"

/** CSS width the iframe is laid out at (desktop viewport for media queries) */
const WORKSPACE_WIDTH = 1280
/** Visible crop region width: 60% of the workspace width (768x576 at 4:3) */
const VIEW_WIDTH = 768

interface FeatureProductPreviewLiveProps {
  navKey: string
  activeSectionId: string
  cropToId?: string
}

export function FeatureProductPreviewLive({ navKey, activeSectionId, cropToId }: FeatureProductPreviewLiveProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number | null>(null)

  const measure = useCallback(() => {
    const frame = frameRef.current
    if (frame) setScale(frame.clientWidth / VIEW_WIDTH)
  }, [])

  useLayoutEffect(() => {
    measure()
    const observer = new ResizeObserver(measure)
    if (frameRef.current) observer.observe(frameRef.current)
    return () => observer.disconnect()
  }, [measure])

  const src = `/landing-preview/${encodeURIComponent(navKey)}?active=${encodeURIComponent(activeSectionId)}${
    cropToId ? `&crop=${encodeURIComponent(cropToId)}` : ""
  }`

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex h-full w-full select-none items-center justify-center bg-[#F5F0EB] p-5 sm:p-6"
    >
      <div
        ref={frameRef}
        className="relative aspect-[4/3] w-full overflow-clip border border-[#E2DDD6] bg-background shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
      >
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
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FAFAFA] to-transparent" />
      </div>
    </div>
  )
}

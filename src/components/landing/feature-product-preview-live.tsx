"use client"

// Development-only live product screenshots for iterating on the landing
// feature sections. Production uses static captures to avoid booting five
// separate Next.js iframe documents on the marketing page.

import { useCallback, useLayoutEffect, useRef, useState } from "react"

import { PreviewFrame } from "@/components/landing/preview-frame"

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
    <PreviewFrame frameRef={frameRef}>
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
    </PreviewFrame>
  )
}

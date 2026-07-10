"use client"

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"

interface WorkspaceDocumentFrameProps {
  children: ReactNode
  navKey?: string
  performanceContain?: boolean
  intrinsicSize?: string
}

export function WorkspaceDocumentFrame({
  children,
  navKey,
  performanceContain = false,
  intrinsicSize = "auto 2400px",
}: WorkspaceDocumentFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  // Static intrinsic-size estimates are far smaller than a rendered document,
  // so re-containing a frame (or first rendering it near the viewport) used to
  // change the layout height above the viewport by thousands of pixels and
  // throw the scroll position into a different document. Two guards fix that:
  // 1. `measuredHeight`: a ResizeObserver keeps the frame's latest real
  //    content height, which replaces the static estimate as the containment
  //    placeholder once known.
  // 2. `applyContain`: re-applying containment lags one commit behind
  //    `performanceContain` so the height above is measured from real layout
  //    first. Removing containment stays synchronous because the scroll-sync
  //    layout effect measures the newly active document in the same commit.
  const [applyContain, setApplyContain] = useState(performanceContain)
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null)

  useEffect(() => {
    const element = frameRef.current
    if (!element || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver((entries) => {
      // content-box height, matching what contain-intrinsic-size describes.
      const height = entries[0]?.contentRect.height
      if (!height || height <= 0) return
      setMeasuredHeight((current) => {
        const next = Math.round(height)
        return current !== null && Math.abs(current - next) <= 1 ? current : next
      })
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    setApplyContain(performanceContain)
  }, [performanceContain])

  const containmentStyle: CSSProperties | undefined = performanceContain && applyContain
    ? {
        contentVisibility: "auto",
        containIntrinsicSize: measuredHeight ? `auto ${measuredHeight}px` : intrinsicSize,
      }
    : undefined

  return (
    <div
      ref={frameRef}
      id={navKey}
      className="mx-auto w-full max-w-[1020px] rounded-lg bg-card px-5 py-6 sm:px-8 sm:py-7 lg:px-10 lg:py-8"
      data-section={navKey}
      style={containmentStyle}
    >
      {children}
    </div>
  )
}

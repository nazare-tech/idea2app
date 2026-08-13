"use client"

import { useCallback, useRef, useState } from "react"
import { ImageIcon, Loader2 } from "lucide-react"
import type { DashboardMockupPreview } from "@/lib/mockups/dashboard-thumbnail"

const SWIPE_DISTANCE_PX = 48
const SWIPE_DIRECTION_RATIO = 1.2

interface ProjectCardThumbnailProps {
  previews: DashboardMockupPreview[]
  activeIndex?: number
  unavailable?: boolean
  onSwipe?: (direction: -1 | 1) => void
}

export function ProjectCardThumbnail({
  previews,
  activeIndex = 0,
  unavailable = false,
  onSwipe,
}: ProjectCardThumbnailProps) {
  const activePreview = previews[activeIndex] ?? previews[0] ?? null
  const previewSignature = JSON.stringify(previews)
  const [failureState, setFailureState] = useState<{
    signature: string
    urls: Set<string>
  }>(() => ({ signature: previewSignature, urls: new Set() }))
  const [loadedState, setLoadedState] = useState<{
    signature: string
    keys: Set<string>
  }>(() => ({ signature: previewSignature, keys: new Set() }))
  const failedUrls = failureState.signature === previewSignature
    ? failureState.urls
    : new Set<string>()
  const loadedKeys = loadedState.signature === previewSignature
    ? loadedState.keys
    : new Set<string>()
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const activePreviewKey = activePreview
    ? `${activePreview.label}:${activePreview.url}`
    : null
  const activeImageFailed = activePreviewKey ? failedUrls.has(activePreviewKey) : false
  const activeImageLoaded = activePreviewKey ? loadedKeys.has(activePreviewKey) : false
  const activeImageLoading = Boolean(activePreviewKey && !activeImageFailed && !activeImageLoaded)
  const state = activePreview && !activeImageFailed
    ? activeImageLoading
      ? "loading"
      : "ready"
    : unavailable
      ? "unavailable"
      : "empty"

  const markPreviewLoaded = useCallback((previewKey: string) => {
    setLoadedState((current) => {
      if (current.signature === previewSignature && current.keys.has(previewKey)) {
        return current
      }

      const keys = current.signature === previewSignature
        ? new Set(current.keys)
        : new Set<string>()
      keys.add(previewKey)
      return { signature: previewSignature, keys }
    })
  }, [previewSignature])

  const markPreviewFailed = useCallback((previewKey: string) => {
    setFailureState((current) => {
      if (current.signature === previewSignature && current.urls.has(previewKey)) {
        return current
      }

      const urls = current.signature === previewSignature
        ? new Set(current.urls)
        : new Set<string>()
      urls.add(previewKey)
      return { signature: previewSignature, urls }
    })
  }, [previewSignature])

  return (
    <div
      data-thumbnail-state={state}
      data-thumbnail-active-label={activePreview?.label}
      data-thumbnail-index={activePreview ? activeIndex : undefined}
      data-thumbnail-count={previews.length}
      className="relative h-[378px] shrink-0 touch-pan-y overflow-hidden rounded-[24px] border border-[#dbdbdb] bg-white p-5"
      onTouchStart={(event) => {
        const touch = event.touches[0]
        if (!touch) return
        touchStartRef.current = { x: touch.clientX, y: touch.clientY }
      }}
      onTouchCancel={() => {
        touchStartRef.current = null
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current
        const touch = event.changedTouches[0]
        touchStartRef.current = null
        if (!start || !touch) return

        const deltaX = touch.clientX - start.x
        const deltaY = touch.clientY - start.y
        if (
          Math.abs(deltaX) < SWIPE_DISTANCE_PX ||
          Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_DIRECTION_RATIO
        ) {
          return
        }

        onSwipe?.(deltaX < 0 ? 1 : -1)
      }}
    >
      <div
        data-thumbnail-canvas="true"
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
      >
        {previews.map((preview, index) => {
          const previewKey = `${preview.label}:${preview.url}`
          if (failedUrls.has(previewKey)) return null

          const isActive = index === activeIndex
          return (
            // Native images keep authenticated proxy requests in the browser session.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={previewKey}
              ref={(element) => {
                if (!element?.complete) return

                if (element.naturalWidth > 0) {
                  markPreviewLoaded(previewKey)
                } else {
                  markPreviewFailed(previewKey)
                }
              }}
              src={preview.url}
              alt=""
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className={`absolute inset-0 h-full w-full object-contain ${isActive ? "block" : "hidden"}`}
              onLoad={() => markPreviewLoaded(previewKey)}
              onError={() => markPreviewFailed(previewKey)}
            />
          )
        })}

        {activeImageLoading && activePreview && (
          <div
            data-testid="dashboard-project-thumbnail-loading"
            role="status"
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/85"
          >
            <Loader2
              aria-hidden="true"
              className="h-8 w-8 animate-spin text-text-primary motion-reduce:animate-none"
            />
            <span className="sr-only">Loading mockup option {activePreview.label}</span>
          </div>
        )}

        {(!activePreview || activeImageFailed) && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-text-secondary">
            <ImageIcon aria-hidden="true" className="h-5 w-5 opacity-60" />
            <p className="text-xs font-medium">
              {unavailable ? "Preview unavailable" : "No mockup preview"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

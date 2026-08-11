"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"

export function ProjectCardThumbnail({
  thumbnailUrl,
  unavailable = false,
}: {
  thumbnailUrl: string | null
  unavailable?: boolean
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const imageUrl = thumbnailUrl !== failedUrl ? thumbnailUrl : null
  const state = imageUrl ? "ready" : unavailable ? "unavailable" : "empty"

  return (
    <div
      data-thumbnail-state={state}
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[24px] bg-card p-5"
    >
      <div
        data-thumbnail-canvas="true"
        className="flex h-full max-h-[300px] w-full items-center justify-center overflow-hidden"
      >
        {imageUrl ? (
          // Native image keeps the authenticated proxy request in the user's browser session.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="h-full w-full object-contain"
            onError={() => setFailedUrl(imageUrl)}
          />
        ) : (
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

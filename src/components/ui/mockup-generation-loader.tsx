"use client"

import { ImageGeneration } from "img-fx"

import { cn } from "@/lib/utils"

interface MockupGenerationLoaderProps {
  className?: string
  images?: string[]
}

export function MockupGenerationLoader({ className, images = [] }: MockupGenerationLoaderProps) {
  const realImages = images.map((image) => image.trim()).filter((image) => image.length > 0)

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border-subtle bg-[#f4f4f4] p-3",
        className,
      )}
      data-testid="mockup-generation-loader"
      data-preview-image-count={realImages.length}
      data-effect-image-count="0"
      data-loader-image-source="effect-only"
      data-auto-reveal="false"
      aria-hidden="true"
    >
      <ImageGeneration
        preset="pixels-organic"
        theme="light"
        cardBg="#f4f4f4"
        strength={0.85}
        images={[]}
        borderRadius={8}
        className="w-full"
      >
        <MockupEffectSurface />
      </ImageGeneration>
    </div>
  )
}

function MockupEffectSurface() {
  return <div className="min-h-[260px] rounded-md bg-[#eeeeef] sm:min-h-[340px]" />
}

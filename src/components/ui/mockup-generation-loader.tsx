"use client"

import { ImageGeneration } from "img-fx"
import { ImageIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const MOCKUP_PREVIEW_IMAGES = [
  "/landing/hero/215-106_image-22.png",
  "/landing/hero/215-112_image-23.png",
  "/landing/hero/215-100_image-23.png",
  "/landing/hero/215-109_image-27.png",
]

interface MockupGenerationLoaderProps {
  className?: string
}

export function MockupGenerationLoader({ className }: MockupGenerationLoaderProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border-subtle bg-[#f4f4f4] p-3",
        className,
      )}
      aria-hidden="true"
    >
      <ImageGeneration
        preset="pixels-organic"
        theme="light"
        cardBg="#f4f4f4"
        strength={0.85}
        images={MOCKUP_PREVIEW_IMAGES}
        autoReveal
        revealDelayRange={[1.4, 2.4]}
        revealHoldMs={[700, 1100]}
        revealFadeOutMs={420}
        borderRadius={8}
        className="w-full"
      >
        <div className="relative grid min-h-[260px] overflow-hidden rounded-md bg-[#eeeeef] p-4 sm:min-h-[340px]">
          <div className="grid h-full grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_minmax(0,0.9fr)] gap-3">
            <MockupWireframePanel variant="compact" />
            <MockupWireframePanel variant="primary" />
            <MockupWireframePanel variant="compact" />
          </div>
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between rounded-md border border-black/10 bg-white/80 px-3 py-2 text-[0.6875rem] font-medium text-zinc-500 shadow-sm">
            <span className="flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5" />
              Rendering options
            </span>
            <span>OpenRouter image storyboard</span>
          </div>
        </div>
      </ImageGeneration>
    </div>
  )
}

function MockupWireframePanel({ variant }: { variant: "primary" | "compact" }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-md border border-black/10 bg-white/75 p-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-3/5 rounded bg-zinc-300" />
        <div className="h-2 w-4/5 rounded bg-zinc-200" />
      </div>
      <div className="grid flex-1 gap-2">
        <div className={cn("rounded bg-zinc-200", variant === "primary" ? "min-h-20" : "min-h-14")} />
        <div className="grid grid-cols-2 gap-2">
          <div className="min-h-12 rounded bg-zinc-100" />
          <div className="min-h-12 rounded bg-zinc-100" />
        </div>
        {variant === "primary" && (
          <div className="grid grid-cols-3 gap-2">
            <div className="h-12 rounded bg-zinc-100" />
            <div className="h-12 rounded bg-zinc-100" />
            <div className="h-12 rounded bg-zinc-100" />
          </div>
        )}
      </div>
    </div>
  )
}

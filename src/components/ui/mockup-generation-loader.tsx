"use client"

import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react"
import { ImageGeneration } from "img-fx"

import { cn } from "@/lib/utils"

interface MockupGenerationLoaderProps {
  className?: string
  images?: string[]
}

export function canCreateWebGLContext(canvas: HTMLCanvasElement): boolean {
  try {
    const contextOptions = { failIfMajorPerformanceCaveat: true }
    return Boolean(
      canvas.getContext("webgl2", contextOptions) ??
        canvas.getContext("webgl", contextOptions) ??
        canvas.getContext("experimental-webgl", contextOptions),
    )
  } catch {
    return false
  }
}

export function MockupGenerationLoader({ className, images = [] }: MockupGenerationLoaderProps) {
  const realImages = images.map((image) => image.trim()).filter((image) => image.length > 0)
  const supportsWebGL = useWebGLSupport()

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
      data-webgl-loader={supportsWebGL ? "enabled" : "fallback"}
      aria-hidden="true"
    >
      {supportsWebGL ? (
        <ImageGenerationFallback>
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
        </ImageGenerationFallback>
      ) : (
        <MockupEffectSurface />
      )}
    </div>
  )
}

function useWebGLSupport() {
  const [supportsWebGL, setSupportsWebGL] = useState(false)

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const canvas = document.createElement("canvas")
      setSupportsWebGL(canCreateWebGLContext(canvas))
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  return supportsWebGL
}

class ImageGenerationFallback extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("MockupGenerationLoader: falling back after WebGL loader failed.", error, errorInfo)
  }

  render() {
    if (this.state.hasError) return <MockupEffectSurface />

    return this.props.children
  }
}

function MockupEffectSurface() {
  return <div className="min-h-[260px] rounded-md bg-[#eeeeef] sm:min-h-[340px]" />
}

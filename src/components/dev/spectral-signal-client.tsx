"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import {
  createSpectralSignalRenderer,
  type SpectralSignalRenderer,
} from "@/lib/spectral-signal-renderer"

const REFERENCE_IMAGE = "/experiments/spectral-signal/reference.png"
const CAPTURE_SEEK_EVENT = "spectral-signal:seek"

type RendererMode = "fallback" | "webgl"

interface SpectralSignalClientProps {
  captureMode?: boolean
  captureSeconds?: number
}

interface CaptureSeekDetail {
  seconds?: number
}

export function SpectralSignalClient({
  captureMode = false,
  captureSeconds = 0,
}: SpectralSignalClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const [rendererMode, setRendererMode] = useState<RendererMode>("fallback")
  const visibleMode = reducedMotion ? "fallback" : rendererMode
  const animationState = visibleMode === "webgl" && !captureMode ? "running" : "stopped"

  useEffect(() => {
    if (reducedMotion) return

    const canvasNode = canvasRef.current
    const stageNode = stageRef.current
    if (!canvasNode || !stageNode) return

    const canvas: HTMLCanvasElement = canvasNode
    const stage: HTMLDivElement = stageNode

    let disposed = false
    let contextLost = false
    let frameId: number | null = null
    let elapsedSeconds = 0
    let startedAt = 0
    let renderer: SpectralSignalRenderer | null = null
    let resizeObserver: ResizeObserver | null = null
    let renderAt: ((seconds: number) => void) | null = null

    const stopFrame = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
        frameId = null
      }
    }

    const disposeGraphics = () => {
      resizeObserver?.disconnect()
      resizeObserver = null
      renderer?.dispose()
      renderer = null
      renderAt = null
    }

    const markFallback = () => {
      if (!disposed) setRendererMode("fallback")
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      contextLost = true
      stopFrame()
      disposeGraphics()
      markFallback()
    }

    const handleCaptureSeek = (event: Event) => {
      const seconds = (event as CustomEvent<CaptureSeekDetail>).detail?.seconds
      if (!captureMode || !Number.isFinite(seconds) || seconds === undefined) return
      renderAt?.(seconds)
    }

    canvas.addEventListener("webglcontextlost", handleContextLost)
    canvas.addEventListener(CAPTURE_SEEK_EVENT, handleCaptureSeek)

    async function startRenderer() {
      try {
        const contextOptions: WebGLContextAttributes = {
          alpha: false,
          antialias: true,
          failIfMajorPerformanceCaveat: true,
          powerPreference: "high-performance",
        }
        const context = canvas.getContext("webgl2", contextOptions)

        if (!context || !context.getExtension("EXT_color_buffer_float")) return

        const nextRenderer = await createSpectralSignalRenderer(canvas, context)
        if (disposed || contextLost) {
          nextRenderer.dispose()
          return
        }
        renderer = nextRenderer

        const resize = () => {
          if (!renderer) return
          const { width, height } = stage.getBoundingClientRect()
          renderer.resize(
            captureMode ? 680 : Math.max(1, width),
            captureMode ? 711 : Math.max(1, height),
            captureMode ? 1 : Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.5),
          )
        }
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(stage)
        resize()

        let firstFrame = true
        renderAt = (seconds: number) => {
          if (disposed || !renderer) return
          elapsedSeconds = seconds
          renderer.renderAt(seconds)
          canvas.dataset.renderedTime = seconds.toFixed(4)
          if (captureMode) canvas.dataset.framePng = canvas.toDataURL("image/png")
          if (firstFrame) {
            firstFrame = false
            setRendererMode("webgl")
          }
        }

        if (captureMode) {
          renderAt(captureSeconds)
          return
        }

        startedAt = performance.now()
        const renderFrame = (now: number) => {
          if (disposed || document.hidden || !renderAt) return
          renderAt((now - startedAt) / 1000)
          frameId = window.requestAnimationFrame(renderFrame)
        }

        const handleVisibilityChange = () => {
          stopFrame()
          if (!document.hidden && !disposed) {
            startedAt = performance.now() - elapsedSeconds * 1000
            frameId = window.requestAnimationFrame(renderFrame)
          }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        frameId = window.requestAnimationFrame(renderFrame)
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
      } catch (error) {
        stopFrame()
        disposeGraphics()
        markFallback()
        console.warn("SpectralSignal: WebGL unavailable; using static Figma fallback.", error)
      }
    }

    let removeVisibilityListener: (() => void) | undefined
    void startRenderer().then((removeListener) => {
      if (disposed) {
        removeListener?.()
        return
      }
      removeVisibilityListener = removeListener
    })

    return () => {
      setRendererMode("fallback")
      disposed = true
      stopFrame()
      removeVisibilityListener?.()
      canvas.removeEventListener("webglcontextlost", handleContextLost)
      canvas.removeEventListener(CAPTURE_SEEK_EVENT, handleCaptureSeek)
      disposeGraphics()
      delete canvas.dataset.renderedTime
      delete canvas.dataset.framePng
    }
  }, [captureMode, captureSeconds, reducedMotion])

  return (
    <main
      className="grid min-h-dvh place-items-center overflow-hidden bg-[#3b3b3b]"
      data-testid="spectral-signal"
      data-renderer={visibleMode}
      data-animation-state={animationState}
      data-capture-mode={captureMode}
    >
      <div
        ref={stageRef}
        className="relative aspect-[680/711] overflow-hidden bg-[#3b3b3b]"
        style={{ width: "min(100vw, 95.64dvh, 680px)" }}
      >
        <Image
          src={REFERENCE_IMAGE}
          alt=""
          aria-hidden="true"
          width={680}
          height={711}
          priority
          unoptimized
          className={`absolute inset-0 size-full ${captureMode ? "" : "transition-opacity duration-300"} ${
            visibleMode === "webgl" ? "opacity-0" : "opacity-100"
          }`}
        />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          data-testid="spectral-signal-canvas"
          className={`absolute inset-0 size-full ${captureMode ? "" : "transition-opacity duration-300"} ${
            visibleMode === "webgl" ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </main>
  )
}

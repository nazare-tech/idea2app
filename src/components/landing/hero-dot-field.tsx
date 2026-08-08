"use client"

import { useEffect, useRef } from "react"

import {
  buildField,
  computeShouldAnimate,
  dampAngle,
  magneticLineAngle,
  protectedZoneAlpha,
  smoothstep,
  type DotField,
  type ProtectedRect,
} from "./hero-dot-field-core"

// Layout constants. Pitch matches the reference video's dot spacing.
const PITCH = 26
// Default seed chosen by scanning 6000 candidates for left/right cluster
// balance across hero widths 1024-1680 (worst-case halves within 3%).
const DEFAULT_SEED = 633
// The experiment keeps the former 2.4px dot diameter as line width and makes
// each line five diameters tall.
const DOT_DIAMETER = 2.4
const LINE_WIDTH = DOT_DIAMETER
const LINE_LENGTH = DOT_DIAMETER * 5
const LINE_ALPHA = 0.3
// Cursor interaction.
const MAGNETIC_RADIUS = 168
const MAGNETIC_RING_RADII = [52, 104, 156]
const LINE_TURN_RATE = 7 // exponential rate per second
// Ink: tinted neutral matching the landing text ramp.
const INK = "23, 23, 28"
// Wedges rest pointing north (up) when no cursor has been seen.
const NORTH = -Math.PI / 2

/**
 * Ambient section background: a deterministic short-line lattice in map-like
 * clusters. Cursor-centered magnetic rings rotate nearby lines tangentially.
 * Each field is absolutely
 * positioned inside its owning section, so native document or sticky layout
 * movement carries the artwork without a second scroll loop. Decorative only:
 * `aria-hidden`, no pointer events, renders nothing without JS, static under
 * reduced motion.
 *
 * Protected zones come from descendants marked `data-dot-field-protect`,
 * measured in the owning section's coordinates after resize.
 */
export function HeroDotField({ seed = DEFAULT_SEED }: { seed?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const section = canvas?.parentElement
    if (!canvas || !section) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    // --- Mutable animation state (refs only, never React state) ---
    let field: DotField = { dots: [], cols: 0, rows: 0, pitch: PITCH }
    let lineAngles: number[] = []
    let protectRects: ProtectedRect[] = []
    let width = 0
    let height = 0
    // `hasCursor` flips on the first mouse/pen event, so hybrid touch devices
    // with a trackpad still get the interactive variant. Rings stay directly
    // under the pointer; only line rotation is damped.
    let hasCursor = false
    let cursorX = 0
    let cursorY = 0

    let isIntersecting = false
    let rafId = 0
    let lastTime = 0

    const shouldAnimate = () =>
      computeShouldAnimate(isIntersecting, document.hidden, reducedMotionQuery.matches)

    const measureProtectedZones = () => {
      const sectionRect = section.getBoundingClientRect()
      protectRects = Array.from(section.querySelectorAll("[data-dot-field-protect]")).map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          left: rect.left - sectionRect.left,
          top: rect.top - sectionRect.top,
          right: rect.right - sectionRect.left,
          bottom: rect.bottom - sectionRect.top,
        }
      })
    }

    const rebuild = () => {
      const sectionRect = section.getBoundingClientRect()
      width = sectionRect.width
      height = sectionRect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      // A canvas is a replaced element: `inset-0` alone won't stretch it, it
      // renders at its intrinsic (backing-store) size. Pin the CSS size.
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      field = buildField({
        width,
        height,
        pitch: PITCH,
        seed,
      })
      lineAngles = field.dots.map(() => NORTH)
      measureProtectedZones()
    }

    const baseAlpha = (x: number, y: number) => {
      let a = 1
      for (const rect of protectRects) {
        if (a <= 0.01) break
        a *= protectedZoneAlpha(x, y, rect)
      }
      return a
    }

    const lineTargetAngle = (dot: DotField["dots"][number]) => {
      if (!hasCursor) return NORTH
      const strength = smoothstep(MAGNETIC_RADIUS, 0, Math.hypot(dot.x - cursorX, dot.y - cursorY))
      return magneticLineAngle(dot.x, dot.y, cursorX, cursorY, strength, NORTH)
    }

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, width, height)

      // Short lines brighten, lengthen, and align tangentially near the rings.
      for (const [index, dot] of field.dots.entries()) {
        const zone = baseAlpha(dot.x, dot.y)
        if (zone <= 0.01) continue
        let lift = 0
        if (hasCursor) {
          const dist = Math.hypot(dot.x - cursorX, dot.y - cursorY)
          lift = smoothstep(MAGNETIC_RADIUS, 0, dist)
        }
        lineAngles[index] = dampAngle(lineAngles[index], lineTargetAngle(dot), LINE_TURN_RATE, dt)
        const scale = 1 + 0.4 * lift
        ctx.globalAlpha = zone * (LINE_ALPHA + 0.35 * lift)
        ctx.fillStyle = `rgb(${INK})`
        ctx.save()
        ctx.translate(dot.x, dot.y)
        ctx.rotate(lineAngles[index])
        ctx.fillRect((-LINE_LENGTH * scale) / 2, (-LINE_WIDTH * scale) / 2, LINE_LENGTH * scale, LINE_WIDTH * scale)
        ctx.restore()
      }

      if (hasCursor) {
        ctx.strokeStyle = `rgb(${INK})`
        ctx.lineWidth = 1
        MAGNETIC_RING_RADII.forEach((radius, index) => {
          ctx.globalAlpha = 0.16 - index * 0.035
          ctx.beginPath()
          ctx.arc(cursorX, cursorY, radius, 0, Math.PI * 2)
          ctx.stroke()
        })
      }

      ctx.globalAlpha = 1
    }

    const angleDelta = (current: number, target: number) => {
      const tau = Math.PI * 2
      let delta = (target - current) % tau
      if (delta > Math.PI) delta -= tau
      if (delta < -Math.PI) delta += tau
      return Math.abs(delta)
    }

    const isSettled = () => {
      return field.dots.every((dot, index) =>
        angleDelta(lineAngles[index], lineTargetAngle(dot)) < 0.002
      )
    }

    const frame = (time: number) => {
      if (!shouldAnimate()) {
        rafId = 0
        return
      }
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 1 / 60
      lastTime = time
      draw(dt)
      if (isSettled()) {
        rafId = 0
        return
      }
      rafId = requestAnimationFrame(frame)
    }

    const startLoop = () => {
      if (!shouldAnimate()) {
        draw(0)
        return
      }
      if (!rafId) {
        lastTime = 0
        rafId = requestAnimationFrame(frame)
      }
    }

    // Single lifecycle gate: any observer flip funnels through here.
    const syncLoop = () => {
      if (!shouldAnimate() && rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      if (shouldAnimate() && !isSettled()) startLoop()
      else if (!rafId) draw(0)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!isIntersecting) return
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return
      if (reducedMotionQuery.matches) return
      const rect = section.getBoundingClientRect()
      const isInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      if (!isInside) {
        onPointerLeave()
        return
      }
      cursorX = event.clientX - rect.left
      cursorY = event.clientY - rect.top
      if (!hasCursor) {
        hasCursor = true
      }
      startLoop()
    }
    const onPointerLeave = () => {
      if (!hasCursor) return
      hasCursor = false
      startLoop()
    }
    const onReducedMotionChange = () => {
      if (reducedMotionQuery.matches) {
        hasCursor = false
        lineAngles.fill(NORTH)
      }
      syncLoop()
    }
    rebuild()
    draw(0)
    // Hero entrance animations translate protected copy on mount, so its first
    // measurement can catch the CTA mid-rise. Other sections do not need this.
    const settleTimer = section.querySelector("[data-dot-field-protect]")
      ? setTimeout(() => {
          rebuild()
          if (hasCursor) startLoop()
          else if (!rafId) draw(0)
        }, 1500)
      : undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry?.isIntersecting ?? false
        if (!isIntersecting) hasCursor = false
        syncLoop()
      },
      { threshold: 0 }
    )
    observer.observe(section)

    let resizeTimer: ReturnType<typeof setTimeout> | undefined
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        rebuild()
        if (hasCursor) startLoop()
        else if (!rafId) draw(0)
      }, 150)
    })
    resizeObserver.observe(section)

    document.addEventListener("visibilitychange", syncLoop)
    reducedMotionQuery.addEventListener("change", onReducedMotionChange)
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onPointerLeave, { passive: true })
    window.addEventListener("blur", onPointerLeave)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      clearTimeout(resizeTimer)
      clearTimeout(settleTimer)
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener("visibilitychange", syncLoop)
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange)
      window.removeEventListener("pointermove", onPointerMove)
      document.documentElement.removeEventListener("pointerleave", onPointerLeave)
      window.removeEventListener("blur", onPointerLeave)
    }
  }, [seed])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-hero-dot-field
      className="pointer-events-none absolute inset-0 z-0"
    />
  )
}

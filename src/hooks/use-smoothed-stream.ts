"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Smooths a chunky text stream (for example 2s poll deltas) into a continuous
 * word-by-word reveal. `target` may grow over time; the returned text catches
 * up word by word, speeding up when the backlog grows so it never falls far
 * behind. With reduced motion, the target is shown immediately.
 *
 * If `target` is replaced with unrelated shorter text (a replay), the reveal
 * restarts on the next tick; feed it an empty string first for a clean reset.
 */
export function useSmoothedStream(
  target: string,
  { enabled = true, tickMs = 50 }: { enabled?: boolean; tickMs?: number } = {}
) {
  const [visibleLength, setVisibleLength] = useState(0)
  const targetRef = useRef("")

  useEffect(() => {
    targetRef.current = target
  }, [target])

  useEffect(() => {
    if (!enabled) return

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const interval = window.setInterval(() => {
      setVisibleLength((current) => {
        const full = targetRef.current

        // Target shrank: it was replaced, not extended. Restart the reveal.
        if (current > full.length) return 0
        if (current === full.length) return current
        if (prefersReducedMotion) return full.length

        // Scale words-per-tick with backlog so a big poll delta drains
        // quickly without ever teleporting to the end.
        const backlog = full.length - current
        const words = Math.min(12, Math.max(1, Math.round(backlog / 220)))

        let next = current
        for (let step = 0; step < words; step += 1) {
          const boundary = full.indexOf(" ", next + 1)
          next = boundary === -1 ? full.length : boundary
          if (next >= full.length) break
        }
        return Math.min(next, full.length)
      })
    }, tickMs)

    return () => window.clearInterval(interval)
  }, [enabled, tickMs])

  const clampedLength = Math.min(visibleLength, target.length)

  return {
    text: target.slice(0, clampedLength),
    isCatchingUp: clampedLength < target.length,
  }
}

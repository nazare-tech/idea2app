"use client"

import { useEffect, useRef, useState } from "react"

// Reveal pacing. The tick runs every ~50ms, so words-per-tick maps to
// words-per-second at 20x: 2 -> ~40wps baseline (energetic but readable),
// 5 -> ~100wps hard cap so a large poll backlog drains visibly instead of
// teleporting in. The ramp divisor keeps the baseline until roughly two
// polls' worth of text is queued.
const BASE_WORDS_PER_TICK = 2
const MAX_WORDS_PER_TICK = 5
const BACKLOG_RAMP_CHARS_PER_WORD = 750

/**
 * Pure per-tick advance: returns the next visible length for a reveal that
 * is `current` characters into `full`. Steps forward along word boundaries
 * at a bounded reading-speed rate; restarts when the target shrank
 * (replaced, not extended).
 */
export function advanceSmoothedReveal(current: number, full: string): number {
  if (current > full.length) return 0
  if (current === full.length) return current

  const backlog = full.length - current
  const words = Math.min(
    MAX_WORDS_PER_TICK,
    Math.max(BASE_WORDS_PER_TICK, Math.floor(backlog / BACKLOG_RAMP_CHARS_PER_WORD))
  )

  let next = current
  for (let step = 0; step < words; step += 1) {
    const boundary = full.indexOf(" ", next + 1)
    next = boundary === -1 ? full.length : boundary
    if (next >= full.length) break
  }
  return Math.min(next, full.length)
}

/**
 * Smooths a chunky text stream (for example 2s poll deltas) into a continuous
 * word-by-word reveal. `target` may grow over time; the returned text catches
 * up word by word at a bounded reading-speed rate, so the display may lag the
 * freshest poll content rather than teleporting through it. With reduced
 * motion, the target is shown immediately.
 *
 * `resetKey` identifies what is being revealed (for example the active
 * section heading). When it changes, the reveal restarts from the top even if
 * the new target is longer than the old visible length. Without it, a target
 * replaced by unrelated shorter text still restarts on the next tick.
 */
export function useSmoothedStream(
  target: string,
  {
    enabled = true,
    tickMs = 50,
    resetKey = null,
  }: { enabled?: boolean; tickMs?: number; resetKey?: string | number | null } = {}
) {
  const [visibleLength, setVisibleLength] = useState(0)
  const [trackedKey, setTrackedKey] = useState(resetKey)
  const targetRef = useRef("")

  // Render-phase derived-state reset: the frame that swaps in a new section
  // never shows the previous section's carried-over offset.
  if (resetKey !== trackedKey) {
    setTrackedKey(resetKey)
    setVisibleLength(0)
  }

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
        if (prefersReducedMotion) return full.length
        return advanceSmoothedReveal(current, full)
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

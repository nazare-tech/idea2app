// src/components/workspace/use-hide-on-scroll-chrome.ts
// Google-Docs-style mobile chrome behavior: scrolling down hides the slim
// header and bottom peek bar, the first scroll up brings them back, and they
// always stay visible near the top of the document.
"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

const SHOW_NEAR_TOP_PX = 60
const DELTA_THRESHOLD_PX = 5

export function useHideOnScrollChrome(
  scrollRef: RefObject<HTMLElement | null>,
  { disabled = false }: { disabled?: boolean } = {},
) {
  const [hidden, setHidden] = useState(false)
  const lastTopRef = useRef(0)
  const suppressUntilRef = useRef(0)

  // Programmatic jumps (sheet/tab navigation) produce one large downward
  // scroll delta that must not read as "user scrolled down, hide the chrome".
  const suppress = useCallback((durationMs = 250) => {
    suppressUntilRef.current = Date.now() + durationMs
    setHidden(false)
  }, [])

  useEffect(() => {
    if (disabled) return
    const el = scrollRef.current
    if (!el) return

    lastTopRef.current = el.scrollTop
    const handleScroll = () => {
      const top = el.scrollTop
      const delta = top - lastTopRef.current
      lastTopRef.current = top

      if (Date.now() < suppressUntilRef.current) return
      if (top < SHOW_NEAR_TOP_PX) {
        setHidden(false)
      } else if (delta > DELTA_THRESHOLD_PX) {
        setHidden(true)
      } else if (delta < -DELTA_THRESHOLD_PX) {
        setHidden(false)
      }
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [scrollRef, disabled])

  // Derive instead of setState-in-effect: while disabled (sheet open, reduced
  // motion) the chrome reads as visible without touching internal state.
  return { hidden: disabled ? false : hidden, suppress }
}

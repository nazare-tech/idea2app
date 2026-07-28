// src/hooks/use-keyboard-inset.ts
// Publishes the on-screen keyboard's height as the CSS custom property
// --workspace-keyboard-inset so bottom-anchored sheets can lift above it.
//
// Why a CSS variable instead of React state: visualViewport fires many events
// per second while the keyboard animates, and every consumer of the value is a
// style. Writing the property directly keeps the render tree still.
//
// Browser split:
// - Chrome Android reads interactive-widget=resizes-content (set in the root
//   viewport export) and shrinks the layout viewport itself, so innerHeight
//   already excludes the keyboard and this hook computes ~0.
// - iOS Safari ignores interactive-widget; only the visual viewport shrinks, so
//   the difference below is the real keyboard height.
"use client"

import { useEffect } from "react"

const CSS_VARIABLE = "--workspace-keyboard-inset"
// Browser chrome (the collapsing Safari toolbar) moves the visual viewport by a
// few pixels during normal scrolling. Anything smaller than this is not a
// keyboard.
const MIN_INSET_PX = 80

export function useKeyboardInset(enabled: boolean) {
  useEffect(() => {
    const root = document.documentElement
    const clear = () => root.style.removeProperty(CSS_VARIABLE)

    if (!enabled) {
      clear()
      return
    }

    const viewport = window.visualViewport
    if (!viewport) return

    const syncInset = () => {
      // offsetTop accounts for the page being scrolled within the visual
      // viewport while the keyboard is up (iOS pans rather than resizes).
      const occluded = window.innerHeight - viewport.height - viewport.offsetTop
      if (occluded >= MIN_INSET_PX) {
        root.style.setProperty(CSS_VARIABLE, `${Math.round(occluded)}px`)
      } else {
        clear()
      }
    }

    syncInset()
    viewport.addEventListener("resize", syncInset)
    viewport.addEventListener("scroll", syncInset)
    return () => {
      viewport.removeEventListener("resize", syncInset)
      viewport.removeEventListener("scroll", syncInset)
      clear()
    }
  }, [enabled])
}

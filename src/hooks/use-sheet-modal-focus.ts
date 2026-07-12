"use client"

import { useEffect, type RefObject } from "react"

/**
 * Modal focus semantics for bottom sheets announced as `aria-modal` dialogs:
 * Escape closes, focus optionally moves inside on open, Tab cycles within the
 * container, and focus returns to the opener on close. Shared by the mobile
 * documents sheet and the composer sheets so the behavior cannot drift.
 */
export function useSheetModalFocus(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  {
    onClose,
    initialFocusRef,
  }: {
    onClose: () => void
    /** Focus this element on open; omit when the sheet manages its own initial focus. */
    initialFocusRef?: RefObject<HTMLElement | null>
  },
) {
  useEffect(() => {
    if (!active) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    initialFocusRef?.current?.focus({ preventScroll: true })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
        return
      }
      if (event.key !== "Tab") return
      const root = containerRef.current
      if (!root) return
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const activeElement = document.activeElement
      if (event.shiftKey && (activeElement === first || !root.contains(activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (activeElement === last || !root.contains(activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [active, containerRef, initialFocusRef, onClose])
}

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
    restoreFocusRef,
  }: {
    onClose: () => void
    /** Focus this element on open; omit when the sheet manages its own initial focus. */
    initialFocusRef?: RefObject<HTMLElement | null>
    /** Focus this element on close (e.g. the opener FAB). Without it the hook
     * restores whatever was focused when the sheet activated, which is wrong
     * when a sibling autofocus effect ran first. */
    restoreFocusRef?: RefObject<HTMLElement | null>
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
      // The restore target (opener FAB) is unmounted while the sheet is open
      // and only exists again at cleanup time, so it must be read here, not
      // captured at effect setup (that would always capture null).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const restoreTarget = restoreFocusRef?.current ?? previouslyFocused
      restoreTarget?.focus?.({ preventScroll: true })
    }
  }, [active, containerRef, initialFocusRef, onClose, restoreFocusRef])
}

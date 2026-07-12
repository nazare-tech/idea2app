"use client"

import { useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(callback: () => void) {
  const query = window.matchMedia(QUERY)
  query.addEventListener("change", callback)
  return () => query.removeEventListener("change", callback)
}

/**
 * Live prefers-reduced-motion state. Updates if the OS setting changes while
 * the page is open; false during SSR.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false)
}

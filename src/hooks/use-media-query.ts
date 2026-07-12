"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * Live media-query state. False during SSR; components that gate analytics or
 * mount-level variants on this render nothing until hydration resolves the
 * real viewport, so impressions are only recorded for surfaces actually shown.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener("change", callback)
      return () => mediaQuery.removeEventListener("change", callback)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

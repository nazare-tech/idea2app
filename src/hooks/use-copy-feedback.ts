"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export function useCopyFeedback(timeoutMs = 2000) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copyText = useCallback(async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }

    setCopiedId(id)
    timeoutRef.current = window.setTimeout(() => {
      setCopiedId(null)
      timeoutRef.current = null
    }, timeoutMs)
  }, [timeoutMs])

  return {
    copiedId,
    copyText,
  }
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { copyTextToClipboard } from "@/lib/clipboard"

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
    await copyTextToClipboard(content)

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

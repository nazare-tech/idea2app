"use client"

import { useEffect, useRef } from "react"

export function useAutoResizingTextarea(value: string, maxHeight: number) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!textareaRef.current) return

    textareaRef.current.style.height = "auto"
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
  }, [maxHeight, value])

  return textareaRef
}

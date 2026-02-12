"use client"

import React, { useEffect, useState } from "react"
import { Wand2 } from "lucide-react"

interface SelectionToolbarProps {
  onEditClick: () => void
  position: { top: number; left: number; width: number }
}

export function SelectionToolbar({ onEditClick, position }: SelectionToolbarProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Slight delay for smooth appearance
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`fixed z-30 transition-all duration-200 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
      }`}
      style={{
        top: `${position.top - 48}px`,
        left: `${position.left + position.width / 2}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="relative">
        {/* Tooltip arrow */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45" />

        {/* Toolbar button */}
        <button
          onClick={onEditClick}
          className="relative bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl hover:bg-gray-800 transition-all duration-200 flex items-center gap-2 group"
        >
          <Wand2 className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
          <span className="text-xs font-semibold tracking-wide">Edit with AI</span>

          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-primary/20 rounded-lg opacity-0 group-hover:opacity-100 blur transition-opacity" />
        </button>
      </div>
    </div>
  )
}

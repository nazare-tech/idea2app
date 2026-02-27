"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { ExternalLink } from "lucide-react"

interface MockupScreen {
  screen_name: string
  ascii_art: string | null
  wiretext_url: string | null
}

interface MockupScreenViewerProps {
  screens: MockupScreen[]
  className?: string
}

export function MockupScreenViewer({ screens, className = "" }: MockupScreenViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (screens.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground">No screens available</p>
      </div>
    )
  }

  const activeScreen = screens[activeIndex]

  return (
    <div className={cn("space-y-4", className)}>
      {/* Screen tab bar */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {screens.map((screen, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              "border-b-2 -mb-px",
              i === activeIndex
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            {screen.screen_name}
          </button>
        ))}
      </div>

      {/* ASCII art display */}
      {activeScreen?.ascii_art ? (
        <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 overflow-x-auto flex justify-center">
          <code
            className="text-[13px] text-emerald-400 whitespace-pre inline-block"
            style={{
              fontFamily: "'Courier New', Courier, 'Lucida Console', monospace",
              lineHeight: 1.4,
              fontVariantLigatures: "none",
              tabSize: 4,
            }}
          >
            {activeScreen.ascii_art}
          </code>
        </pre>
      ) : (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Wireframe render failed for this screen
          </p>
        </div>
      )}

      {/* View in Wiretext link */}
      {activeScreen?.wiretext_url && (
        <div className="flex justify-end">
          <a
            href={activeScreen.wiretext_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            View in Wiretext
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  )
}

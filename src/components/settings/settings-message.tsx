"use client"

import { cn } from "@/lib/utils"

export type SettingsMessageTone = "success" | "error"

interface SettingsMessageProps {
  tone: SettingsMessageTone
  children: React.ReactNode
  className?: string
}

export function SettingsMessage({ tone, children, className }: SettingsMessageProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-sm",
        tone === "success"
          ? "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] text-[#15803d]"
          : "border-[rgba(255,59,48,0.25)] bg-[rgba(255,59,48,0.08)] text-[#b91c1c]",
        className
      )}
    >
      {children}
    </div>
  )
}

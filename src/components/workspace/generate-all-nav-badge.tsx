"use client"

import { useGenerateAll } from "@/stores/generate-all-store"

/**
 * Small badge shown on the "Explain the idea" nav item during Generate All.
 * Displays "X/Y" progress with a pulsing blue dot.
 */
export function GenerateAllNavBadge({ projectId }: { projectId: string }) {
  const status = useGenerateAll(projectId, (s) => s.status)
  const queue = useGenerateAll(projectId, (s) => s.queue)

  if (status !== "running") return null

  const completed = queue.filter((item) => item.status === "done").length
  const total = queue.filter((item) => item.status !== "skipped").length

  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-[#EFF6FF] px-2 py-0.5 text-[9px] font-medium font-mono text-[#3B82F6]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3B82F6] opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
      </span>
      {completed}/{total}
    </span>
  )
}

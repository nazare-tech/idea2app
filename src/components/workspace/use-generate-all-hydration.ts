"use client"

import { useGenerateAll } from "@/stores/generate-all-store"

export function useGenerateAllHydration(projectId: string) {
  return {
    generateAllQueue: useGenerateAll(projectId, (state) => state.queue),
    generateAllStatus: useGenerateAll(projectId, (state) => state.status),
    resumeGenerateAll: useGenerateAll(projectId, (state) => state.startGenerateAll),
  }
}

export interface ScrollSyncCandidate {
  id: string
  top: number
}

interface ChooseActiveScrollCandidateOptions {
  currentId?: string | null
  hysteresisPx?: number
}

export function chooseActiveScrollCandidate(
  candidates: ScrollSyncCandidate[],
  markerTop: number,
  options: ChooseActiveScrollCandidateOptions = {}
): ScrollSyncCandidate | null {
  if (candidates.length === 0) return null

  const sorted = [...candidates].sort((a, b) => a.top - b.top)
  const reached = sorted.filter((candidate) => candidate.top <= markerTop)

  const proposed = reached.length > 0 ? reached[reached.length - 1] : sorted[0]
  const current = options.currentId
    ? sorted.find((candidate) => candidate.id === options.currentId)
    : null
  const hysteresisPx = Math.max(0, options.hysteresisPx ?? 0)

  if (!current || current.id === proposed.id || hysteresisPx === 0) {
    return proposed
  }

  const currentIndex = sorted.findIndex((candidate) => candidate.id === current.id)
  const proposedIndex = sorted.findIndex((candidate) => candidate.id === proposed.id)
  if (currentIndex === -1 || proposedIndex === -1) return proposed

  if (proposedIndex > currentIndex && proposed.top > markerTop - hysteresisPx) {
    return current
  }

  if (proposedIndex < currentIndex && current.top <= markerTop + hysteresisPx) {
    return current
  }

  return proposed
}

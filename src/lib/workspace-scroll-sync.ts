export interface ScrollSyncCandidate {
  id: string
  navKey: string
  top: number
}

export function chooseActiveScrollCandidate(
  candidates: ScrollSyncCandidate[],
  markerTop: number
): ScrollSyncCandidate | null {
  if (candidates.length === 0) return null

  const sorted = [...candidates].sort((a, b) => a.top - b.top)
  const reached = sorted.filter((candidate) => candidate.top <= markerTop)

  if (reached.length > 0) {
    return reached[reached.length - 1]
  }

  return sorted[0]
}

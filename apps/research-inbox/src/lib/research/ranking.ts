import type { ResearchDocument, ResearchItem } from "./types"

export function rankResearchCandidates(candidates: ResearchItem[], document: ResearchDocument) {
  const weights = new Map<string, number>()
  for (const item of document.items) {
    const state = document.itemState[item.id]
    const weight = state?.repliedAt ? 8 : state?.saved ? 4 : state?.archived ? -6 : 0
    for (const tag of item.tags) weights.set(tag, (weights.get(tag) ?? 0) + weight)
  }
  return candidates
    .map((item, index) => ({ item, index, score: item.tags.reduce((sum, tag) => sum + (weights.get(tag) ?? 0), 0) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ item }) => item)
}

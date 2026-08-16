import { EMPTY_RESEARCH_STATE, type ResearchInboxState, type ResearchItem } from "./types"

export function getResearchStorageKey(userId: string, workspaceSlug: string) {
  return `makercompass:research-inbox:v1:${userId}:${workspaceSlug}`
}

export function parseResearchState(value: string | null): ResearchInboxState {
  if (!value) return EMPTY_RESEARCH_STATE
  try {
    const parsed = JSON.parse(value) as Partial<ResearchInboxState>
    if (parsed.version !== 1 || !parsed.items || typeof parsed.items !== "object") {
      return EMPTY_RESEARCH_STATE
    }
    return { version: 1, items: parsed.items }
  } catch {
    return EMPTY_RESEARCH_STATE
  }
}

export function rankResearchCandidates(
  candidates: ResearchItem[],
  allItems: ResearchItem[],
  state: ResearchInboxState,
) {
  const weightedTags = new Map<string, number>()
  for (const item of allItems) {
    const itemState = state.items[item.id]
    const weight = itemState?.repliedAt ? 8 : itemState?.saved ? 4 : itemState?.archived ? -6 : 0
    if (!weight) continue
    for (const tag of item.tags) weightedTags.set(tag, (weightedTags.get(tag) ?? 0) + weight)
  }

  return candidates
    .map((item, index) => ({
      item,
      index,
      score: item.tags.reduce((sum, tag) => sum + (weightedTags.get(tag) ?? 0), 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item, score }) => ({ item, score }))
}

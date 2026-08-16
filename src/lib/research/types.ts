export type ResearchSource = "reddit" | "x" | "youtube" | "hackernews" | "github" | "web"

export interface ResearchItem {
  id: string
  source: ResearchSource
  sourceLabel: string
  title: string
  excerpt: string
  url: string
  publishedAt: string
  engagementLabel: string
  tags: string[]
  quality: "strong" | "supporting" | "thin"
}

export interface ResearchItemState {
  seen?: boolean
  saved?: boolean
  archived?: boolean
  draft?: string
  repliedAt?: string
  postAttemptedAt?: string
  postDraftHash?: string
  unknownOutcome?: boolean
}

export interface ResearchInboxState {
  version: 1
  items: Record<string, ResearchItemState>
}

export const EMPTY_RESEARCH_STATE: ResearchInboxState = { version: 1, items: {} }

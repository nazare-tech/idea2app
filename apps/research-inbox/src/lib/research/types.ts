export type ResearchSource = "reddit" | "x" | "youtube" | "hackernews" | "github" | "web"

export type BrowserMode = "default" | "chrome" | "safari" | "firefox" | "arc"

export interface ArticleDraft {
  title: string
  deck: string
  body: string
  generatedAt: string
}

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
  articleDraft?: ArticleDraft
}

export interface ResearchDocument {
  version: 1
  revision: number
  updatedAt: string
  workspace: {
    slug: string
    name: string
    topic: string
    dateRange: string
    voice: string
    rawItemCount: number
    availableSources: number
    missingSources: string[]
  }
  items: ResearchItem[]
  itemState: Record<string, ResearchItemState>
  visibleIds: string[]
  browserMode: BrowserMode
}

export interface ResearchUpdate {
  itemId?: string
  itemPatch?: ResearchItemState
  visibleIds?: string[]
  browserMode?: BrowserMode
}

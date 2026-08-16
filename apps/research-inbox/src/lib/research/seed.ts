import type { ResearchDocument, ResearchItem } from "./types"

// Bounded, paraphrased evidence. The standalone app never imports Maker Compass files.
export const RESEARCH_ITEMS: ResearchItem[] = [
  {
    id: "reddit-weekend-ai-fatigue", source: "reddit", sourceLabel: "r/SaaS",
    title: "Buyers are tired of ‘built in a weekend with AI’ positioning",
    excerpt: "A high-engagement discussion rejects build-speed as proof of value. Buyers want named problems, credible examples, and evidence that software holds up at work.",
    url: "https://www.reddit.com/r/SaaS/comments/1vbfeha/as_the_person_who_actually_has_to_use_your/", publishedAt: "2026-07-31",
    engagementLabel: "319 points · 109 comments", tags: ["positioning", "buyer-trust", "ai-building", "proof"], quality: "strong",
  },
  {
    id: "reddit-validation-before-build", source: "reddit", sourceLabel: "r/SaaS",
    title: "A failed B2C build turns validation into a hard pre-build gate",
    excerpt: "The founder spent months building before testing with the intended audience. Their new rule: find the exact customer community and validate the problem before opening the builder.",
    url: "https://www.reddit.com/r/SaaS/comments/1vl5ftt/how_do_you_validate_your_ideas_befor_building/", publishedAt: "2026-08-11",
    engagementLabel: "Active founder discussion", tags: ["validation", "customer-research", "wrong-product", "first-version"], quality: "strong",
  },
  {
    id: "web-ai-era-cto", source: "web", sourceLabel: "TechRadar Pro",
    title: "AI expands engineering capacity, making product judgment the bottleneck",
    excerpt: "As implementation moves to agents, technical leaders spend more time defining work, reviewing outcomes, and deciding whether generated software serves the product goal.",
    url: "https://www.techradar.com/pro/the-ai-era-is-creating-a-new-cto", publishedAt: "2026-08-11",
    engagementLabel: "Published 4 days ago", tags: ["product-direction", "ai-building", "human-judgment", "scope"], quality: "strong",
  },
  {
    id: "web-ai-app-not-special", source: "web", sourceLabel: "TechRadar Pro",
    title: "Fast, polished software is no longer meaningful differentiation",
    excerpt: "Commodity AI infrastructure lets founders and buyers build similar applications quickly. The product must be more valuable than what customers can assemble themselves.",
    url: "https://www.techradar.com/pro/bad-news-your-ai-application-isnt-that-special", publishedAt: "2026-08-13",
    engagementLabel: "Published 2 days ago", tags: ["differentiation", "positioning", "buyer-value", "market-context"], quality: "strong",
  },
  {
    id: "web-vibe-site-direction", source: "web", sourceLabel: "TechRadar Pro",
    title: "Generation struggles when users cannot articulate what they want",
    excerpt: "Open-ended prompting often creates slow regeneration loops. Concrete options help people choose direction before spending more cycles.",
    url: "https://www.techradar.com/pro/vibe-coding-a-landing-page-from-scratch-is-completely-pointless-how-will-vibe-coding-really-impact-the-future-of-website-building", publishedAt: "2026-07-28",
    engagementLabel: "Founder interview", tags: ["product-direction", "choice-architecture", "ai-building", "iteration"], quality: "strong",
  },
  {
    id: "github-product-definition", source: "github", sourceLabel: "Public GitHub issue",
    title: "A release sprint starts by resolving product-definition questions",
    excerpt: "The planning note separates commercial release gates from future ideas and aims to enter the sprint with no unresolved product-definition questions.",
    url: "https://github.com/mlstretch0422-lang/trader-dashboard/issues/52", publishedAt: "2026-08-12",
    engagementLabel: "33 comments", tags: ["scope", "release-planning", "first-version", "risk"], quality: "supporting",
  },
  {
    id: "hn-ai-coding-costs", source: "hackernews", sourceLabel: "Hacker News",
    title: "AI coding at scale creates a new cost-management problem",
    excerpt: "A widely discussed engineering post treats generated-code capacity as an operational system that still needs budgets, review, and deliberate controls.",
    url: "https://news.ycombinator.com/item?id=44823038", publishedAt: "2026-08-07",
    engagementLabel: "315 points · 268 comments", tags: ["ai-building", "cost", "operations", "risk"], quality: "supporting",
  },
  {
    id: "reddit-money-after-focus", source: "reddit", sourceLabel: "r/SaaS",
    title: "Revenue arrives after repeated learning, not launch theater",
    excerpt: "A founder’s first meaningful revenue milestone triggers a discussion about learning channels, campaign costs, iteration, and the gap between building and acquiring users.",
    url: "https://www.reddit.com/r/SaaS/comments/1vi45rk/my_software_is_finally_making_money/", publishedAt: "2026-08-07",
    engagementLabel: "395 points · 230 comments", tags: ["validation", "traction", "learning", "distribution"], quality: "supporting",
  },
  {
    id: "web-legacy-risk", source: "web", sourceLabel: "TechRadar Pro",
    title: "Generated code can hide legacy risk behind a modern interface",
    excerpt: "Teams that win will manage intent, quality, and maintainability instead of optimizing only for how quickly code appears.",
    url: "https://www.techradar.com/pro/are-we-vibe-coding-our-way-to-a-new-legacy-crisis", publishedAt: "2026-08-08",
    engagementLabel: "Published last week", tags: ["maintainability", "risk", "ai-building", "quality"], quality: "supporting",
  },
  {
    id: "youtube-spec-first", source: "youtube", sourceLabel: "Founder workflow video",
    title: "Problem definition comes before prototyping and code generation",
    excerpt: "A current founder tutorial frames AI building as a later step in a sequence that starts with the problem, intended user, and a narrowed prototype.",
    url: "https://di.gg/ai/2tonsqx1", publishedAt: "2026-07-29",
    engagementLabel: "Cross-platform video cluster", tags: ["problem-definition", "first-version", "scope", "workflow"], quality: "thin",
  },
]

export function createSeedDocument(): ResearchDocument {
  return {
    version: 1,
    revision: 0,
    updatedAt: new Date().toISOString(),
    workspace: {
      slug: "maker-compass-problem",
      name: "Maker Compass problem research",
      topic: "Builders can generate software faster, but still lack validation, product direction, and a deliberate first version.",
      dateRange: "Jul 16 – Aug 15, 2026",
      voice: "Quietly direct, anti-hype, specific, and constructive.",
      rawItemCount: 56,
      availableSources: 5,
      missingSources: ["X / Twitter"],
    },
    items: RESEARCH_ITEMS,
    itemState: {},
    visibleIds: RESEARCH_ITEMS.slice(0, 6).map((item) => item.id),
    browserMode: "default",
  }
}

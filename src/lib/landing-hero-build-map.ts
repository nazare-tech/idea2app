/**
 * Geometry and content for the hero build map.
 *
 * The artwork is a fixed-size canvas whose children are positioned in
 * percentages, so it scales with its container instead of reflowing. There are
 * two canvases, swapped by CSS at 1024px:
 *
 * - wide (1760x760): the desktop band that closes the hero
 * - tall (800x1700): the stacked mobile/tablet variant
 *
 * Both carry the same five nodes in the same order (Idea, Research, Plan,
 * Design, Prompt), which is why node content renders from one shared renderer
 * and only the position triple differs. Connector paths are drawn in an SVG
 * overlay sized to the canvas with `preserveAspectRatio="none"`, so path
 * coordinates are canvas units, not pixels.
 *
 * Scenario copy is illustrative sample content, in the same spirit as
 * `landing-feature-stage.ts`: hand-authored one-liners, not generated output.
 */

/** The five nodes, in draw order. Keys are stable and used by the cycle. */
export type BuildMapNodeId = "idea" | "research" | "plan" | "design" | "prompt"

export interface BuildMapBox {
  /** Percentages against the canvas, e.g. "32.8947%". */
  left: string
  top: string
  width: string
  height: string
}

export interface BuildMapNodePlacement extends BuildMapBox {
  id: BuildMapNodeId
  /** Entrance delay in ms. */
  delay: number
  /** Label row alignment. The tall variant flips some labels to the right. */
  labelAlign: "left" | "right"
}

export interface BuildMapConnector {
  /** SVG path in canvas units. */
  d: string
  /** Draw-in delay in ms. */
  delay: number
}

export interface BuildMapJoint {
  left: string
  top: string
  /** Fade-in delay in ms. */
  delay: number
}

export interface BuildMapLayout {
  /** Canvas size in the units every percentage and path coordinate resolves against. */
  canvas: { width: number; height: number }
  /** Cap on the rendered canvas width. */
  maxWidth: number
  connectors: BuildMapConnector[]
  joints: BuildMapJoint[]
  nodes: BuildMapNodePlacement[]
}

/** Static label pair shown above each node. */
export const BUILD_MAP_NODE_LABELS: Record<BuildMapNodeId, { name: string; detail: string }> = {
  idea: { name: "Idea", detail: "One line" },
  research: { name: "Research", detail: "Competitive analysis" },
  plan: { name: "Plan", detail: "Product plan" },
  design: { name: "Design", detail: "Mockups" },
  prompt: { name: "Prompt", detail: "Ready for your agent" },
}

export const WIDE_LAYOUT: BuildMapLayout = {
  canvas: { width: 1760, height: 760 },
  maxWidth: 1760,
  connectors: [
    { d: "M340,320 C392,320 378,300 430,300", delay: 300 },
    { d: "M720,300 C778,300 752,420 810,420", delay: 410 },
    { d: "M1120,420 C1178,420 1152,205 1210,205", delay: 520 },
    { d: "M1120,420 C1178,420 1152,530 1210,530", delay: 630 },
  ],
  joints: [
    { left: "19.3182%", top: "42.1053%", delay: 700 },
    { left: "24.4318%", top: "39.4737%", delay: 740 },
    { left: "40.9091%", top: "39.4737%", delay: 780 },
    { left: "46.0227%", top: "55.2632%", delay: 820 },
    { left: "63.6364%", top: "55.2632%", delay: 860 },
    { left: "68.7500%", top: "26.9737%", delay: 900 },
    { left: "68.7500%", top: "69.7368%", delay: 940 },
  ],
  nodes: [
    { id: "idea", left: "2.2727%", top: "32.8947%", width: "17.0455%", height: "18.4211%", delay: 80, labelAlign: "left" },
    { id: "research", left: "24.4318%", top: "11.8421%", width: "16.4773%", height: "55.2632%", delay: 180, labelAlign: "left" },
    { id: "plan", left: "46.0227%", top: "22.3684%", width: "17.6136%", height: "65.7895%", delay: 280, labelAlign: "left" },
    { id: "design", left: "68.7500%", top: "9.2105%", width: "20.4545%", height: "35.5263%", delay: 380, labelAlign: "left" },
    { id: "prompt", left: "68.7500%", top: "55.2632%", width: "23.8636%", height: "28.9474%", delay: 480, labelAlign: "left" },
  ],
}

export const TALL_LAYOUT: BuildMapLayout = {
  canvas: { width: 800, height: 1700 },
  maxWidth: 720,
  connectors: [
    { d: "M320,200 C320,272 410,278 410,350", delay: 300 },
    { d: "M410,620 C410,700 380,700 380,780", delay: 410 },
    { d: "M380,1110 C380,1182 410,1168 410,1240", delay: 520 },
    { d: "M410,1400 C410,1472 450,1458 450,1530", delay: 630 },
  ],
  joints: [
    { left: "40.0000%", top: "11.7647%", delay: 700 },
    { left: "51.2500%", top: "20.5882%", delay: 740 },
    { left: "51.2500%", top: "36.4706%", delay: 780 },
    { left: "47.5000%", top: "45.8824%", delay: 820 },
    { left: "47.5000%", top: "65.2941%", delay: 860 },
    { left: "51.2500%", top: "72.9412%", delay: 900 },
    { left: "51.2500%", top: "82.3529%", delay: 940 },
    { left: "56.2500%", top: "90.0000%", delay: 980 },
  ],
  nodes: [
    { id: "idea", left: "3.7500%", top: "5.8824%", width: "36.2500%", height: "8.2353%", delay: 80, labelAlign: "left" },
    { id: "research", left: "51.2500%", top: "17.6471%", width: "41.2500%", height: "21.1765%", delay: 180, labelAlign: "right" },
    { id: "plan", left: "3.7500%", top: "42.9412%", width: "43.7500%", height: "24.7059%", delay: 280, labelAlign: "left" },
    { id: "design", left: "51.2500%", top: "70.0000%", width: "42.5000%", height: "14.7059%", delay: 380, labelAlign: "right" },
    { id: "prompt", left: "3.7500%", top: "87.0588%", width: "52.5000%", height: "11.7647%", delay: 480, labelAlign: "left" },
  ],
}

/** One competitor row in the Research node. */
export interface BuildMapCompetitor {
  /** Domain used for the favicon lookup. */
  domain: string
  name: string
}

export interface BuildMapScenario {
  /** Typed into the Idea node one character at a time. */
  idea: string
  /** Exactly three, one per Research row. */
  competitors: BuildMapCompetitor[]
  persona: { initials: string; name: string; role: string }
  /** Exactly three, shown as G1..G3 in the Plan node. */
  goals: string[]
  /** Exactly five, shown as file rows in the Prompt node. */
  files: string[]
  /** Index into `BUILD_MAP_MOCKUPS`. */
  mockup: number
}

/**
 * Mockup images crossfaded inside the Design node, one per scenario. Clipped
 * mobile mockups (576x1008, transparent background) from the hero-reel set,
 * copied here so the samples dir stays the single home for build-map imagery.
 */
export const BUILD_MAP_MOCKUPS = [
  { src: "/landing/samples/mockup-mobile-a.png", alt: "Mobile design mockup preview" },
  { src: "/landing/samples/mockup-mobile-b.png", alt: "Mobile design mockup preview" },
  { src: "/landing/samples/mockup-mobile-c.png", alt: "Mobile design mockup preview" },
] as const

export const BUILD_MAP_SCENARIOS: BuildMapScenario[] = [
  {
    idea: "Turn scattered customer feedback into a ranked roadmap for B2B SaaS teams.",
    competitors: [
      { domain: "productboard.com", name: "Productboard" },
      { domain: "canny.io", name: "Canny" },
      { domain: "aha.io", name: "Aha!" },
    ],
    persona: { initials: "MC", name: "Maya Chen", role: "Product Manager" },
    goals: [
      "One inbox for every feedback source",
      "Themes ranked by revenue at stake",
      "A roadmap the team can defend",
    ],
    files: [
      "signaldesk-brief.md",
      "prd.md",
      "personas.md",
      "first-version-plan.md",
      "prompt-01.md",
    ],
    mockup: 0,
  },
  {
    idea: "A booking app for independent barbers, with deposits that end no-shows.",
    competitors: [
      { domain: "getsquire.com", name: "Squire" },
      { domain: "booksy.com", name: "Booksy" },
      { domain: "fresha.com", name: "Fresha" },
    ],
    persona: { initials: "DL", name: "Dre Lawson", role: "Shop Owner" },
    goals: [
      "Clients book without the DM thread",
      "Deposits cut no-shows to near zero",
      "One clean week view per chair",
    ],
    files: [
      "chairbook-brief.md",
      "prd.md",
      "personas.md",
      "first-version-plan.md",
      "prompt-01.md",
    ],
    mockup: 1,
  },
  {
    idea: "Invoices that chase late payments themselves, built for freelancers.",
    competitors: [
      { domain: "freshbooks.com", name: "FreshBooks" },
      { domain: "hellobonsai.com", name: "Bonsai" },
      { domain: "honeybook.com", name: "HoneyBook" },
    ],
    persona: { initials: "SK", name: "Sana Khan", role: "Freelance Designer" },
    goals: [
      "An invoice out in under a minute",
      "Reminders that send themselves",
      "Who owes what, at a glance",
    ],
    files: [
      "latepay-brief.md",
      "prd.md",
      "personas.md",
      "first-version-plan.md",
      "prompt-01.md",
    ],
    mockup: 2,
  },
]

/** How many competitor rows the Research node renders. */
export const RESEARCH_ROW_COUNT = 3
/** Footnote under the competitor rows; the count is illustrative. */
export const RESEARCH_FOOTNOTE = "+ 9 more mapped"

/**
 * Timing of one scenario cycle, in ms. Taken from the design file so the
 * rhythm (long enough to read, short enough to notice) is preserved exactly.
 */
export const CYCLE_TIMING = {
  /** Hold on the server-rendered first scenario before the loop takes over. */
  initialHold: 1700,
  /** Panels fade out and the idea line clears for this long. */
  clear: 460,
  /** Per character of the typed idea line: base + random jitter. */
  typeBase: 14,
  typeJitter: 16,
  /** Beat between the finished line and the panels coming back. */
  beforeReveal: 150,
  /** Stagger between panels, multiplied by the panel's index. */
  revealStagger: 170,
  /** Hold on the finished scenario before the next cycle. */
  hold: 3800,
} as const

/** Fade order of the content panels, matching the design's stagger indices. */
export const PANEL_ORDER: BuildMapNodeId[] = ["research", "plan", "design", "prompt"]

/**
 * Content and geometry for the landing page feature scrollytelling.
 *
 * The stage is a fixed-size canvas (1120x820 landscape, 840x1120 portrait) that
 * is scaled to fit its container, so every card position is expressed as a
 * percentage of that canvas rather than as a responsive layout. Each card
 * therefore carries up to three position triples:
 *
 * - `landscape`  : >= 1024px, the two-column scrollytelling layout
 * - `portrait`   : < 1024px, the sticky strip under the header
 * - `portraitSmall` (optional): < 768px, when the portrait layout needs more room
 *
 * Card copy is a condensed, hand-authored view of the "Signal To Roadmap" sample
 * project. It is deliberately not derived from LANDING_SAMPLE_CONTENT: that file
 * holds the full generated markdown, and these cards are one-line summaries.
 */

export interface StagePosition {
  /** Percentage offsets against the stage canvas, e.g. "10%". */
  top: string
  left: string
  width: string
}

export type StageCardBody =
  | { kind: "competitor"; domain: string; name: string; summary: string }
  | { kind: "persona"; initials: string; name: string; role: string; summary: string }
  | { kind: "step"; label: string; title: string; summary: string }
  | { kind: "image"; src: string; alt: string; width: number; height: number }
  | { kind: "prompt"; label: string; badge?: string; title: string; lines: string[] }

export interface StageCard {
  id: string
  /** Resting rotation in degrees; the reveal animates in from below this angle. */
  rotation: number
  landscape: StagePosition
  portrait: StagePosition
  portraitSmall?: StagePosition
  body: StageCardBody
}

export interface StageSet {
  id: string
  /**
   * Sets that scroll sideways in portrait instead of revealing card by card.
   * The shift values are a percentage of the canvas width, applied as the
   * section's progress advances.
   */
  flow?: { portraitShiftPercent: number; smallPortraitShiftPercent?: number }
  cards: StageCard[]
}

export interface FeatureBlock {
  eyebrow: string
  title: string
  description: string
}

/** Landscape canvas, in the units every `landscape` percentage resolves against. */
export const STAGE_LANDSCAPE = { width: 1120, height: 820 }
/** Portrait canvas, used below 1024px. */
export const STAGE_PORTRAIT = { width: 840, height: 1120 }

/** Short labels for the fixed compass rail, one per feature block. */
export const RAIL_LABELS = ["01 RESEARCH", "02 PLAN", "03 SCOPE", "04 MOCKUPS", "05 PROMPTS"]

export const FEATURE_BLOCKS: FeatureBlock[] = [
  {
    eyebrow: "01 / Market Research",
    title: "Know the market before you build.",
    description:
      "Every direct competitor, their pricing, and the open gap for your idea, mapped before you commit a sprint.",
  },
  {
    eyebrow: "02 / Product Plan",
    title: "Know who you’re building for.",
    description:
      "Three personas grounded in the research, with the user stories and requirements a coding agent can scope.",
  },
  {
    eyebrow: "03 / First Version Plan",
    title: "Scope the first release like a builder.",
    description:
      "A realistic build sequence, a validation plan, and what is explicitly out, so scope creep never sneaks back in.",
  },
  {
    eyebrow: "04 / Design Mockups",
    title: "Three UI directions, side by side.",
    description:
      "The same core screens in three visual takes. Pick one, and it becomes the build reference.",
  },
  {
    eyebrow: "05 / AI Prompts",
    title: "A brief your coding agent can run with.",
    description:
      "A recommended build tool and a first prompt built from your plans, ready to paste into your coding agent.",
  },
]

/** Card sets, one per feature block, in the same order. */
export const STAGE_SETS: StageSet[] = [
  {
    id: "market-research",
    cards: [
      {
        id: "productboard",
        rotation: -2,
        landscape: { top: "10%", left: "7%", width: "44%" },
        portrait: { top: "4%", left: "3%", width: "78%" },
        body: {
          kind: "competitor",
          domain: "productboard.com",
          name: "Productboard",
          summary:
            "Feedback aggregation and roadmap prioritization for product orgs. Strong, but heavy for small teams.",
        },
      },
      {
        id: "canny",
        rotation: 1.5,
        landscape: { top: "22%", left: "44%", width: "44%" },
        portrait: { top: "26%", left: "19%", width: "78%" },
        body: {
          kind: "competitor",
          domain: "canny.io",
          name: "Canny",
          summary: "Public feature-voting boards. Great capture, thin on synthesis.",
        },
      },
      {
        id: "aha",
        rotation: -1,
        landscape: { top: "46%", left: "14%", width: "44%" },
        portrait: { top: "48%", left: "5%", width: "78%" },
        body: {
          kind: "competitor",
          domain: "aha.io",
          name: "Aha!",
          summary: "Enterprise roadmapping suite. Powerful, priced for VPs, not builders.",
        },
      },
      {
        id: "uservoice",
        rotation: 2,
        landscape: { top: "58%", left: "48%", width: "44%" },
        portrait: { top: "70%", left: "17%", width: "78%" },
        body: {
          kind: "competitor",
          domain: "uservoice.com",
          name: "UserVoice",
          summary: "Enterprise feedback and NPS analytics. Long setup, longer contracts.",
        },
      },
    ],
  },
  {
    id: "product-plan",
    cards: [
      {
        id: "maya",
        rotation: -1.5,
        landscape: { top: "10%", left: "8%", width: "46%" },
        portrait: { top: "8%", left: "4%", width: "80%" },
        body: {
          kind: "persona",
          initials: "MC",
          name: "Maya Chen",
          role: "Product Manager",
          summary:
            "Owns the roadmap. Needs signal pulled out of the noise before quarterly planning.",
        },
      },
      {
        id: "raj",
        rotation: 1.5,
        landscape: { top: "34%", left: "42%", width: "46%" },
        portrait: { top: "36%", left: "16%", width: "80%" },
        body: {
          kind: "persona",
          initials: "RP",
          name: "Raj Patel",
          role: "Customer Success Lead",
          summary: "First to hear churn risk. Wants complaints to actually reach the roadmap.",
        },
      },
      {
        id: "elena",
        rotation: -1,
        landscape: { top: "58%", left: "16%", width: "46%" },
        portrait: { top: "64%", left: "8%", width: "80%" },
        body: {
          kind: "persona",
          initials: "ER",
          name: "Elena Ruiz",
          role: "Head of Product",
          summary: "Answers to the board. Needs prioritization she can defend.",
        },
      },
    ],
  },
  {
    id: "first-version-plan",
    cards: [
      {
        id: "step-01",
        rotation: -2,
        landscape: { top: "10%", left: "7%", width: "44%" },
        portrait: { top: "4%", left: "3%", width: "78%" },
        body: {
          kind: "step",
          label: "Step 01",
          title: "Build the feedback inbox",
          summary: "One channel in, tagged and searchable. Nothing else.",
        },
      },
      {
        id: "step-02",
        rotation: 1.5,
        landscape: { top: "22%", left: "44%", width: "44%" },
        portrait: { top: "26%", left: "19%", width: "78%" },
        body: {
          kind: "step",
          label: "Step 02",
          title: "Test with 10 PMs",
          summary: "Hand-recruited from communities where they already complain.",
        },
      },
      {
        id: "validation",
        rotation: -1,
        landscape: { top: "46%", left: "14%", width: "44%" },
        portrait: { top: "48%", left: "5%", width: "78%" },
        body: {
          kind: "step",
          label: "Validation",
          title: "5 of 10 return in week two",
          summary: "The single signal that says keep going.",
        },
      },
      {
        id: "out-of-scope",
        rotation: 2,
        landscape: { top: "58%", left: "48%", width: "44%" },
        portrait: { top: "70%", left: "17%", width: "78%" },
        body: {
          kind: "step",
          label: "Out of scope",
          title: "SSO, integrations, dashboards",
          summary: "Named early so scope creep has nowhere to hide.",
        },
      },
    ],
  },
  {
    id: "design-mockups",
    flow: { portraitShiftPercent: 416 },
    cards: [
      {
        id: "mockup-a",
        rotation: 0,
        landscape: { top: "6%", left: "2%", width: "70%" },
        portrait: { top: "5%", left: "-50%", width: "200%" },
        body: {
          kind: "image",
          src: "/landing/samples/mockup-option-a.png",
          alt: "Mockup option A",
          width: 1568,
          height: 672,
        },
      },
      {
        id: "mockup-b",
        rotation: 0,
        landscape: { top: "31%", left: "15%", width: "70%" },
        portrait: { top: "5%", left: "158%", width: "200%" },
        body: {
          kind: "image",
          src: "/landing/samples/mockup-option-b.png",
          alt: "Mockup option B",
          width: 1568,
          height: 672,
        },
      },
      {
        id: "mockup-c",
        rotation: 0,
        landscape: { top: "56%", left: "28%", width: "70%" },
        portrait: { top: "5%", left: "366%", width: "200%" },
        body: {
          kind: "image",
          src: "/landing/samples/mockup-option-c.png",
          alt: "Mockup option C",
          width: 1568,
          height: 672,
        },
      },
    ],
  },
  {
    id: "ai-prompts",
    flow: { portraitShiftPercent: 357, smallPortraitShiftPercent: 270 },
    cards: [
      {
        id: "prompt-brief",
        rotation: 0,
        landscape: { top: "3%", left: "0%", width: "52%" },
        portrait: { top: "6%", left: "-5.5%", width: "111%" },
        portraitSmall: { top: "6%", left: "8%", width: "84%" },
        body: {
          kind: "prompt",
          label: "Prompt 01",
          title: "Project brief",
          lines: [
            "# Project brief",
            "SignalDesk turns raw customer feedback into a prioritized roadmap for B2B SaaS teams.",
            "",
            "## Context",
            "The user is a PM who owns quarterly planning. Feedback lives in five tools and never makes it into one place.",
            "",
            "## Goals",
            "G1. One inbox for every feedback source",
            "G2. Themes ranked by revenue at stake",
            "G3. A roadmap the team can defend",
            "",
            "## Non-goals",
            "Surveys, NPS tooling, session replay...",
          ],
        },
      },
      {
        id: "prompt-prd",
        rotation: 0,
        landscape: { top: "9%", left: "16%", width: "52%" },
        portrait: { top: "6%", left: "113.5%", width: "111%" },
        portraitSmall: { top: "6%", left: "98%", width: "84%" },
        body: {
          kind: "prompt",
          label: "Prompt 02",
          title: "PRD",
          lines: [
            "# PRD",
            "",
            "## Persona: Maya, PM",
            "As a PM, I want feedback tagged by theme, so planning starts from evidence.",
            "",
            "## Requirements",
            "R1. Ingest from email, Slack, CSV",
            "R2. Auto-tag by theme and weight",
            "R3. Weight themes by ARR impact",
            "R4. One-click export to Linear",
            "",
            "## Acceptance",
            "A tagged theme appears within 5s of ingest.",
            "Weights recompute nightly.",
            "Export round-trips without manual cleanup...",
          ],
        },
      },
      {
        id: "prompt-tech-spec",
        rotation: 0,
        landscape: { top: "3%", left: "32%", width: "52%" },
        portrait: { top: "6%", left: "232.5%", width: "111%" },
        portraitSmall: { top: "6%", left: "188%", width: "84%" },
        body: {
          kind: "prompt",
          label: "Prompt 03",
          title: "Tech spec",
          lines: [
            "# Tech spec",
            "",
            "## Stack",
            "Next.js, Postgres, Prisma",
            "",
            "## Data model",
            "Feedback(id, source, theme, weight)",
            "Theme(id, name, count)",
            "",
            "## API",
            "POST /ingest",
            "GET /themes?sort=weight",
            "POST /themes/:id/merge",
            "",
            "## Jobs",
            "Nightly reweight (cron)",
            "Dedupe on ingest hash",
            "",
            "## Auth",
            "Deferred, single workspace...",
          ],
        },
      },
      {
        id: "prompt-first",
        rotation: 0,
        landscape: { top: "9%", left: "48%", width: "52%" },
        portrait: { top: "6%", left: "351.5%", width: "111%" },
        portraitSmall: { top: "6%", left: "278%", width: "84%" },
        body: {
          kind: "prompt",
          label: "Prompt 04",
          badge: "Ready to paste",
          title: "First prompt",
          lines: [
            "# First prompt",
            "Build the first version described in the attached spec.",
            "",
            "Start with the feedback inbox: one ingest endpoint, auto-tagging, and a themes list sorted by weight. Skip auth until it hurts.",
            "",
            "Then: a theme detail view with source quotes, and a CSV import that maps columns interactively.",
            "",
            "Ship when the inbox round-trips one real email end to end...",
          ],
        },
      },
    ],
  },
]

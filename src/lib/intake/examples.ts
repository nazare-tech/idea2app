export interface IntakeExampleIdea {
  id: string
  title: string
  description: string
}

// Twelve seed ideas feed the three scrolling example rows on the intake Step 1
// (four per row). Titles are short enough to read at a glance in a moving pill;
// descriptions are full enough to pass the idea-validation floor when picked.
export const INTAKE_EXAMPLE_IDEAS: IntakeExampleIdea[] = [
  {
    id: "meal-prep-membership",
    title: "AI meal prep membership",
    description:
      "An AI powered meal prep membership for busy professionals that learns dietary preferences, generates weekly menus, and delivers grocery kits with easy-to-follow recipes tailored to health goals and schedule.",
  },
  {
    id: "pet-care-marketplace",
    title: "Verified pet care marketplace",
    description:
      "A neighborhood pet care marketplace that verifies sitters with identity checks, training badges, and reviews, making it easy for pet parents to find trusted care for walks, boarding, and in-home visits.",
  },
  {
    id: "product-intelligence",
    title: "B2B product intelligence",
    description:
      "A B2B product intelligence platform that ingests support tickets, chat transcripts, sales calls, and docs to surface insights, detect trends, and recommend roadmap priorities for product and customer teams.",
  },
  {
    id: "freelancer-invoicing",
    title: "Freelancer invoicing autopilot",
    description:
      "An invoicing autopilot for freelancers that drafts invoices from tracked hours, chases late payments politely, and reconciles everything against bank deposits automatically.",
  },
  {
    id: "farm-box-marketplace",
    title: "Local farm box marketplace",
    description:
      "A marketplace connecting neighborhood farms with families, offering weekly produce boxes, transparent sourcing, and flexible subscriptions that support local growers.",
  },
  {
    id: "resume-interview-coach",
    title: "AI resume and interview coach",
    description:
      "An AI coach that rewrites resumes for specific job posts, runs mock interviews with feedback, and tracks application outcomes to sharpen its advice over time.",
  },
  {
    id: "team-retro-assistant",
    title: "Team retro assistant",
    description:
      "A retrospective assistant for remote teams that collects feedback async, clusters recurring themes, and turns discussion into owned action items with due dates.",
  },
  {
    id: "rental-cleaning-ops",
    title: "Vacation rental cleaning ops",
    description:
      "An operations tool for vacation rental hosts that schedules cleaners between bookings, verifies each turnover with photos, and flags maintenance issues before guests arrive.",
  },
  {
    id: "couples-budgeting",
    title: "Couples budgeting app",
    description:
      "A personal finance app for couples that merges accounts into one shared view, splits expenses fairly, and coaches both partners toward joint savings goals.",
  },
  {
    id: "contractor-quote-builder",
    title: "Contractor quote builder",
    description:
      "A quoting tool for home contractors that turns site photos and voice notes into itemized estimates clients can review and approve online.",
  },
  {
    id: "event-photographer-marketplace",
    title: "Event photographer marketplace",
    description:
      "A marketplace matching event hosts with vetted photographers, with instant availability, transparent packages, and same-week photo delivery.",
  },
  {
    id: "language-exchange-matching",
    title: "Language exchange matching",
    description:
      "An app matching language learners for structured 30-minute exchanges based on level, interests, and time zone, with guided conversation prompts.",
  },
]

export interface IntakeExampleIdea {
  id: string
  title: string
  description: string
}

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
]

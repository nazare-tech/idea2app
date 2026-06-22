export const EXPLAINABLE_TERMS = {
  proprietaryDataAssets: {
    label: "Proprietary Data Assets",
    description:
      "Data or knowledge your product collects that becomes more useful over time and is hard for others to copy.",
  },
  riskFraming: {
    label: "Internal / External Risks",
    description:
      "Internal risks are things you control. External risks are market, competitor, legal, or platform risks you cannot fully control.",
  },
  projectSize: {
    label: "Project Size",
    description:
      "A rough estimate of build complexity, not company size, market size, or revenue potential.",
  },
  teamMembers: {
    label: "Team Members",
    description:
      "The number of roles or workstreams the plan expects, which may be handled by people, contractors, or AI agents.",
  },
  teamComposition: {
    label: "Team Composition",
    description:
      "The roles or workstreams needed to build this, along with why each one matters.",
  },
  agents: {
    label: "Agents",
    description:
      "The specialized agent roles or areas of expertise that should help build this, without implying a headcount or hiring plan.",
  },
  validationPlan: {
    label: "Validation Plan",
    description:
      "A simple research plan for proving whether this idea is worth continuing.",
  },
  riskiestAssumption: {
    label: "Riskiest Assumption",
    description:
      "The biggest thing that must be true for this product to work.",
  },
  positioningMap: {
    label: "Positioning Map",
    description:
      "A visual comparison of where competitors sit on two important dimensions.",
  },
  differentiator: {
    label: "Differentiator",
    description:
      "A focused reason users would choose this instead of existing options.",
  },
  defensibility: {
    label: "Defensibility",
    description:
      "What could make the product harder for competitors to copy once it starts working.",
  },
  gapAnalysis: {
    label: "Gap Analysis",
    description:
      "Unmet customer needs or openings competitors are not serving well.",
  },
  dependencies: {
    label: "Dependencies",
    description:
      "Things that must be available or decided before the work can move forward.",
  },
  assumptions: {
    label: "Assumptions",
    description:
      "Important guesses the plan relies on because the input did not fully confirm them.",
  },
  acceptanceCriteria: {
    label: "Acceptance Criteria",
    description:
      "Pass/fail checks that tell a developer or QA tester whether a feature works.",
  },
  functionalRequirements: {
    label: "Functional Requirements",
    description:
      "What the product must let users or the system do in the first version.",
  },
  nonFunctionalRequirements: {
    label: "Non-Functional Requirements",
    description:
      "Quality rules like speed, security, accessibility, reliability, and privacy.",
  },
  manualShortcuts: {
    label: "Manual Shortcuts",
    description:
      "Things to do by hand before building full automation, so you can learn faster.",
  },
  conciergeMvp: {
    label: "Concierge MVP",
    description:
      "A first version where you manually deliver the service to learn what users actually need.",
  },
  wizardOfOzMvp: {
    label: "Wizard-of-Oz MVP",
    description:
      "A test where users see a product-like experience while some backend work is still done manually.",
  },
  technicalConsiderations: {
    label: "Technical Considerations",
    description:
      "The product behavior, feasibility, privacy, and infrastructure details a builder should account for.",
  },
  successMetrics: {
    label: "Success Metrics",
    description:
      "The signals you will use to tell whether the product is working.",
  },
  timelineMilestones: {
    label: "Timeline & Milestones",
    description:
      "A rough build path showing phases, milestones, and what each phase should produce.",
  },
  risksDependenciesOpenQuestions: {
    label: "Risks, Dependencies & Open Questions",
    description:
      "The main things that could go wrong, what the work depends on, and what still needs a decision.",
  },
  risksMitigation: {
    label: "Risks & Mitigation",
    description:
      "What could go wrong and how to reduce the chance or impact of that problem.",
  },
  impact: {
    label: "Impact",
    description:
      "What happens if the risk becomes real.",
  },
  mitigation: {
    label: "Mitigation",
    description:
      "The practical step that reduces the risk or gives you a recovery path.",
  },
  highestRisk: {
    label: "Highest Risk",
    description:
      "The assumption most likely to break the plan if it turns out to be false.",
  },
  keyAssumptions: {
    label: "Key Assumptions",
    description:
      "The most important guesses this first version relies on.",
  },
  mvpScope: {
    label: "MVP Scope",
    description:
      "What belongs in the first useful version and what is intentionally excluded.",
  },
  suggestedStack: {
    label: "Suggested Stack",
    description:
      "The recommended tools and services for building the first version.",
  },
  aiPrompts: {
    label: "AI Prompts",
    description:
      "Builder-ready instructions and guardrails you can give to a coding agent.",
  },
  nextPrompt: {
    label: "Next Prompt",
    description:
      "The first prompt to paste into a coding tool to begin implementation.",
  },
  aiBuildGuardrails: {
    label: "AI Build Guardrails",
    description:
      "Rules that keep the coding agent focused, scoped, and safe while it builds.",
  },
  aiFriendlyBuildSequence: {
    label: "AI-Friendly Build Sequence",
    description:
      "Small, testable build chunks ordered so an AI coding tool can make steady progress.",
  },
  userStoriesAcceptanceCriteria: {
    label: "User Stories & Acceptance Criteria",
    description:
      "User-centered tasks paired with pass/fail checks for confirming the behavior works.",
  },
  waysToStandOut: {
    label: "Ways to Stand Out",
    description:
      "Specific product or positioning choices that could make users choose this over alternatives.",
  },
  hardToCopy: {
    label: "What Makes It Hard to Copy",
    description:
      "The parts of the product or go-to-market motion that could become difficult for competitors to replicate.",
  },
  firstVersionFocus: {
    label: "First Version Focus",
    description:
      "The narrowest initial product path that can prove whether the idea has traction.",
  },
} as const

export type ExplainableTermKey = keyof typeof EXPLAINABLE_TERMS

const LABEL_TO_TERM_KEY: Record<string, ExplainableTermKey> = {
  "acceptance criteria": "acceptanceCriteria",
  "agent roles": "agents",
  "agents": "agents",
  "ai build guardrails": "aiBuildGuardrails",
  "ai prompts": "aiPrompts",
  "ai-friendly build sequence": "aiFriendlyBuildSequence",
  "assumptions": "assumptions",
  "dependencies": "dependencies",
  "differentiator": "differentiator",
  "est. duration": "timelineMilestones",
  "first version focus": "firstVersionFocus",
  "functional requirements": "functionalRequirements",
  "gap analysis": "gapAnalysis",
  "highest risk": "highestRisk",
  "impact": "impact",
  "key assumptions": "keyAssumptions",
  "key edge": "differentiator",
  "mitigation": "mitigation",
  "mvp scope": "mvpScope",
  "next prompt": "nextPrompt",
  "non-functional requirements": "nonFunctionalRequirements",
  "positioning map": "positioningMap",
  "project size": "projectSize",
  "riskiest assumption": "riskiestAssumption",
  "risks & mitigation": "risksMitigation",
  "risks, dependencies & open questions": "risksDependenciesOpenQuestions",
  "size": "projectSize",
  "success metrics": "successMetrics",
  "suggested stack": "suggestedStack",
  "team": "agents",
  "team composition": "agents",
  "team members": "teamMembers",
  "technical considerations": "technicalConsiderations",
  "timeline & milestones": "timelineMilestones",
  "user stories & acceptance criteria": "userStoriesAcceptanceCriteria",
  "validation plan": "validationPlan",
  "ways to stand out": "waysToStandOut",
  "what makes it hard to copy": "hardToCopy",
}

function normalizeTermLabel(label: string) {
  return label.trim().replace(/\s+/g, " ").toLowerCase()
}

export function getExplainableTerm(key: ExplainableTermKey) {
  return EXPLAINABLE_TERMS[key]
}

export function getExplainableTermKeyByLabel(label: string) {
  return LABEL_TO_TERM_KEY[normalizeTermLabel(label)]
}

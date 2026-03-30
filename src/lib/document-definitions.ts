import type { ElementType } from "react"
import {
  Code,
  FileText,
  LayoutGrid,
  Megaphone,
  PenLine,
  Rocket,
  Search,
  Target,
} from "lucide-react"

export const DOCUMENT_TYPES = [
  "prompt",
  "competitive",
  "prd",
  "mvp",
  "mockups",
  "techspec",
  "deploy",
  "launch",
] as const

export type DocumentType = typeof DOCUMENT_TYPES[number]

export interface DocumentDefinition {
  type: DocumentType
  label: string
  title: string
  subtitle: string
  description: string
  icon: ElementType
  creditCost: number
  showInNav?: boolean
}

export const DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  {
    type: "prompt",
    label: "Explain the idea",
    title: "Explain the idea",
    subtitle: "Define your project requirements and goals",
    description: "",
    icon: PenLine,
    creditCost: 0,
    showInNav: true,
  },
  {
    type: "competitive",
    label: "Competitive Research",
    title: "Competitive Research",
    subtitle: "Market analysis and competitor insights",
    description: "",
    icon: Search,
    creditCost: 10,
    showInNav: true,
  },
  {
    type: "prd",
    label: "PRD",
    title: "PRD",
    subtitle: "Product requirements document",
    description: "",
    icon: FileText,
    creditCost: 10,
    showInNav: true,
  },
  {
    type: "mvp",
    label: "MVP Plan",
    title: "MVP Plan",
    subtitle: "Minimum viable product development plan",
    description: "",
    icon: Target,
    creditCost: 10,
    showInNav: true,
  },
  {
    type: "mockups",
    label: "Mockups",
    title: "Mockups",
    subtitle: "Interactive UI mockups showing information architecture",
    description: "",
    icon: LayoutGrid,
    creditCost: 30,
    showInNav: true,
  },
  {
    type: "techspec",
    label: "Tech Spec",
    title: "Tech Spec",
    subtitle: "Technical specifications and architecture",
    description: "",
    icon: Code,
    creditCost: 15,
    showInNav: false,
  },
  {
    type: "deploy",
    label: "Deploy",
    title: "Deploy",
    subtitle: "Generate and deploy your application",
    description: "",
    icon: Rocket,
    creditCost: 5,
    showInNav: false,
  },
  {
    type: "launch",
    label: "Marketing",
    title: "Marketing",
    subtitle: "Generate launch plan and distribution copy",
    description: "",
    icon: Megaphone,
    creditCost: 5,
    showInNav: true,
  },
] satisfies DocumentDefinition[]

export const DOCUMENT_DEFINITION_MAP = Object.fromEntries(
  DOCUMENT_DEFINITIONS.map((definition) => [definition.type, definition])
) as Record<DocumentType, DocumentDefinition>

export const NAV_DOCUMENT_DEFINITIONS = DOCUMENT_DEFINITIONS.filter(
  (definition) => definition.showInNav !== false
)

export function isDocumentType(value: string | null | undefined): value is DocumentType {
  return typeof value === "string" && DOCUMENT_TYPES.includes(value as DocumentType)
}

export function getDocumentDefinition(type: DocumentType): DocumentDefinition {
  return DOCUMENT_DEFINITION_MAP[type]
}

/** Ordered list of document types for Generate All pipeline */
export const GENERATE_ALL_QUEUE_ORDER: DocumentType[] = [
  "competitive",
  "prd",
  "mvp",
  "mockups",
  "launch",
]

/** Default AI models for each Generate All document type */
export const GENERATE_ALL_DEFAULT_MODELS: Record<string, string> = {
  competitive: "x-ai/grok-4-1-fast",
  prd: "x-ai/grok-4-1-fast",
  mvp: "x-ai/grok-4-1-fast",
  mockups: "x-ai/grok-4-1-fast",
  launch: "x-ai/grok-4-1-fast",
}

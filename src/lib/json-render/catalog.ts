import { defineCatalog } from "@json-render/core"
import { schema } from "@json-render/react/schema"
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog"

// Type assertion needed: @json-render/shadcn uses zod 4 types internally,
// but our project uses zod 3.25. The runtime is compatible — only types mismatch.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defs = shadcnComponentDefinitions as Record<string, any>

/**
 * Component catalog for AI mockup generation.
 * Defines which UI components the LLM is allowed to generate.
 * Uses the shadcn preset for components that match our design system.
 */
export const mockupCatalog = defineCatalog(schema, {
  components: {
    // Layout
    Stack: defs.Stack,
    Grid: defs.Grid,
    Separator: defs.Separator,

    // Containers
    Card: defs.Card,
    Tabs: defs.Tabs,
    Accordion: defs.Accordion,
    Collapsible: defs.Collapsible,

    // Typography
    Heading: defs.Heading,
    Text: defs.Text,

    // Data display
    Table: defs.Table,
    Badge: defs.Badge,
    Avatar: defs.Avatar,
    Progress: defs.Progress,
    Alert: defs.Alert,

    // Form elements
    Input: defs.Input,
    Textarea: defs.Textarea,
    Select: defs.Select,
    Checkbox: defs.Checkbox,
    Radio: defs.Radio,
    Switch: defs.Switch,
    Slider: defs.Slider,

    // Actions
    Button: defs.Button,
    Link: defs.Link,
    DropdownMenu: defs.DropdownMenu,
    ButtonGroup: defs.ButtonGroup,

    // Navigation
    Pagination: defs.Pagination,

    // Media
    Image: defs.Image,

    // Feedback
    Skeleton: defs.Skeleton,
    Spinner: defs.Spinner,
    Tooltip: defs.Tooltip,
  },
  actions: {},
})

/**
 * Generate the system prompt for mockup generation.
 * Includes the full component catalog so the LLM knows what's available.
 */
export function getMockupSystemPrompt(projectName: string): string {
  return mockupCatalog.prompt({
    system: [
      `You are an expert UI/UX designer creating interactive mockups for "${projectName}".`,
      "Generate structured JSON specs that will be rendered as real UI components.",
      "Focus on creating realistic, practical page layouts that developers can reference.",
    ].join(" "),
    customRules: [
      "Use Card as the outermost container for each page section",
      "Use Stack with direction='vertical' for page-level layout",
      "Use Stack with direction='horizontal' for rows of elements",
      "Use Grid for multi-column layouts (2-4 columns)",
      "Use Heading for page titles (h1) and section titles (h2, h3)",
      "Use Text for body content, descriptions, and labels",
      "Use realistic placeholder text — not lorem ipsum",
      "Include navigation elements where appropriate (Button, Link)",
      "Show form elements with realistic labels and placeholders",
      "Use Badge for status indicators and tags",
      "Use Table for data-heavy sections",
      "Keep the layout clean and professional",
    ],
  })
}

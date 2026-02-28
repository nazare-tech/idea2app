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
      `You are a UI/UX wireframe designer creating low-fidelity wireframes for "${projectName}".`,
      "Generate JSON specs that show PAGE STRUCTURE and LAYOUT — not detailed content.",
      "Think like a whiteboard sketch: show where things go, not what they say.",
    ].join(" "),
    customRules: [
      "WIREFRAME STYLE: Use short labels (1-3 words), not paragraphs of text",
      "Use Stack with direction='vertical' as the root layout for each page",
      "Use Stack with direction='horizontal' for navigation bars and button rows",
      "Use Card to group related sections (e.g., 'Hero Section', 'Features', 'Pricing')",
      "Use Grid for multi-column layouts (2-3 columns)",
      "Use Heading for section titles only — keep them brief (e.g., 'Features', 'Pricing')",
      "Use Text sparingly — short descriptions of what content goes there (e.g., 'Product description')",
      "Use Skeleton to represent images, banners, and media placeholders",
      "Use Input/Select/Textarea for form wireframes with short labels",
      "Use Button with short labels ('Submit', 'Sign Up', 'Learn More')",
      "Use Badge for status labels ('New', 'Pro', 'Active')",
      "Keep pages minimal: 8-20 elements — focus on layout hierarchy, not every detail",
    ],
  })
}

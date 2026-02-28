import { defineRegistry } from "@json-render/react"
import { shadcnComponents } from "@json-render/shadcn"
import { mockupCatalog } from "./catalog"

// Type assertion needed: same zod 3 vs 4 type mismatch as catalog.ts.
// Runtime is fully compatible.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const comps = shadcnComponents as Record<string, any>

/**
 * Registry mapping the mockup catalog to shadcn/ui React component implementations.
 * These are the pre-built shadcn components from @json-render/shadcn.
 */
export const { registry: mockupRegistry } = defineRegistry(mockupCatalog, {
  components: {
    // Layout
    Stack: comps.Stack,
    Grid: comps.Grid,
    Separator: comps.Separator,

    // Containers
    Card: comps.Card,
    Tabs: comps.Tabs,
    Accordion: comps.Accordion,
    Collapsible: comps.Collapsible,

    // Typography
    Heading: comps.Heading,
    Text: comps.Text,

    // Data display
    Table: comps.Table,
    Badge: comps.Badge,
    Avatar: comps.Avatar,
    Progress: comps.Progress,
    Alert: comps.Alert,

    // Form elements
    Input: comps.Input,
    Textarea: comps.Textarea,
    Select: comps.Select,
    Checkbox: comps.Checkbox,
    Radio: comps.Radio,
    Switch: comps.Switch,
    Slider: comps.Slider,

    // Actions
    Button: comps.Button,
    Link: comps.Link,
    DropdownMenu: comps.DropdownMenu,
    ButtonGroup: comps.ButtonGroup,

    // Navigation
    Pagination: comps.Pagination,

    // Media
    Image: comps.Image,

    // Feedback
    Skeleton: comps.Skeleton,
    Spinner: comps.Spinner,
    Tooltip: comps.Tooltip,
  },
})

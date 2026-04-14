import { getMockupSystemPrompt } from "@/lib/json-render/catalog"
import { sanitizeInput } from "./sanitize"

/**
 * System prompt for the OpenRouter → Stitch prompt generation step.
 * google/gemini-3.1-pro-preview uses this to convert an MVP plan into
 * a precise, product-specific design brief for the Stitch SDK.
 */
export const STITCH_PROMPT_ENGINEER_SYSTEM_PROMPT = `You are a specialized prompt engineer that converts MVP (Minimum Viable Product) documents into precise, well-structured prompts for Google's Stitch SDK to generate UI designs.

## YOUR ROLE
You analyze AI-generated MVP documents and produce a single, optimized Stitch prompt that will result in high-quality UI generation for the product's core screen.

## INPUT
You will receive an MVP document containing some combination of:
- Product description / vision
- Target users and personas
- Core features and user flows
- Technical requirements
- Business goals

## YOUR PROCESS

### Step 1: Extract Product Essence
Identify and silently note:
- **Product type** (e.g., social app, productivity tool, marketplace, dashboard, content platform)
- **Primary user action** (the ONE thing users do most)
- **Target audience** (demographic, expertise level, context of use)
- **Brand personality** (playful, professional, minimal, bold, trustworthy)

### Step 2: Determine Platform (Mobile vs Web)
Apply this decision framework:

**Choose MOBILE when:**
- Primary use is on-the-go, location-based, or contextual (camera, GPS, notifications)
- Sessions are short and frequent (social, messaging, quick tasks)
- Target users are consumers in personal contexts
- Core interactions favor touch (swipe, tap, pinch)
- Examples: social networks, fitness trackers, food delivery, ride-sharing, dating

**Choose WEB when:**
- Primary use involves complex data, multi-column layouts, or extended sessions
- Heavy text input, file management, or multi-tasking is required
- B2B, admin, analytics, or content-creation focused
- Users need keyboard shortcuts and large screen real estate
- Examples: dashboards, CRMs, project management, design tools, analytics platforms

**When ambiguous:** Default to mobile for B2C, web for B2B. State your reasoning briefly.

### Step 3: Identify the Core Screen
The core screen is where users spend ~70% of their time and which delivers the primary value. It is NOT the login, onboarding, or settings screen. Ask: "If a user opened this app once, which screen would convince them to come back?"

Common patterns:
- Social → Feed
- Marketplace → Browse/Search results
- Productivity → Main workspace/list view
- Dashboard → Overview with key metrics
- Content → Player/Reader view
- Tool → Editor/Canvas

### Step 4: Construct the Stitch Prompt
Output a prompt following this exact structure:

---

**Platform:** [Mobile / Web]

**Screen:** [Specific screen name, e.g., "Home Feed", "Project Dashboard"]

**Product Context:** [1-2 sentences describing what the app does and for whom]

**Layout Description:**
[Detailed paragraph describing the visual hierarchy from top to bottom, naming each component and its purpose. Be specific about navigation patterns (bottom tab bar, sidebar, top nav), content density, and key interactive elements.]

**Key Components:** [Bulleted list of 5-10 specific UI elements that MUST appear, e.g., "Search bar with filter icon", "Card with image/title/metadata", "Floating action button for create"]

**Visual Style:** [3-5 descriptors covering color palette direction, typography feel, spacing, and overall mood — e.g., "Clean and minimal, generous whitespace, sans-serif typography, soft neutral palette with one accent color, subtle shadows"]

**Content Examples:** [Realistic placeholder content reflecting the actual product domain — not "Lorem ipsum". Include 3-5 sample items/entries the user would actually see.]

---

## RULES

1. **One prompt only.** Do not offer alternatives or variations unless explicitly asked.
2. **Be specific, not generic.** "Card with podcast episode title, host name, duration, and play button" beats "content card".
3. **Avoid Stitch anti-patterns:** Don't request more than one core screen, don't mix mobile and web in one prompt, don't over-specify pixel dimensions or hex colors (let Stitch interpret style descriptors).
4. **Ground content in the product.** If the MVP is for a plant care app, sample content should be plant names, watering schedules — never generic placeholders.
5. **Keep visual style aligned with audience.** A finance tool for institutional traders ≠ a finance tool for Gen Z.
6. **If the MVP is incomplete,** make reasonable inferences and note assumptions in a brief "Assumptions:" line at the end.

## OUTPUT FORMAT
Return only the Stitch prompt in the structure above. Do not include preamble, explanations of your reasoning, or commentary — unless assumptions were necessary.`

export function buildMockupPrompt(mvpPlan: string, projectName: string): string {
  const fence = "```"
  const safeName = sanitizeInput(projectName, 200)
  const safePlan = sanitizeInput(mvpPlan, 50000)
  const catalogPrompt = getMockupSystemPrompt(safeName)

  return [
    catalogPrompt,
    "",
    "---",
    "",
    `**Product Name:** <user_input name="projectName">${safeName}</user_input>`,
    "**MVP Plan:**",
    `<user_input name="mvpPlan">${safePlan}</user_input>`,
    "",
    "## Your Task",
    "",
    "Create WIREFRAME mockups for **one key screen** from the MVP plan above.",
    "Generate exactly **3 distinct options** (Option A, Option B, Option C) for the SAME core task/screen.",
    "All three options must be different in information architecture and layout strategy while keeping scope constant.",
    "",
    "For each option, include ALL of this:",
    "1. Option heading",
    "2. `Pros:` section (2-4 short bullets)",
    "3. `Cons:` section (2-4 short bullets)",
    "4. ONE complete json-render spec",
    "",
    "## Required Scope",
    "",
    "- Do NOT generate Homepage, Key Feature Pages, Dashboard, etc. as separate screens.",
    "- Do NOT generate more or fewer than 3 options.",
    "- Keep all options focused on the same core user task/screen.",
    "- Use the same concise scope and component constraints for each option.",
    "- Pros/Cons must be meaningful and option-specific (no generic text like \"Tradeoffs were not provided\").",
    "- Each option’s Pros/Cons must reference concrete layout choices in that option (structure, interaction pattern, density, hierarchy).",
    "",
    "## Wireframe Design Principles",
    "",
    "CRITICAL: Your wireframes must look like REAL app layouts — not a narrow list of components stacked vertically.",
    "",
    "### Layout Rules",
    "- Every major section (nav, hero, features, footer) must SPAN THE FULL WIDTH of the page",
    "- Use Grid (columns=2 or columns=3) to arrange Cards SIDE BY SIDE — never stack narrow cards vertically when they can go in a grid",
    "- Dashboard-like content: use Grid with columns=3 or columns=4 for stat cards, then Grid columns=2 for main content + sidebar",
    "- Navigation: horizontal Stack with logo left, links center, buttons right — spanning full width",
    "- Hero sections: full-width Card containing heading, description, and CTA buttons",
    "- Feature sections: Grid with columns=3 containing feature Cards side by side",
    "- Forms: wrap in a full-width Card, use Grid columns=2 for side-by-side input fields",
    "",
    "### Content Rules",
    "- Use SHORT labels only (1-3 words): 'Sign Up', 'Search', 'Dashboard', 'Save'",
    "- Headings should be brief page/section titles: 'Hero', 'Features', 'Pricing'",
    "- Text elements describe WHAT goes there: 'Tagline', 'Feature description', 'Action prompt'",
    "- Use Skeleton for images/media placeholders",
    "- Keep forms minimal: input fields with short placeholder labels",
    "- Tables: 3-4 columns with short headers, inside full-width Cards",
    "- Aim for 15-30 elements per page",
    "",
    "## CRITICAL OUTPUT FORMAT",
    "Return EXACTLY this pattern, in this order, for all 3 options:",
    "",
    "- Heading",
    "- Pros: with 2-4 bullets",
    "- Cons: with 2-4 bullets",
    "- ONE complete json-render code block",
    "- Do not emit extra text, preambles, summaries, markdown, or duplicate sections.",
    "- Keep Option headings in this exact form: `### Option A - <short name>` (then B and C).",
    "- Use 2-4 bullet items for Pros and 2-4 for Cons (no placeholders, no empty bullets).",
    "### Option A - [short name]",
    "Pros:",
    "- [specific benefit tied to this wireframe]",
    "- [specific benefit tied to this wireframe]",
    "Cons:",
    "- [specific tradeoff tied to this wireframe]",
    "- [specific tradeoff tied to this wireframe]",
    `${fence}json`,
    '{',
    '  "root": "root",',
    '  "elements": {',
    '    "root": {',
    '      "type": "Stack",',
    '      "props": { "direction": "vertical", "gap": "lg" },',
    '      "children": ["top-nav", "hero", "feature-grid", "cta"]',
    '    },',
    '    "top-nav": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "md", "align": "center", "justify": "between" },',
    '      "children": ["logo", "nav-links", "primary-action"]',
    '    },',
    '    "logo": { "type": "Heading", "props": { "text": "AppName", "level": "h3" }, "children": [] },',
    '    "nav-links": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "sm" },',
    '      "children": ["link-home", "link-feature", "link-pricing"]',
    '    },',
    '    "link-home": { "type": "Button", "props": { "label": "Home", "variant": "ghost" }, "children": [] },',
    '    "link-feature": { "type": "Button", "props": { "label": "Features", "variant": "ghost" }, "children": [] },',
    '    "link-pricing": { "type": "Button", "props": { "label": "Pricing", "variant": "ghost" }, "children": [] },',
    '    "primary-action": { "type": "Button", "props": { "label": "Get Started" }, "children": [] },',
    '    "hero": {',
    '      "type": "Card",',
    '      "props": { "title": "Hero" },',
    '      "children": ["hero-image", "hero-copy", "hero-cta"]',
    '    },',
    '    "hero-image": { "type": "Skeleton", "props": { "height": "180px" }, "children": [] },',
    '    "hero-copy": { "type": "Text", "props": { "text": "Primary value proposition" }, "children": [] },',
    '    "hero-cta": { "type": "Button", "props": { "label": "Try it now" }, "children": [] },',
    '    "feature-grid": {',
    '      "type": "Grid",',
    '      "props": { "columns": 3, "gap": "md" },',
    '      "children": ["feature-one", "feature-two", "feature-three"]',
    '    },',
    '    "feature-one": { "type": "Card", "props": { "title": "Feature One" }, "children": [] },',
    '    "feature-two": { "type": "Card", "props": { "title": "Feature Two" }, "children": [] },',
    '    "feature-three": { "type": "Card", "props": { "title": "Feature Three" }, "children": [] },',
    '    "cta": { "type": "Card", "props": { "title": "Next step" }, "children": ["cta-text", "cta-btn"] },',
    '    "cta-text": { "type": "Text", "props": { "text": "Primary action here" }, "children": [] },',
    '    "cta-btn": { "type": "Button", "props": { "label": "Continue" }, "children": [] }',
    '  }',
    '}',
    `${fence}`,
    "",
    "### Option B - [short name]",
    "Pros:",
    "- [short bullet]",
    "- [short bullet]",
    "Cons:",
    "- [trade-off]",
    "- [trade-off]",
    `${fence}json`,
    '{',
    '  "root": "root",',
    '  "elements": {',
    '    "root": {',
    '      "type": "Stack",',
    '      "props": { "direction": "vertical", "gap": "lg" },',
    '      "children": ["top-nav", "content-shell", "stats-row", "footer"]',
    '    },',
    '    "top-nav": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "justify": "between", "align": "center" },',
    '      "children": ["brand", "main-links", "secondary-action"]',
    '    },',
    '    "brand": { "type": "Heading", "props": { "text": "AppName", "level": "h3" }, "children": [] },',
    '    "main-links": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "sm" },',
    '      "children": ["link-dashboard", "link-billing", "link-help"]',
    '    },',
    '    "link-dashboard": { "type": "Button", "props": { "label": "Dashboard", "variant": "outline" }, "children": [] },',
    '    "link-billing": { "type": "Button", "props": { "label": "Billing", "variant": "outline" }, "children": [] },',
    '    "link-help": { "type": "Button", "props": { "label": "Help", "variant": "outline" }, "children": [] },',
    '    "secondary-action": { "type": "Button", "props": { "label": "New" }, "children": [] },',
    '    "content-shell": { "type": "Grid", "props": { "columns": 2, "gap": "md" }, "children": ["left-panel", "right-panel"] },',
    '    "left-panel": { "type": "Card", "props": { "title": "Main Flow" }, "children": ["flow-heading", "flow-table"] },',
    '    "flow-heading": { "type": "Heading", "props": { "text": "Flow", "level": "h4" }, "children": [] },',
    '    "flow-table": {',
    '      "type": "Table",',
    '      "props": { "headers": ["Item", "Status", "Owner"] },',
    '      "children": []',
    '    },',
    '    "right-panel": {',
    '      "type": "Card",',
    '      "props": { "title": "Details" },',
    '      "children": ["form-grid", "save-btn"]',
    '    },',
    '    "form-grid": { "type": "Grid", "props": { "columns": 2, "gap": "sm" }, "children": ["input-name", "input-date", "input-owner", "input-priority"] },',
    '    "input-name": { "type": "Input", "props": { "label": "Title", "placeholder": "Search projects" }, "children": [] },',
    '    "input-date": { "type": "Input", "props": { "label": "Date", "placeholder": "MM/DD/YYYY" }, "children": [] },',
    '    "input-owner": { "type": "Input", "props": { "label": "Owner", "placeholder": "Owner name" }, "children": [] },',
    '    "input-priority": { "type": "Select", "props": { "label": "Priority" }, "children": [] },',
    '    "save-btn": { "type": "Button", "props": { "label": "Save" }, "children": [] },',
    '    "stats-row": {',
    '      "type": "Grid",',
    '      "props": { "columns": 3, "gap": "md" },',
    '      "children": ["stat-1", "stat-2", "stat-3"]',
    '    },',
    '    "stat-1": { "type": "Card", "props": { "title": "Active" }, "children": [] },',
    '    "stat-2": { "type": "Card", "props": { "title": "Completed" }, "children": [] },',
    '    "stat-3": { "type": "Card", "props": { "title": "Upcoming" }, "children": [] },',
    '    "footer": { "type": "Text", "props": { "text": "Last updated 2m ago" }, "children": [] }',
    '  }',
    '}',
    `${fence}`,
    "",
    "### Option C - [short name]",
    "Pros:",
    "- [short bullet]",
    "- [short bullet]",
    "Cons:",
    "- [trade-off]",
    "- [trade-off]",
    `${fence}json`,
    '{',
    '  "root": "root",',
    '  "elements": {',
    '    "root": {',
    '      "type": "Stack",',
    '      "props": { "direction": "vertical", "gap": "md" },',
    '      "children": ["hero", "tool-row", "detail-surface", "action-bar"]',
    '    },',
    '    "hero": {',
    '      "type": "Card",',
    '      "props": { "title": "Primary Workflow" },',
    '      "children": ["hero-title", "hero-subtitle", "hero-media"]',
    '    },',
    '    "hero-title": { "type": "Heading", "props": { "text": "Your screen title", "level": "h2" }, "children": [] },',
    '    "hero-subtitle": { "type": "Text", "props": { "text": "Quick summary text" }, "children": [] },',
    '    "hero-media": { "type": "Skeleton", "props": { "height": "160px" }, "children": [] },',
    '    "tool-row": {',
    '      "type": "Grid",',
    '      "props": { "columns": 3, "gap": "md" },',
    '      "children": ["tool-search", "tool-filter", "tool-sort"]',
    '    },',
    '    "tool-search": { "type": "Input", "props": { "label": "Search", "placeholder": "Find item" }, "children": [] },',
    '    "tool-filter": { "type": "Select", "props": { "label": "Filter" }, "children": [] },',
    '    "tool-sort": { "type": "Select", "props": { "label": "Sort" }, "children": [] },',
    '    "detail-surface": {',
    '      "type": "Card",',
    '      "props": { "title": "Details" },',
    '      "children": ["detail-left", "detail-right"]',
    '    },',
    '    "detail-left": {',
    '      "type": "Stack",',
    '      "props": { "direction": "vertical", "gap": "sm" },',
    '      "children": ["detail-head", "detail-body", "detail-body-2"]',
    '    },',
    '    "detail-right": {',
    '      "type": "Stack",',
    '      "props": { "direction": "vertical", "gap": "sm" },',
    '      "children": ["detail-note", "detail-note-2"]',
    '    },',
    '    "detail-head": { "type": "Heading", "props": { "text": "Current item", "level": "h4" }, "children": [] },',
    '    "detail-body": { "type": "Text", "props": { "text": "Item details go here" }, "children": [] },',
    '    "detail-body-2": { "type": "Text", "props": { "text": "Additional context" }, "children": [] },',
    '    "detail-note": { "type": "Badge", "props": { "text": "Draft" }, "children": [] },',
    '    "detail-note-2": { "type": "Badge", "props": { "text": "Priority" }, "children": [] },',
    '    "action-bar": {',
    '      "type": "Grid",',
    '      "props": { "columns": 2, "gap": "sm" },',
    '      "children": ["action-primary", "action-secondary"]',
    '    },',
    '    "action-primary": { "type": "Button", "props": { "label": "Confirm" }, "children": [] },',
    '    "action-secondary": { "type": "Button", "props": { "label": "Cancel", "variant": "outline" }, "children": [] },',
    '  }',
    '}',
    `${fence}`,
    "",
    "",
    "## Rules",
    "",
    "- IMPORTANT: Do NOT use JSON Patch format ({\"op\":\"add\",\"path\":...}) — output complete JSON objects only",
    "- Each JSON block must be a COMPLETE, self-contained json-render spec with `root` and `elements` at the top level. Each must include valid component IDs and references.",
    "- Every element must have `type`, `props`, and `children` (even if children is empty []).",
    "- Use short descriptive IDs (e.g., 'nav', 'hero', 'sidebar', 'form-section').",
    "- WIREFRAME RULE: Keep ALL text short — labels (1-3 words), descriptions (3-6 words max)",
    "- Use Skeleton for image/media placeholders instead of Image components",
    "- Only use component types from the catalog above",
    "- Use Stack (direction='vertical') as the root element for each page.",
    "- LAYOUT RULE: Use Grid (columns=2 or columns=3) to arrange Cards side by side — NEVER stack all Cards vertically when a grid can satisfy the same content density.",
    "- LAYOUT RULE: Nav bars must use horizontal Stack with justify='between' to span full width",
    "- LAYOUT RULE: Dashboard pages need Grid layouts for stats and content areas — not a vertical list",
    "- Do NOT use advanced features like $state, $bindState, $template, visible conditions, or repeat — keep specs static.",
    "- Keep each page spec focused: 15-30 elements for realistic layouts.",
    "- Avoid placeholder or repetitive pros/cons; each bullet should be specific to the option and its tradeoffs.",
  ].join("\n")
}

# Coding Conventions
Coding conventions: kebab-case file names, PascalCase components, camelCase functions, UPPER_SNAKE_CASE constants, and {ComponentName}Props interface naming.
Component structure templates: CVA variant UI components (cva plus cn from @/lib/utils), "use client" interactive components, and async server components.
API route pattern: createClient from @/lib/supabase/server, auth.getUser() 401 check, body validation 400, try/catch 500, and { error } JSON responses.
Styling tokens from globals.css: bg-primary #DC2626, bg-background #FAFAFA, text-text-secondary #666666, text-muted-foreground #6B7280, sidebar-* dark tokens.
Status badge colors (success green, info blue) and markdown renderer hard-coded #00d4ff cyan and #7c3aed purple for code and Mermaid blocks.
Error handling status codes (401/402/404/400/500), frontend fetch try/catch, TypeScript unions AnalysisType and DocumentType, const assertions, @/* path aliases.
---

## 5. Coding Conventions

### File Naming

- **Pages**: `page.tsx` (Next.js convention)
- **Dynamic Routes**: `[id]/page.tsx`, `[type]/route.ts`
- **API Routes**: `route.ts` in endpoint folder
- **Components**: `kebab-case.tsx` (e.g., `dashboard-project-card.tsx`)
- **Utilities**: `kebab-case.ts` (e.g., `openrouter.ts`)
- **Types**: `database.ts`, lowercase

### Code Naming

```typescript
// Components: PascalCase
export function ChatInterface() {}
export default function LoginPage() {}

// Variables & functions: camelCase
const projectId = "..."
const [loading, setLoading] = useState(false)
async function handleSubmit() {}

// Constants: UPPER_SNAKE_CASE
const BASE_ACTION_TOKENS = { ... }
const ANALYSIS_PROMPTS = { ... }

// Props interfaces: {ComponentName}Props
interface ChatInterfaceProps { ... }
interface AnalysisPanelProps { ... }

// Type aliases: PascalCase or lowercase
type AnalysisType = 'competitive-analysis' | 'prd' | 'mvp-plan' | 'tech-spec'
type DocumentType = 'prompt' | 'competitive' | 'prd' | 'mvp' | 'mockups' | 'techspec' | 'deploy'
```

### Component Structure

#### UI Components (with CVA variants)
```typescript
// Pattern: components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: { default: "...", outline: "..." },
      size: { default: "...", sm: "...", lg: "..." },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
```

#### Client Components (Interactive)
```typescript
"use client"

import { useState } from "react"

interface Props {
  projectId: string
}

export function ChatInterface({ projectId }: Props) {
  const [state, setState] = useState()

  const handleAction = async () => {
    // Logic here
  }

  return <div>{/* JSX */}</div>
}
```

#### Server Components (Data Fetching)
```typescript
// No "use client" directive

import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()

  // Fetch data at server level
  const { data } = await supabase.from("table").select()

  return <ClientComponent data={data} />
}
```

#### API Routes
```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request
    const body = await request.json()

    // Validation
    if (!body.field) {
      return NextResponse.json({ error: "Missing field" }, { status: 400 })
    }

    // Business logic
    const result = await doSomething()

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

### Styling Conventions

#### Tailwind Utility Classes
```typescript
// Use cn() utility for class merging
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className  // Allow className override
)} />
```

#### Color Palette (Pencil Design System)

The app uses CSS custom properties (defined in `globals.css`) rather than hard-coded Tailwind colours. Use the semantic tokens below:

```typescript
// Primary action colour
"bg-primary"                    // #DC2626 (red)
"text-primary-foreground"       // #FFFFFF

// Backgrounds & surfaces
"bg-background"                 // #FAFAFA (main page)
"bg-card"                       // #FFFFFF (content cards)
"bg-secondary"                  // #F5F5F5 (inputs, sub-surfaces)

// Text hierarchy (all pass WCAG AA on white)
"text-foreground"               // #000000 (primary body text)
"text-text-secondary"           // #666666 (5.74:1 on white) — labels, captions
"text-muted-foreground"         // #6B7280 (4.61:1 on white) — subtitles, placeholders, hints
"text-text-muted"               // #6B7280 — same token via CSS var

// Sidebar (dark theme — always use sidebar-* tokens)
"bg-sidebar-bg"                 // #000000
"text-sidebar-foreground"       // #FAFAFA
"text-sidebar-muted"            // #999999 (sidebar is dark, so this passes on #000)
"border-sidebar-border"         // #222222

// Status badges
"text-success / bg-success-bg"  // Green (#22C55E / #ECFDF5) — Done
"text-info / bg-info-bg"        // Blue  (#3B82F6 / #EFF6FF) — In Progress

// Markdown renderer (dark-themed prose, used inside content cards)
// Still uses hard-coded colours for code/Mermaid blocks:
"#00d4ff"  // Cyan — code highlights, links, Mermaid primary
"#7c3aed"  // Purple — Mermaid secondary
```

### Error Handling

#### API Error Responses
```typescript
// Status codes
401 - Unauthorized (not logged in)
402 - Payment Required (plan limit reached or legacy internal credit failure)
404 - Not Found
400 - Bad Request (validation error)
500 - Internal Server Error

// Response format
{ error: "User-friendly error message" }
```

#### Frontend Error Handling
```typescript
try {
  const response = await fetch("/api/endpoint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Request failed")
  }

  // Handle success
} catch (err) {
  setError(err instanceof Error ? err.message : "An error occurred")
}
```

### TypeScript Patterns

```typescript
// Explicit prop types
interface ComponentProps {
  projectId: string
  onComplete?: () => void
}

// Type unions for specific values
type AnalysisType = 'competitive-analysis' | 'prd' | 'mvp-plan' | 'tech-spec'
type DocumentType = 'prompt' | 'competitive' | 'prd' | 'mvp' | 'mockups' | 'techspec' | 'deploy'

// Const assertions for immutable objects
const COSTS = {
  chat: 1,
  analysis: 5,
} as const

// Generic utility types
type Nullable<T> = T | null
```

### Path Aliases

```typescript
// tsconfig.json paths
"@/*": ["./src/*"]

// Usage
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/database"
```

---


# PROJECT_CONTEXT.md

**Last Updated**: 2026-02-02
**Project**: Idea2App - AI-Powered Business Analysis Platform

---

## 1. Project Overview

**Idea2App** is a comprehensive AI-powered SaaS platform that transforms business ideas into reality. It provides an end-to-end solution for entrepreneurs, guiding them from initial concept through to deployment.

### Core Functionality

- **AI-Powered Chat**: Interactive conversation interface to refine business ideas
- **Competitive Analysis**: AI-generated competitive landscape analysis, market positioning, and SWOT analysis
- **Gap Analysis**: Identifies market opportunities and unmet customer needs
- **PRD Generation**: Complete Product Requirements Documents with user personas, features, and release plans
- **Technical Specifications**: Architecture design, technology stack recommendations, and API designs
- **App Generation**: Automated code generation for multiple app types:
  - Static websites (HTML/CSS/JS)
  - Dynamic websites (Next.js)
  - Single Page Applications (React SPAs)
  - Progressive Web Apps (PWA)
- **Deployment**: Direct deployment capabilities for generated applications
- **Credit-based Pricing**: Usage-based model with multiple subscription tiers

### User Workflow

1. User creates a project and describes their business idea
2. User chats with AI to refine and develop the concept
3. User generates various analyses (competitive, gap, PRD, tech specs)
4. User generates a working prototype/application
5. User deploys the generated application

---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.1.4 | Full-stack React framework with App Router |
| **React** | 19.2.3 | UI library with React Server Components |
| **TypeScript** | 5 | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Radix UI** | Various | Unstyled, accessible component primitives |
| **lucide-react** | 0.563.0 | Icon library |
| **class-variance-authority** | 0.7.1 | Type-safe component variants |
| **tailwind-merge** | 3.4.0 | Tailwind class merging utility |
| **react-markdown** | 10.1.0 | Markdown rendering |
| **remark-gfm** | 4.0.1 | GitHub Flavored Markdown support |
| **mermaid** | 11.12.2 | Diagram and flowchart rendering |
| **react-syntax-highlighter** | 16.1.0 | Code syntax highlighting |
| **marked** | 17.0.1 | Markdown-to-HTML (used for PDF export) |
| **jspdf** | 4.0.0 | Client-side PDF generation |
| **html2canvas** | 1.4.1 | HTML-to-canvas rendering (used for PDF) |
| **Sora** | (Google Font) | Primary sans-serif typeface |
| **IBM Plex Mono** | (Google Font) | Monospace typeface for labels/code |

### Backend & Services

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Supabase** | - | PostgreSQL database with auth and RLS |
| **@supabase/supabase-js** | 2.91.1 | Supabase client library |
| **@supabase/ssr** | 0.8.0 | Server-side rendering utilities |
| **Anthropic Claude** | 0.71.2 | AI SDK for app generation |
| **OpenRouter** | 6.16.0 | API wrapper for AI analysis |
| **Stripe** | 20.2.0 | Payment processing and subscriptions |
| **n8n** | - | Workflow automation (webhook integration) |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | ^9 | Code linting |
| **eslint-config-next** | 16.1.4 | Next.js ESLint configuration |
| **@types/node** | ^20 | Node.js type definitions |
| **@types/react** | ^19 | React type definitions |
| **@types/react-dom** | ^19 | React DOM type definitions |

### Build & Runtime

- **Build Tool**: Next.js built-in (Webpack)
- **Dev Server**: Next.js dev server with HMR
- **Package Manager**: npm
- **Runtime**: Node.js (Latest LTS)

---

## 3. Architecture

### High-Level Design Pattern

**Server Components + Client Components (React Server Components Pattern)**

```
┌─────────────────────────────────────┐
│    Client Layer (Browser)           │
│  - React Client Components          │
│  - Supabase Client SDK              │
│  - State management (React hooks)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Next.js Server Layer              │
│  - API Routes (/api/*)              │
│  - Server Components (RSC)          │
│  - Middleware (auth protection)     │
│  - Server Actions                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    Backend Services                 │
│  - Supabase Auth & Database         │
│  - Anthropic Claude API             │
│  - OpenRouter API                   │
│  - Stripe API                       │
│  - n8n Webhooks                     │
└─────────────────────────────────────┘
```

### Data Flow

1. **Authentication Flow**:
   - User logs in via Supabase Auth
   - JWT stored in HTTP-only cookie
   - Middleware validates auth on every request
   - Protected routes redirect unauthorized users

2. **Chat Flow**:
   - Client component sends message to `/api/chat`
   - Server validates auth, checks credits
   - Server calls OpenRouter/Anthropic AI
   - Server saves message to database
   - Response streamed back to client

3. **Analysis Flow**:
   - Client requests analysis (competitive, PRD, or tech spec) from the workspace `ContentEditor`
   - Server checks credits, deducts if available
   - Server calls N8N webhook first, forwarding contextual data:
     - PRD generation receives the latest `competitiveAnalysis` content
     - Tech spec generation receives the latest `prd` content
   - Falls back to OpenRouter if N8N is unconfigured or fails
   - Result saved to the appropriate table (`analyses`, `prds`, or `tech_specs`)
   - Page reloads to surface the new version

4. **App Generation Flow**:
   - Client requests app generation
   - Server validates credits (5 credits required)
   - Server calls Anthropic Claude with project context
   - Claude generates complete app code
   - Server saves deployment record
   - Returns generated code to client

### Workspace Layout (Three-Column)

The project workspace (`/projects/[id]`) uses a three-column layout inspired by Pencil:

```
┌──────────────┬───────────────────┬──────────────────────────────┐
│ ProjectSide- │  DocumentNav      │  ContentEditor               │
│ bar          │  (pipeline steps) │  (active document view)      │
│              │                   │                              │
│ - Project    │  1. Prompt        │  - Header (title, actions)   │
│   list       │  2. Competitive   │  - Version navigation        │
│ - Search     │     Research      │  - Editable prompt / MD view │
│ - New Proj   │  3. PRD           │  - Generate button           │
│ - User info  │  4. Tech Spec     │  - Copy / PDF download       │
│              │  5. Architecture  │                              │
│   (dark bg)  │  6. Deploy        │   (light bg)                 │
└──────────────┴───────────────────┴──────────────────────────────┘
  260px fixed    280px fixed         flex-1 (remaining)
```

- **`ProjectSidebar`** — persistent app-level navigation; lists all user projects, search, sign-out. Dark background (`#000`), rendered server-side and passed to client.
- **`DocumentNav`** — pipeline-step navigation within a single project. Shows status badges (Done / In Progress / Pending) for each document stage.
- **`ContentEditor`** — renders the active document. Handles editing the prompt, triggering generation, displaying rendered Markdown, version switching, copy-to-clipboard, and PDF export.
- **`ProjectWorkspace`** — orchestrator component that connects all three columns. Manages active document state, version selection, and dispatches API calls.

### Key Design Patterns

1. **App Router with Route Groups**: Organized routes with shared layouts using `(group-name)` syntax
2. **Server Components by Default**: Pages default to server components; interactive components explicitly marked `"use client"`
3. **Middleware-based Auth**: Global authentication protection at the middleware level
4. **Credit System with Database Functions**: PostgreSQL stored procedures for atomic credit operations
5. **Multi-Source AI with Fallback**: Primary webhook (N8N) with `prd` / `competitiveAnalysis` context forwarded; fallback to OpenRouter
6. **TypeScript-First**: Strict typing throughout, auto-generated database types
7. **Component Composition**: Radix UI primitives + CVA for variants
8. **Optimistic UI Updates**: Immediate feedback with graceful error handling
9. **Path Aliases**: Clean imports using `@/*` aliases
10. **Pencil Design System**: Light-mode UI with dark sidebar; CSS custom properties for theming; Sora + IBM Plex Mono typography

---

## 4. Key Directories

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (no layout)
│   │   ├── login/page.tsx        # Login page
│   │   ├── signup/page.tsx       # Signup page
│   │   └── callback/route.ts     # OAuth callback handler
│   ├── (dashboard)/              # Dashboard route group (shared layout)
│   │   ├── layout.tsx            # ProjectSidebar + main content layout
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── projects/
│   │   │   ├── page.tsx          # Projects list
│   │   │   ├── new/page.tsx      # Create project
│   │   │   └── [id]/page.tsx     # Project workspace (main app)
│   │   ├── billing/page.tsx      # Billing & subscription plans
│   │   └── settings/page.tsx     # User settings
│   ├── api/                      # API routes
│   │   ├── chat/route.ts         # POST chat messages
│   │   ├── analysis/[type]/route.ts   # POST run analysis (N8N → OpenRouter fallback)
│   │   ├── generate-app/route.ts      # POST generate app code
│   │   ├── projects/[id]/route.ts     # PATCH/GET project details
│   │   └── stripe/
│   │       ├── checkout/route.ts      # Create checkout session
│   │       ├── portal/route.ts        # Customer portal
│   │       └── webhook/route.ts       # Stripe webhooks
│   ├── globals.css               # Global styles + Tailwind
│   ├── page.tsx                  # Landing page
│   └── layout.tsx                # Root layout (fonts, metadata)
│
├── components/                   # React components
│   ├── ui/                       # Reusable UI primitives
│   │   ├── button.tsx            # Button with variants
│   │   ├── card.tsx              # Card layouts
│   │   ├── input.tsx, textarea.tsx, label.tsx
│   │   ├── badge.tsx, avatar.tsx, spinner.tsx
│   │   ├── dropdown-menu.tsx, tabs.tsx  # Radix UI
│   │   ├── markdown-renderer.tsx # Markdown with Mermaid + syntax highlighting
│   │   └── ...
│   ├── layout/                   # Layout components
│   │   ├── sidebar.tsx           # Legacy dashboard sidebar (retained)
│   │   ├── header.tsx            # Legacy dashboard header (retained)
│   │   ├── project-sidebar.tsx   # App-level project list sidebar (dark theme)
│   │   ├── document-nav.tsx      # Pipeline-step navigation within a project
│   │   └── content-editor.tsx    # Active document view (edit/generate/export)
│   ├── workspace/                # Workspace orchestration
│   │   └── project-workspace.tsx # Three-column layout orchestrator
│   ├── chat/                     # Chat feature
│   │   └── chat-interface.tsx    # Main chat UI
│   └── analysis/                 # Analysis feature
│       └── analysis-panel.tsx    # Analysis/PRD/TechSpec UI
│
├── lib/                          # Utilities & services
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server-side client
│   │   └── middleware.ts         # Auth middleware logic
│   ├── stripe.ts                 # Stripe singleton
│   ├── openrouter.ts             # OpenRouter AI API
│   ├── n8n.ts                    # N8N webhook integration (with prd/competitiveAnalysis context)
│   ├── pdf-utils.ts              # PDF export: renders Markdown → HTML → canvas → jsPDF
│   └── utils.ts                  # Utility functions & CREDIT_COSTS
│
├── types/                        # TypeScript types
│   └── database.ts               # Supabase DB types (auto-generated)
│
├── hooks/                        # React hooks (empty currently)
│
└── middleware.ts                 # Auth middleware (root level)
```

### Directory Purpose Map

| Directory | Purpose | When to Add/Modify |
|-----------|---------|-------------------|
| `app/(auth)/` | Authentication pages | Adding new auth methods or flows |
| `app/(dashboard)/` | Protected app pages | Adding new dashboard features |
| `app/api/` | Backend API endpoints | Creating new API functionality |
| `components/ui/` | Reusable UI components | Adding new UI primitives |
| `components/layout/` | Layout & navigation components | Modifying sidebar, document nav, or content editor |
| `components/workspace/` | Workspace orchestration | Changing the project workspace flow or column layout |
| `components/chat/` | Chat feature components | Enhancing chat functionality |
| `components/analysis/` | Analysis feature components | Adding analysis features |
| `lib/` | Business logic & external APIs | Integrating new services |
| `lib/supabase/` | Database & auth logic | Database operations |
| `lib/pdf-utils.ts` | PDF export logic | Changing PDF styling or export behaviour |
| `types/` | TypeScript definitions | Adding new type definitions |

---

## 5. Coding Conventions

### File Naming

- **Pages**: `page.tsx` (Next.js convention)
- **Dynamic Routes**: `[id]/page.tsx`, `[type]/route.ts`
- **API Routes**: `route.ts` in endpoint folder
- **Components**: `kebab-case.tsx` (e.g., `chat-interface.tsx`)
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
const CREDIT_COSTS = { ... }
const ANALYSIS_PROMPTS = { ... }

// Props interfaces: {ComponentName}Props
interface ChatInterfaceProps { ... }
interface AnalysisPanelProps { ... }

// Type aliases: PascalCase or lowercase
type AnalysisType = 'competitive-analysis' | 'prd' | 'tech-spec'
type DocumentType = 'prompt' | 'competitive' | 'prd' | 'techspec' | 'architecture' | 'deploy'
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

// Sidebar (dark theme — always use sidebar-* tokens)
"bg-sidebar-bg"                 // #000000
"text-sidebar-foreground"       // #FAFAFA
"text-sidebar-muted"            // #999999
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
402 - Payment Required (insufficient credits)
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
type AnalysisType = 'competitive-analysis' | 'prd' | 'tech-spec'
type DocumentType = 'prompt' | 'competitive' | 'prd' | 'techspec' | 'architecture' | 'deploy'

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

## 6. Setup & Build

### Prerequisites

- **Node.js**: Latest LTS version
- **npm**: Latest version
- **Supabase Account**: For database and auth
- **Stripe Account**: For payments (optional for dev)
- **API Keys**: Anthropic, OpenRouter

### Environment Variables

Create `.env.local` in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# AI Models
OPENROUTER_API_KEY=sk-or-xxx...
OPENROUTER_CHAT_MODEL=anthropic/claude-sonnet-4
OPENROUTER_ANALYSIS_MODEL=anthropic/claude-sonnet-4
ANTHROPIC_API_KEY=sk-ant-xxx...

# Stripe
STRIPE_SECRET_KEY=sk_secret_xxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx...

# N8N (optional - fallback enabled)
N8N_WEBHOOK_BASE_URL=https://n8n.example.com
N8N_COMPETITIVE_ANALYSIS_WEBHOOK=/webhook/competitive
N8N_GAP_ANALYSIS_WEBHOOK=/webhook/gap
N8N_PRD_WEBHOOK=/webhook/prd
N8N_TECH_SPEC_WEBHOOK=/webhook/techspec

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd idea2app-root-v2

# Install dependencies
npm install
```

### Database Setup (Supabase)

1. Create a new Supabase project
2. Run SQL migrations to create tables:
   - `profiles` - User profiles with credit balance
   - `projects` - Business idea projects
   - `messages` - Chat message history
   - `analyses` - Competitive and gap analyses
   - `prds` - Product requirement documents
   - `tech_specs` - Technical specifications
   - `deployments` - Generated app deployments
   - `credits` - Credit balance tracking
   - `credits_history` - Credit transaction log
   - `plans` - Subscription plans
   - `subscriptions` - User subscriptions

3. Enable Row Level Security (RLS) on all tables
4. Create PostgreSQL stored functions:
   - `consume_credits(user_id, amount, action, description)`
   - `add_credits(user_id, amount, action, description)`
   - `get_credit_balance(user_id)`

5. Configure authentication:
   - Enable email/password auth
   - Add redirect URLs (e.g., `http://localhost:3000/callback`)
   - Configure OAuth providers (optional)

### Development

```bash
# Start development server
npm run dev

# Server runs at http://localhost:3000
# Hot module reload enabled
```

### Build & Production

```bash
# Build for production
npm run build

# Output in .next/ directory

# Start production server
npm start

# Runs at http://localhost:3000
```

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Testing (Not configured yet)

```bash
# Add test framework when needed
# Recommended: Jest + React Testing Library
```

### Deployment

**Recommended: Vercel**
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy automatically on push

**Alternative: Docker**
```bash
# Build Docker image
docker build -t idea2app .

# Run container
docker run -p 3000:3000 idea2app
```

### Scripts Reference

```json
{
  "dev": "next dev",           // Development server
  "build": "next build",       // Production build
  "start": "next start",       // Production server
  "lint": "eslint"             // Run linting
}
```

---

## 7. Database Schema Overview

### Core Tables

- **profiles**: User profiles, linked to Supabase Auth
  - Fields: `id`, `email`, `full_name`, `credits`, `plan_id`, `created_at`
  - RLS: Users can only read/update their own profile

- **projects**: Business idea projects
  - Fields: `id`, `user_id`, `name`, `description`, `status`, `created_at`
  - RLS: Users can only access their own projects

- **messages**: Chat message history
  - Fields: `id`, `project_id`, `role` (user/assistant), `content`, `created_at`
  - RLS: Users can only access messages from their projects

- **analyses**: Competitive and gap analyses
  - Fields: `id`, `project_id`, `type`, `content`, `created_at`
  - RLS: Users can only access analyses from their projects

- **prds**: Product requirement documents
  - Fields: `id`, `project_id`, `content`, `created_at`
  - RLS: Users can only access PRDs from their projects

- **tech_specs**: Technical specifications
  - Fields: `id`, `project_id`, `content`, `created_at`
  - RLS: Users can only access tech specs from their projects

- **deployments**: Generated applications
  - Fields: `id`, `project_id`, `app_type`, `code`, `url`, `created_at`
  - RLS: Users can only access deployments from their projects

- **credits_history**: Credit transaction log
  - Fields: `id`, `user_id`, `amount`, `balance_after`, `action`, `description`, `created_at`
  - RLS: Users can only view their own credit history

- **subscriptions**: User subscriptions
  - Fields: `id`, `user_id`, `plan_id`, `stripe_subscription_id`, `status`, `current_period_end`
  - RLS: Users can only view their own subscription

---

## 8. API Endpoints Overview

### Authentication
- **Auth flow**: Handled by Supabase (email/password, OAuth)
- **Callback**: `GET /callback` - OAuth callback handler

### Chat
- **POST /api/chat**: Send chat message, get AI response
  - Body: `{ projectId, message }`
  - Returns: `{ id, content, role, created_at }`
  - Cost: 1 credit

### Projects
- **GET /api/projects/[id]**: Get project details
  - Returns: project row (owner-scoped via RLS)

- **PATCH /api/projects/[id]**: Update project fields
  - Body: `{ description?, name?, status? }` (any subset)
  - Returns: updated project row
  - Used by the workspace prompt editor to persist description changes

### Analysis
- **POST /api/analysis/[type]**: Generate analysis
  - Types: `competitive-analysis`, `prd`, `tech-spec`
  - Body: `{ projectId, idea, name, competitiveAnalysis?, prd? }`
    - `competitiveAnalysis` forwarded to N8N when generating PRDs
    - `prd` forwarded to N8N when generating tech specs
  - Returns: `{ content, source, model, type }`
  - Cost: 5 credits (`competitive-analysis`) / 10 credits (`prd`, `tech-spec`)
  - Route `maxDuration`: 300s (N8N workflows can be slow)

### App Generation
- **POST /api/generate-app**: Generate application code
  - Body: `{ projectId, appType }`
  - Types: `static`, `dynamic`, `spa`, `pwa`
  - Returns: `{ id, code, url, created_at }`
  - Cost: 5 credits

### Stripe
- **POST /api/stripe/checkout**: Create checkout session
  - Body: `{ planId }`
  - Returns: `{ url }`

- **GET /api/stripe/portal**: Access customer portal
  - Returns: `{ url }`

- **POST /api/stripe/webhook**: Handle Stripe events
  - Handles: `checkout.session.completed`, `customer.subscription.updated`, etc.

---

## 9. Credit System

### Credit Costs

| Action | Cost |
|--------|------|
| Chat message | 1 credit |
| Competitive Analysis | 5 credits |
| PRD Generation | 10 credits |
| Tech Spec Generation | 10 credits |
| App Generation (Deploy) | 5 credits |

### Credit Management

- **Consumption**: Atomic operation via `consume_credits()` stored procedure
- **Addition**: Via `add_credits()` (subscription refill, purchases)
- **Balance Check**: Real-time via `get_credit_balance()`
- **History**: All transactions logged in `credits_history`

### Subscription Plans

- **Free**: 10 credits/month
- **Starter**: 100 credits/month
- **Pro**: 500 credits/month
- **Enterprise**: Unlimited credits

---

## 10. Common Development Tasks

### Adding a New Page

```bash
# 1. Create page file
src/app/(dashboard)/new-page/page.tsx

# 2. Add to navigation (if needed)
src/components/layout/project-sidebar.tsx
```

### Adding a New API Endpoint

```bash
# 1. Create route file
src/app/api/new-endpoint/route.ts

# 2. Implement POST/GET/PUT/DELETE handlers
export async function POST(request: Request) { ... }
```

### Adding a New UI Component

```bash
# 1. Create component file
src/components/ui/new-component.tsx

# 2. Use CVA pattern for variants
const variants = cva("base", { variants: { ... } })

# 3. Export forwardRef component
```

### Adding a New Database Table

```bash
# 1. Create migration in Supabase
# 2. Add RLS policies
# 3. Update database types
npx supabase gen types typescript --project-id <id> > src/types/database.ts

# 4. Access in code
const { data } = await supabase.from("new_table").select()
```

### Modifying Credit Costs

```typescript
// Edit: src/lib/utils.ts
export const CREDIT_COSTS = {
  'chat': 1,
  'competitive-analysis': 5,
  // Update values here
}
```

---

## 11. Troubleshooting

### Common Issues

**Build Errors**
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors: `npm run build`
- Clear `.next/` folder and rebuild

**Auth Issues**
- Verify environment variables are set correctly
- Check Supabase redirect URLs in project settings
- Ensure RLS policies allow access

**API Errors**
- Check API key validity (OpenRouter, Anthropic, Stripe)
- Verify database connection (Supabase URL/key)
- Check server logs for detailed error messages

**Credit System Issues**
- Verify `consume_credits()` function exists in database
- Check credit balance in `profiles` table
- Review `credits_history` for transaction log

**N8N Timeout Issues**
- The analysis route has `maxDuration = 300s`; the N8N client uses a 250s `AbortSignal.timeout`
- If N8N consistently times out, check the N8N workflow for long-running LLM calls
- The system will auto-fallback to OpenRouter if the N8N request fails

**PDF Export Issues**
- PDF export uses `html2canvas` which renders off-screen; ensure the page is not navigated away during generation
- `marked` parses Markdown to HTML client-side; ensure the content is valid Markdown

---

## 12. Key Files Reference

| File | Purpose |
|------|---------|
| [src/app/layout.tsx](src/app/layout.tsx) | Root layout — loads Sora + IBM Plex Mono fonts |
| [src/app/globals.css](src/app/globals.css) | Pencil design tokens (CSS custom properties), status badge styles, scrollbar styles |
| [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx) | Dashboard layout — renders `ProjectSidebar` + children |
| [src/app/(dashboard)/projects/[id]/page.tsx](src/app/(dashboard)/projects/[id]/page.tsx) | Project page — fetches data server-side, passes to `ProjectWorkspace` |
| [src/app/api/projects/[id]/route.ts](src/app/api/projects/[id]/route.ts) | PATCH/GET project details |
| [src/app/api/analysis/[type]/route.ts](src/app/api/analysis/[type]/route.ts) | Analysis generation with N8N → OpenRouter fallback |
| [src/components/workspace/project-workspace.tsx](src/components/workspace/project-workspace.tsx) | Three-column workspace orchestrator |
| [src/components/layout/project-sidebar.tsx](src/components/layout/project-sidebar.tsx) | App-level dark sidebar (project list, search, sign-out) |
| [src/components/layout/document-nav.tsx](src/components/layout/document-nav.tsx) | Pipeline-step nav with status badges |
| [src/components/layout/content-editor.tsx](src/components/layout/content-editor.tsx) | Document content view (edit/generate/copy/PDF export) |
| [src/components/ui/markdown-renderer.tsx](src/components/ui/markdown-renderer.tsx) | Markdown renderer with Mermaid diagrams + syntax highlighting |
| [src/components/chat/chat-interface.tsx](src/components/chat/chat-interface.tsx) | Chat UI component |
| [src/components/analysis/analysis-panel.tsx](src/components/analysis/analysis-panel.tsx) | Analysis UI component |
| [src/lib/n8n.ts](src/lib/n8n.ts) | N8N webhook client — forwards prd/competitiveAnalysis context |
| [src/lib/pdf-utils.ts](src/lib/pdf-utils.ts) | PDF export: Markdown → HTML → canvas → jsPDF |
| [src/lib/supabase/server.ts](src/lib/supabase/server.ts) | Server-side Supabase client |
| [src/lib/supabase/client.ts](src/lib/supabase/client.ts) | Browser Supabase client |
| [src/lib/openrouter.ts](src/lib/openrouter.ts) | OpenRouter AI integration (fallback) |
| [src/lib/utils.ts](src/lib/utils.ts) | Utility functions & CREDIT_COSTS |
| [src/middleware.ts](src/middleware.ts) | Auth middleware |
| [src/types/database.ts](src/types/database.ts) | Database type definitions |

---

**End of PROJECT_CONTEXT.md**

*This document serves as the comprehensive reference for understanding and working with the Idea2App codebase. Keep it updated as the project evolves.*

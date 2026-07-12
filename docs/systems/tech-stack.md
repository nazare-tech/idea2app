# Tech Stack
Tech stack tables for Maker Compass: Next.js 16.2.9 App Router, React 19.2.3, TypeScript 5, Tailwind CSS 4, Radix UI, CVA, react-markdown, beautiful-mermaid.
Backend services: Supabase (@supabase/supabase-js, @supabase/ssr), OpenRouter with managed Exa search, Anthropic Claude, Stripe 20.2.0, Sentry, Perplexity, Tavily.
Frontend extras: lucide-react icons, @json-render/core/react/shadcn mockup rendering, img-fx WebGL loading surface with three, date-fns, react-syntax-highlighter.
Typography loads Hanken Grotesk as the primary sans/display face and Fira Mono for labels and code, both as Google Fonts.
Development tools: ESLint 9, eslint-config-next, tsx loader for Node's built-in test runner, @playwright/test Chromium e2e, shadcn CLI, Clawpatch metadata in .clawpatch/.
Build and runtime: Turbopack dev server with HMR, npm, Node.js LTS pinned locally to 22.21.1 via .nvmrc; engines allow even-numbered LTS lines 22 and 24.
---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.2.9 | Full-stack React framework with App Router |
| **React** | 19.2.3 | UI library with React Server Components |
| **TypeScript** | 5 | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Radix UI** | Various | Unstyled, accessible component primitives |
| **lucide-react** | 0.563.0 | Icon library |
| **class-variance-authority** | 0.7.1 | Type-safe component variants |
| **tailwind-merge** | 3.4.0 | Tailwind class merging utility |
| **react-markdown** | 10.1.0 | Markdown rendering |
| **remark-gfm** | 4.0.1 | GitHub Flavored Markdown support |
| **beautiful-mermaid** | 1.1.3 | Beautiful, themeable Mermaid diagram rendering with expansion |
| **react-syntax-highlighter** | 16.1.0 | Code syntax highlighting |
| **@json-render/core**, **@json-render/react**, **@json-render/shadcn** | 0.11.0 | Structured mockup rendering from json-render specs and patches |
| **img-fx** | 0.3.1 | Animated WebGL mockup image-generation loading surface |
| **three** | 0.184.0 | WebGL renderer peer dependency for `img-fx` |
| **date-fns** | 4.1.0 | Relative project timestamp formatting on dashboard cards |
| **Hanken Grotesk** | (Google Font) | Primary sans-serif and display typeface |
| **Fira Mono** | (Google Font) | Monospace typeface for labels/code |

### Backend & Services

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Supabase** | - | PostgreSQL database with auth and RLS |
| **@supabase/supabase-js** | 2.91.1 | Supabase client library |
| **@supabase/ssr** | 0.8.0 | Server-side rendering utilities |
| **Anthropic Claude** | 0.71.2 | Optional local Prompt Lab mockup planner provider |
| **OpenRouter** | 6.16.0 | API wrapper for AI analysis, managed Exa web search, and OpenRouter-hosted image mockup generation |
| **Exa (via OpenRouter)** | managed | Primary Market Research competitor discovery through OpenRouter server tools; no separate Exa key |
| **Stripe** | 20.2.0 | Payment processing and subscriptions |
| **@sentry/nextjs** | 10.58.0 | App Router error monitoring and source-map upload support |
| **Perplexity** | - | AI-powered competitor search (sonar-pro model, OpenAI-compatible API) |
| **Tavily** | - | Web content extraction from competitor URLs |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | ^9 | Code linting |
| **eslint-config-next** | 16.2.9 | Next.js ESLint configuration |
| **tsx** | 4.20.6 | TypeScript test/runtime loader for Node's built-in test runner |
| **@playwright/test** | ^1.61.1 | Chromium e2e suite in `e2e/` (see `docs/testing/e2e-guide.md`); fresh clones run `npx playwright install chromium` once |
| **shadcn** | 3.8.5 | Component scaffolding/tooling |
| **Clawpatch** | config only | Local review metadata and reports stored in `.clawpatch/` |
| **@types/node** | ^24 | Node.js type definitions |
| **@types/react** | ^19 | React type definitions |
| **@types/react-dom** | ^19 | React DOM type definitions |

### Build & Runtime

- **Build Tool**: Next.js built-in (Turbopack in dev, Next.js production build for release)
- **Dev Server**: Next.js dev server with HMR
- **Package Manager**: npm
- **Runtime**: Node.js LTS. Local development is pinned to Node.js 22.21.1 through `.nvmrc`; package engines allow supported even-numbered LTS lines 22 and 24.

---


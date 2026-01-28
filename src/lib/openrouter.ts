import OpenAI from "openai"

// ─── Model Configuration ───────────────────────────────────────────
// Change these to switch which OpenRouter model powers each feature.
// Browse available models at: https://openrouter.ai/models
const CHAT_MODEL = process.env.OPENROUTER_CHAT_MODEL || "anthropic/claude-sonnet-4"
const ANALYSIS_MODEL = process.env.OPENROUTER_ANALYSIS_MODEL || "anthropic/claude-sonnet-4"
// ────────────────────────────────────────────────────────────────────

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

const ANALYSIS_PROMPTS: Record<string, (idea: string, name: string) => string> = {
  "competitive-analysis": (idea, name) => `You are an expert business analyst. Perform a comprehensive competitive analysis for the following business idea.

**Business Name:** ${name}
**Business Idea:** ${idea}

Please provide a detailed competitive analysis including:

## Market Overview
- Industry landscape and market size
- Growth trends and projections

## Direct Competitors
For each competitor (identify at least 5), provide:
- Company name and overview
- Key products/services
- Market positioning
- Strengths and weaknesses
- Pricing model
- Target audience

## Indirect Competitors
- Alternative solutions users might choose
- Substitute products/services

## Competitive Advantages
- What makes this idea unique
- Potential moats and barriers to entry

## Market Positioning Strategy
- Recommended positioning
- Differentiation opportunities
- Go-to-market strategy

## SWOT Analysis
- Strengths, Weaknesses, Opportunities, Threats

Use markdown formatting with tables where appropriate.`,

  "gap-analysis": (idea, name) => `You are an expert business strategist. Perform a comprehensive gap analysis for the following business idea.

**Business Name:** ${name}
**Business Idea:** ${idea}

Please provide a detailed gap analysis including:

## Current State Assessment
- Existing solutions in the market
- Current customer pain points
- Market maturity level

## Desired State
- Ideal customer experience
- Market opportunity size
- Target outcomes

## Gap Identification
### Product Gaps
- Features missing in current market solutions
- Unmet customer needs

### Technology Gaps
- Technical capabilities needed
- Infrastructure requirements

### Market Gaps
- Underserved customer segments
- Geographic opportunities
- Pricing model gaps

### Operational Gaps
- Process improvements needed
- Resource requirements

## Recommendations
- Priority actions to close gaps
- Quick wins vs long-term initiatives
- Resource allocation suggestions

## Risk Assessment
- Potential challenges in closing gaps
- Mitigation strategies

Use markdown formatting with clear headings and bullet points.`,

  "prd": (idea, name) => `You are an expert product manager. Create a comprehensive Product Requirements Document (PRD) for the following business idea.

**Product Name:** ${name}
**Product Idea:** ${idea}

Please create a detailed PRD including:

## Executive Summary
- Product vision and mission
- Problem statement
- Target audience

## Product Overview
- Core value proposition
- High-level product description
- Key differentiators

## User Personas
- Define 3-4 detailed user personas
- Demographics, goals, pain points, behaviors

## User Stories & Requirements
### Must-Have Features (P0)
### Should-Have Features (P1)
### Nice-to-Have Features (P2)

## Feature Specifications
For each key feature:
- Description
- Acceptance criteria
- User flow
- Edge cases

## Success Metrics & KPIs
- Key performance indicators
- Success criteria
- Measurement methodology

## Release Plan
- MVP scope
- Phase 1, 2, 3 features
- Timeline recommendations

## Assumptions & Constraints
- Technical assumptions
- Business constraints
- Dependencies

## Appendix
- Glossary of terms
- References

Use markdown formatting with clear structure.`,

  "tech-spec": (idea, name) => `You are a senior software architect. Create a comprehensive Technical Specification document for the following product.

**Product Name:** ${name}
**Product Idea:** ${idea}

Please create a detailed Technical Specification including:

## System Architecture
- High-level architecture diagram (described in text)
- Microservices vs monolithic decision
- Key architectural patterns

## Technology Stack
### Frontend
- Framework recommendation with justification
- UI library and design system
- State management approach

### Backend
- Language and framework
- API architecture (REST/GraphQL)
- Authentication & authorization

### Database
- Database type and recommendation
- Schema design (key tables and relationships)
- Data modeling approach

### Infrastructure
- Cloud provider recommendation
- Hosting and deployment strategy
- CI/CD pipeline
- Monitoring and logging

## API Design
- Key endpoints with request/response formats
- Authentication flow
- Rate limiting strategy
- Error handling approach

## Security Considerations
- Authentication mechanism
- Data encryption
- Input validation
- OWASP top 10 considerations

## Scalability Plan
- Horizontal vs vertical scaling strategy
- Caching strategy
- CDN usage
- Database optimization

## Third-Party Integrations
- Payment processing
- Email/notification services
- Analytics
- Other APIs

## Performance Requirements
- Response time targets
- Uptime SLA
- Concurrent user capacity

## Development Guidelines
- Code structure and conventions
- Testing strategy
- Documentation requirements

Use markdown formatting with code snippets where helpful.`,
}

export async function callOpenRouterFallback(
  type: string,
  idea: string,
  name: string
): Promise<{ content: string; source: "openrouter"; model: string }> {
  const promptFn = ANALYSIS_PROMPTS[type]

  if (!promptFn) {
    throw new Error(`Unknown analysis type: ${type}`)
  }

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured")
  }

  const response = await openrouter.chat.completions.create({
    model: ANALYSIS_MODEL,
    messages: [
      {
        role: "user",
        content: promptFn(idea, name),
      },
    ],
    max_tokens: 4096,
  })

  const content = response.choices[0]?.message?.content

  if (!content) {
    throw new Error("No content returned from OpenRouter")
  }

  return { content, source: "openrouter", model: ANALYSIS_MODEL }
}

// Chat completion for the chat interface
export async function chatCompletion(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  idea: string
): Promise<{ content: string; source: "openrouter"; model: string }> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured")
  }

  const systemMessage = {
    role: "system" as const,
    content: `You are an AI assistant helping users develop their business ideas. The user is working on the following idea: "${idea}".

Help them refine their idea, answer questions, and provide insights. Be concise but thorough. Use markdown formatting for better readability. If the user asks about generating analyses, PRDs, tech specs, or app deployments, guide them to use the appropriate tabs in the application.`,
  }

  const response = await openrouter.chat.completions.create({
    model: CHAT_MODEL,
    messages: [systemMessage, ...messages.slice(-20)], // Keep last 20 messages for context
    max_tokens: 2048,
  })

  const content = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again."

  return { content, source: "openrouter", model: CHAT_MODEL }
}

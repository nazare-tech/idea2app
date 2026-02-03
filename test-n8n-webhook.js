/**
 * N8N Webhook Test Script
 *
 * This script tests your n8n webhook integrations without running the full app.
 *
 * Usage:
 *   node test-n8n-webhook.js <webhook-type>
 *
 * Available webhook types:
 *   - competitive-analysis
 *   - gap-analysis
 *   - prd
 *   - tech-spec
 *
 * Examples:
 *   node test-n8n-webhook.js competitive-analysis
 *   node test-n8n-webhook.js prd
 *   node test-n8n-webhook.js tech-spec
 */

const fs = require('fs')
const path = require('path')

// Get webhook type from command line argument
const webhookType = process.argv[2]

const AVAILABLE_WEBHOOKS = {
  'competitive-analysis': {
    envVar: 'N8N_COMPETITIVE_ANALYSIS_WEBHOOK',
    description: 'Competitive Analysis Webhook',
    needsCompetitiveAnalysis: false,
    needsPrd: false,
  },
  'gap-analysis': {
    envVar: 'N8N_GAP_ANALYSIS_WEBHOOK',
    description: 'Gap Analysis Webhook',
    needsCompetitiveAnalysis: false,
    needsPrd: false,
  },
  'prd': {
    envVar: 'N8N_PRD_WEBHOOK',
    description: 'PRD Generation Webhook',
    needsCompetitiveAnalysis: true,
    needsPrd: false,
  },
  'tech-spec': {
    envVar: 'N8N_TECH_SPEC_WEBHOOK',
    description: 'Tech Spec Generation Webhook',
    needsCompetitiveAnalysis: false,
    needsPrd: true,
  },
}

// Validate webhook type
if (!webhookType) {
  console.error('❌ Error: No webhook type specified\n')
  console.log('Usage: node test-n8n-webhook.js <webhook-type>\n')
  console.log('Available webhook types:')
  Object.keys(AVAILABLE_WEBHOOKS).forEach((type) => {
    console.log(`  - ${type.padEnd(25)} (${AVAILABLE_WEBHOOKS[type].description})`)
  })
  console.log('\nExamples:')
  console.log('  node test-n8n-webhook.js competitive-analysis')
  console.log('  node test-n8n-webhook.js prd')
  process.exit(1)
}

if (!AVAILABLE_WEBHOOKS[webhookType]) {
  console.error(`❌ Error: Invalid webhook type: ${webhookType}\n`)
  console.log('Available webhook types:')
  Object.keys(AVAILABLE_WEBHOOKS).forEach((type) => {
    console.log(`  - ${type.padEnd(25)} (${AVAILABLE_WEBHOOKS[type].description})`)
  })
  process.exit(1)
}

const webhookConfig = AVAILABLE_WEBHOOKS[webhookType]

// Read .env.local file manually
const envPath = path.join(__dirname, '.env.local')
let N8N_BASE_URL = ''
let N8N_WEBHOOK_PATH = ''

try {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const [key, ...valueParts] = trimmed.split('=')
    const value = valueParts.join('=').trim()

    if (key === 'N8N_WEBHOOK_BASE_URL') {
      N8N_BASE_URL = value
    } else if (key === webhookConfig.envVar) {
      N8N_WEBHOOK_PATH = value
    }
  }
} catch (error) {
  console.error('❌ Error reading .env.local file:', error.message)
  console.log('\nMake sure .env.local exists in the project root.')
  process.exit(1)
}

console.log(`🧪 Testing N8N ${webhookConfig.description}\n`)
console.log('Configuration:')
console.log(`  Webhook Type: ${webhookType}`)
console.log(`  Base URL: ${N8N_BASE_URL || '❌ NOT SET'}`)
console.log(`  Webhook Path: ${N8N_WEBHOOK_PATH || '❌ NOT SET'}`)
console.log('')

if (!N8N_BASE_URL || !N8N_WEBHOOK_PATH) {
  console.error('❌ Error: N8N environment variables not configured')
  console.log('\nPlease set the following in your .env.local file:')
  console.log('  N8N_WEBHOOK_BASE_URL=https://your-n8n-instance.com')
  console.log(`  ${webhookConfig.envVar}=/webhook/your-webhook-path`)
  console.log('\nSee N8N_SETUP_GUIDE.md for detailed instructions.')
  process.exit(1)
}

const webhookUrl = `${N8N_BASE_URL}${N8N_WEBHOOK_PATH}`
console.log(`Full Webhook URL: ${webhookUrl}`)
console.log('')

// Build test payload based on webhook type
const basePayload = {
  type: webhookType,
  idea: 'A SaaS platform that helps entrepreneurs validate and develop business ideas using AI-powered analysis, PRDs, and deployment automation',
  name: 'Idea2App Test Project',
  projectId: 'test-project-123',
  timestamp: new Date().toISOString(),
}

// Add competitive analysis for PRD webhook
if (webhookConfig.needsCompetitiveAnalysis) {
  basePayload.competitiveAnalysis = `# Competitive Analysis for Idea2App

## Market Overview
The business idea validation and development space is growing rapidly with several key players.

## Key Competitors

### 1. Lean Canvas
- **Strengths**: Well-established methodology, widely recognized
- **Weaknesses**: Manual process, no AI integration, limited automation
- **Market Position**: Traditional approach with strong brand recognition

### 2. AI-powered Business Planning Tools
- **Strengths**: Some automation, template-based outputs
- **Weaknesses**: Limited customization, no end-to-end workflow
- **Market Position**: Emerging players with fragmented solutions

## Market Gaps
1. **End-to-End Solution**: No platform combines validation, analysis, PRD generation, AND deployment
2. **AI Integration**: Existing tools have limited or no AI capabilities
3. **Automation**: Most solutions are manual or semi-automated

## Opportunities for Idea2App
- Full workflow automation from idea to deployment
- Advanced AI analysis capabilities
- Integrated development and deployment pipeline
- Credit-based flexible pricing model

This analysis shows strong market opportunity for a comprehensive AI-powered platform.`
}

// Add PRD for tech-spec webhook
if (webhookConfig.needsPrd) {
  basePayload.prd = `# Product Requirements Document: Idea2App

## 1. Executive Summary

**Product Name**: Idea2App
**Version**: 1.0
**Target Launch**: Q2 2024

Idea2App is an AI-powered SaaS platform that transforms business ideas into validated, deployable applications. The platform combines competitive analysis, gap analysis, PRD generation, technical specifications, and automated deployment into a single streamlined workflow.

## 2. Product Vision

To democratize business idea validation and application development by providing entrepreneurs with enterprise-grade AI tools that traditionally require expensive consultants and development teams.

## 3. Target Users

### Primary Personas

**1. Solo Entrepreneurs**
- Age: 25-45
- Experience: Varied technical background
- Pain Points: Limited resources, need quick validation, unclear tech requirements
- Goals: Validate ideas quickly, minimize upfront investment

**2. Small Business Owners**
- Age: 30-55
- Experience: Business-focused, limited technical knowledge
- Pain Points: Don't know where to start with app development
- Goals: Professional analysis, clear technical roadmap

**3. Product Managers**
- Age: 28-45
- Experience: Strong product sense, technical understanding
- Pain Points: Time-consuming documentation, lack of automation
- Goals: Generate comprehensive PRDs and tech specs quickly

## 4. Core Features

### 4.1 AI-Powered Chat Interface
**Priority**: P0 (MVP)

Users describe their business idea through conversational interface:
- Natural language input
- Context-aware follow-up questions
- Idea refinement through dialogue
- Message history persistence
- Real-time streaming responses

**Success Metrics**:
- Average session length > 10 minutes
- Idea clarity score improvement > 40%

### 4.2 Competitive Analysis
**Priority**: P0 (MVP)

AI-generated competitive landscape analysis:
- Market overview and trends
- Key competitor identification
- SWOT analysis for each competitor
- Market positioning recommendations
- Gap analysis integration

**Output Format**: Markdown with structured sections
**Generation Time**: < 60 seconds

### 4.3 Gap Analysis
**Priority**: P0 (MVP)

Identification of market opportunities:
- Unmet customer needs
- Market white spaces
- Competitive advantages
- Risk assessment
- Opportunity prioritization

### 4.4 PRD Generation
**Priority**: P0 (MVP)

Comprehensive Product Requirements Document:
- Executive summary
- User personas
- Feature specifications
- User stories
- Success metrics
- Release roadmap
- Non-functional requirements

**Input Required**: Competitive analysis must exist
**Generation Time**: < 90 seconds

### 4.5 Technical Specifications
**Priority**: P0 (MVP)

Detailed technical architecture documents:
- System architecture diagrams (Mermaid)
- Technology stack recommendations
- Database schema design (ERD diagrams)
- API specifications (RESTful endpoints)
- Security considerations
- Scalability recommendations
- Infrastructure requirements
- Development phases

**Input Required**: PRD must exist
**Generation Time**: < 90 seconds

### 4.6 Application Generation
**Priority**: P1 (Phase 2)

Automated code generation for multiple app types:
- Static websites (HTML/CSS/JS)
- Dynamic websites (Next.js)
- Single Page Applications (React)
- Progressive Web Apps (PWA)

**Features**:
- Complete source code
- Deployment-ready
- Best practices implementation
- Documentation included

### 4.7 Deployment
**Priority**: P1 (Phase 2)

One-click deployment capabilities:
- Vercel integration
- Netlify integration
- Custom domain support
- SSL certificates
- Deployment history

## 5. User Workflows

### Workflow 1: Complete Analysis Flow
1. User creates new project
2. Describes business idea via chat
3. Generates competitive analysis (5 credits)
4. Reviews and refines
5. Generates PRD (10 credits)
6. Generates technical specifications (10 credits)
7. Reviews complete documentation package
8. (Optional) Generates application code

### Workflow 2: Quick Validation
1. User creates project
2. Brief idea description
3. Generates competitive + gap analysis
4. Decides to proceed or pivot

## 6. Technical Requirements

### 6.1 Performance
- Page load time: < 2 seconds
- AI response time: < 90 seconds for analysis
- Chat response: < 5 seconds for streaming start
- Uptime: 99.9%

### 6.2 Scalability
- Support 10,000+ concurrent users
- Handle 100+ projects per user
- Store unlimited message history
- Process 1000+ AI requests per minute

### 6.3 Security
- SOC 2 Type II compliance
- End-to-end encryption for sensitive data
- Row-level security (RLS) for database
- API rate limiting
- DDoS protection

### 6.4 Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile responsive (iOS Safari, Chrome Mobile)

## 7. Credit System

### Credit Costs
| Action | Credits |
|--------|---------|
| Chat Message | 1 |
| Competitive Analysis | 5 |
| Gap Analysis | 5 |
| PRD Generation | 10 |
| Tech Spec Generation | 10 |
| App Generation | 5 |

### Subscription Plans
- **Free**: 10 credits/month
- **Starter**: 100 credits/month ($29/mo)
- **Pro**: 500 credits/month ($99/mo)
- **Enterprise**: Unlimited ($299/mo)

## 8. Success Metrics

### Product Metrics
- Monthly Active Users (MAU)
- Credit consumption rate
- Conversion rate (free → paid)
- Churn rate < 5%
- NPS score > 50

### Feature Adoption
- % users completing full workflow
- Average analyses per project
- PRD generation rate
- Tech spec generation rate

### Business Metrics
- MRR (Monthly Recurring Revenue)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- LTV:CAC ratio > 3:1

## 9. Release Roadmap

### Phase 1: MVP (Months 1-3)
- User authentication
- Project management
- AI chat interface
- Competitive analysis
- Gap analysis
- PRD generation
- Tech spec generation
- Credit system
- Stripe integration

### Phase 2: Enhancement (Months 4-6)
- Application code generation
- Deployment integrations
- PDF export
- Team collaboration
- Project templates
- Advanced analytics

### Phase 3: Scale (Months 7-12)
- API access for developers
- White-label solutions
- Advanced AI models
- Mobile applications
- Integration marketplace

## 10. Dependencies & Risks

### External Dependencies
- Anthropic Claude API availability
- OpenRouter API reliability
- Supabase uptime
- Stripe payment processing

### Risk Mitigation
- Multi-provider AI fallback (N8N → OpenRouter)
- Database backups (hourly)
- Caching layer for repeated requests
- Credit system prevents abuse

## 11. Open Questions

1. Should we support team collaboration in MVP?
2. What's the optimal credit pricing per action?
3. Do we need offline mode for generated documents?
4. Should PRD generation support iterative refinement?

## 12. Appendix

### Terminology
- **PRD**: Product Requirements Document
- **Tech Spec**: Technical Specification
- **RLS**: Row-Level Security
- **MAU**: Monthly Active Users
- **MRR**: Monthly Recurring Revenue

### References
- Market research: [Internal Doc]
- Competitor analysis: [Spreadsheet]
- User interviews: [Summary]`
}

const testPayload = basePayload

console.log('📤 Sending test request...')
console.log('Payload:', JSON.stringify(testPayload, null, 2))
console.log('')

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testPayload),
  signal: AbortSignal.timeout(120000), // 2 minute timeout
})
  .then(async (response) => {
    console.log(`📥 Response Status: ${response.status} ${response.statusText}`)
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()))
    console.log('')

    if (!response.ok) {
      const text = await response.text()
      console.error('❌ Error Response:')
      console.error(text)
      process.exit(1)
    }

    const data = await response.json()
    console.log('✅ Success! Response Data:')
    console.log(JSON.stringify(data, null, 2))
    console.log('')

    // Validate response format
    const content = data.content || data.output || data.result
    if (content) {
      console.log('✅ Response contains valid content field')
      console.log(`Content preview (first 300 chars):\n${content.substring(0, 300)}...`)

      // Check for model information
      if (data.model) {
        console.log(`\n📊 Model used: ${data.model}`)
      }
    } else {
      console.warn('⚠️  Warning: Response does not contain expected fields (content, output, or result)')
      console.warn('The integration might still work, but you should verify the response format.')
    }

    console.log(`\n✅ ${webhookConfig.description} test completed successfully!`)
    console.log('\nNext steps:')
    console.log('1. Restart your Next.js dev server (npm run dev)')
    console.log('2. Test the integration from the frontend')
    console.log('3. Check that the result appears in the appropriate tab')

    if (webhookType === 'prd') {
      console.log('\n💡 PRD Webhook Tip:')
      console.log('   Remember that PRD generation requires a competitive analysis to exist first.')
      console.log('   The competitiveAnalysis field in the payload simulates this requirement.')
    }

    if (webhookType === 'tech-spec') {
      console.log('\n💡 Tech Spec Webhook Tip:')
      console.log('   Tech spec generation requires a PRD to exist first.')
      console.log('   The prd field in the payload contains a complete sample PRD.')
      console.log('   In production, this PRD content comes from your database.')
    }
  })
  .catch((error) => {
    console.error('❌ Request Failed:')
    console.error(`Error: ${error.message}`)
    console.log('')

    if (error.name === 'TimeoutError') {
      console.error('The webhook request timed out after 2 minutes.')
      console.error('This likely means:')
      console.error('  - N8N is processing but taking too long')
      console.error('  - Try using a faster AI model in your n8n workflow')
    } else if (error.cause?.code === 'ENOTFOUND') {
      console.error('Could not resolve the hostname.')
      console.error('This likely means:')
      console.error('  - The N8N_WEBHOOK_BASE_URL is incorrect')
      console.error('  - N8N instance is not accessible')
    } else if (error.cause?.code === 'ECONNREFUSED') {
      console.error('Connection refused.')
      console.error('This likely means:')
      console.error('  - N8N is not running')
      console.error('  - Firewall is blocking the connection')
      console.error('  - Wrong port number in the URL')
    }

    console.log('\nTroubleshooting:')
    console.log('1. Verify N8N is running and accessible')
    console.log('2. Check the webhook URL in your n8n workflow')
    console.log(`3. Verify ${webhookConfig.envVar} is set correctly in .env.local`)
    console.log('4. Test the webhook directly in n8n (using the Test Webhook button)')
    console.log('5. Check firewall/network settings')
    console.log('\nSee N8N_SETUP_GUIDE.md for more help.')
    process.exit(1)
  })

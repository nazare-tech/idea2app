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
    needsContext: false,
  },
  'gap-analysis': {
    envVar: 'N8N_GAP_ANALYSIS_WEBHOOK',
    description: 'Gap Analysis Webhook',
    needsContext: false,
  },
  'prd': {
    envVar: 'N8N_PRD_WEBHOOK',
    description: 'PRD Generation Webhook',
    needsContext: true,
  },
  'tech-spec': {
    envVar: 'N8N_TECH_SPEC_WEBHOOK',
    description: 'Tech Spec Generation Webhook',
    needsContext: false,
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

// Add context for PRD webhook (simulating competitive analysis)
if (webhookConfig.needsContext) {
  basePayload.context = `# Competitive Analysis for Idea2App

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
      console.log('   The context field in the payload simulates this requirement.')
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

/**
 * N8N Webhook Test Script
 *
 * This script tests your n8n webhook integration without running the full app.
 *
 * Usage:
 *   node test-n8n-webhook.js
 */

const fs = require('fs')
const path = require('path')

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
    } else if (key === 'N8N_COMPETITIVE_ANALYSIS_WEBHOOK') {
      N8N_WEBHOOK_PATH = value
    }
  }
} catch (error) {
  console.error('❌ Error reading .env.local file:', error.message)
  console.log('\nMake sure .env.local exists in the project root.')
  process.exit(1)
}

console.log('🧪 Testing N8N Webhook Integration\n')
console.log('Configuration:')
console.log(`  Base URL: ${N8N_BASE_URL || '❌ NOT SET'}`)
console.log(`  Webhook Path: ${N8N_WEBHOOK_PATH || '❌ NOT SET'}`)
console.log('')

if (!N8N_BASE_URL || !N8N_WEBHOOK_PATH) {
  console.error('❌ Error: N8N environment variables not configured')
  console.log('\nPlease set the following in your .env.local file:')
  console.log('  N8N_WEBHOOK_BASE_URL=https://your-n8n-instance.com')
  console.log('  N8N_COMPETITIVE_ANALYSIS_WEBHOOK=/webhook/n8n-competitive-analysis-agent')
  console.log('\nSee N8N_SETUP_GUIDE.md for detailed instructions.')
  process.exit(1)
}

const webhookUrl = `${N8N_BASE_URL}${N8N_WEBHOOK_PATH}`
console.log(`Full Webhook URL: ${webhookUrl}`)
console.log('')

const testPayload = {
  type: 'competitive-analysis',
  idea: 'A SaaS platform that helps entrepreneurs validate and develop business ideas using AI',
  name: 'Idea2App Test',
  projectId: 'test-project-123',
  timestamp: new Date().toISOString(),
}

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
      console.log(`Content preview (first 200 chars):\n${content.substring(0, 200)}...`)
    } else {
      console.warn('⚠️  Warning: Response does not contain expected fields (content, output, or result)')
      console.warn('The integration might still work, but you should verify the response format.')
    }

    console.log('\n✅ Webhook test completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Restart your Next.js dev server (npm run dev)')
    console.log('2. Test the integration from the frontend')
    console.log('3. Check that the analysis appears in "Previous Results"')
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
    console.log('3. Test the webhook directly in n8n (using the Test Webhook button)')
    console.log('4. Check firewall/network settings')
    console.log('\nSee N8N_SETUP_GUIDE.md for more help.')
    process.exit(1)
  })

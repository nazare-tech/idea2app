# N8N Webhook Integration Setup Guide

## Current Status

Your n8n workflow is configured correctly, but the frontend can't communicate with it because the environment variables are missing.

## Setup Steps

### 1. Configure Environment Variables

Update your `.env.local` file with your n8n instance URL:

```bash
# N8N Webhooks
N8N_WEBHOOK_BASE_URL=https://your-n8n-instance.com  # Replace with your actual n8n URL
N8N_COMPETITIVE_ANALYSIS_WEBHOOK=/webhook/n8n-competitive-analysis-agent
```

**Important Notes:**
- If running n8n locally, use: `http://localhost:5678`
- If using n8n cloud, use your cloud instance URL (e.g., `https://yourname.app.n8n.cloud`)
- Do NOT include trailing slashes in the base URL
- The webhook path should start with `/webhook/`

### 2. Get Your N8N Webhook URL

1. Open your n8n workflow
2. Click on the "Webhook" node
3. Look for the "Production URL" - it should look like:
   ```
   https://your-n8n-instance.com/webhook/n8n-competitive-analysis-agent
   ```
4. Split this into:
   - **Base URL**: `https://your-n8n-instance.com`
   - **Path**: `/webhook/n8n-competitive-analysis-agent`

### 3. Test the Webhook (Manual Test)

Test your webhook directly using curl or a tool like Postman:

```bash
curl -X POST https://your-n8n-instance.com/webhook/n8n-competitive-analysis-agent \
  -H "Content-Type: application/json" \
  -d '{
    "type": "competitive-analysis",
    "idea": "A SaaS platform for AI-powered business analysis",
    "name": "TestProject",
    "projectId": "test-123",
    "timestamp": "2026-01-29T00:00:00Z"
  }'
```

**Expected Response:**
```json
{
  "content": "## Competitive Analysis\n\n### 1. Competitor Name\n..."
}
```

### 4. Restart Your Development Server

After updating `.env.local`, restart your Next.js server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## How the Integration Works

### Request Flow

1. **Frontend** ([analysis-panel.tsx](src/components/analysis/analysis-panel.tsx)):
   - User clicks "Generate" on Competitive Analysis
   - Sends POST to `/api/analysis/competitive-analysis`
   - Body: `{ projectId, idea, name }`

2. **Backend** ([route.ts](src/app/api/analysis/[type]/route.ts)):
   - Validates user auth and credits
   - Deducts 5 credits
   - Calls N8N webhook with payload
   - Falls back to OpenRouter if N8N fails
   - Saves result to database
   - Returns `{ content, source, model, type }`

3. **N8N Workflow**:
   - Receives webhook trigger
   - AI Agent processes with prompt
   - Returns `{ content: <AI output> }`

4. **Frontend Display**:
   - Receives response
   - Reloads page to show saved analysis
   - Displays in "Previous Results" section

### Payload Structure

**Sent to N8N:**
```json
{
  "type": "competitive-analysis",
  "idea": "Business idea description",
  "name": "Project name",
  "projectId": "uuid",
  "timestamp": "2026-01-29T..."
}
```

**Expected from N8N:**
```json
{
  "content": "Markdown formatted analysis content"
}
```

## Troubleshooting

### Issue: "Insufficient credits" error

**Cause:** User doesn't have enough credits
**Solution:** Check your credits balance in the dashboard or add credits

### Issue: Webhook times out

**Cause:** N8N takes longer than 2 minutes to respond
**Solution:**
- Optimize your n8n workflow
- Use a faster AI model in n8n
- The timeout is set in [n8n.ts:43](src/lib/n8n.ts#L43): `AbortSignal.timeout(120000)`

### Issue: Frontend shows "Failed to generate analysis"

**Possible Causes:**
1. N8N webhook URL is incorrect
2. N8N is not running
3. Network/firewall blocking the request
4. CORS issues (but your workflow has CORS headers configured)

**Debug Steps:**

1. **Check N8N logs** to see if the webhook was triggered
2. **Check browser console** for errors
3. **Check server logs** (terminal running `npm run dev`)
4. **Verify environment variables** are loaded:

```typescript
// Add this temporarily to src/app/api/analysis/[type]/route.ts
console.log('N8N Config:', {
  baseUrl: process.env.N8N_WEBHOOK_BASE_URL,
  webhook: process.env.N8N_COMPETITIVE_ANALYSIS_WEBHOOK
})
```

### Issue: Response not displaying

**Cause:** Frontend expects `data.content` but N8N returns different format
**Current Code** ([n8n.ts:53](src/lib/n8n.ts#L53)):
```typescript
const content = data.content || data.output || data.result || JSON.stringify(data)
```

This handles multiple formats, but verify your N8N is returning one of these fields.

### Issue: N8N fallback to OpenRouter

**Expected Behavior:** If N8N fails, it automatically falls back to OpenRouter
**Check:** Look for this log message in your terminal:
```
N8N webhook failed for competitive-analysis, using OpenRouter fallback
```

## Verifying It Works

### Success Indicators:

1. ✅ No console errors in browser
2. ✅ Server logs show: `[Analysis] type=competitive-analysis project=... source=n8n model=...`
3. ✅ Credits are deducted (check dashboard)
4. ✅ Analysis appears in "Previous Results" section
5. ✅ Analysis content is properly formatted markdown

### Example Success Log:

```
[Analysis] type=competitive-analysis project=abc-123 source=n8n model=openai/gpt-5-mini
```

## N8N Workflow Configuration

Your current workflow is correct:

- ✅ Webhook accepts POST requests
- ✅ Response mode is set to "responseNode"
- ✅ AI Agent processes the idea
- ✅ Respond to Webhook returns JSON with `content` field
- ✅ CORS headers are configured

**One recommendation:** Consider changing the AI model from `openai/gpt-5-mini` to `anthropic/claude-sonnet-4` for better analysis quality (this matches what OpenRouter fallback uses).

## Next Steps

1. Set your N8N_WEBHOOK_BASE_URL in `.env.local`
2. Restart your dev server
3. Try generating a competitive analysis
4. Check the browser console and server logs
5. If it fails, check n8n execution logs to see what happened

## Need Help?

- Check n8n workflow execution history for errors
- Verify the webhook is active (not paused)
- Test the webhook URL directly with curl
- Check if n8n requires authentication (add headers if needed)

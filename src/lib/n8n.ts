export interface N8NPayload {
  idea: string
  name: string
  projectId: string
  prd?: string
  competitiveAnalysis?: string
}

const WEBHOOK_MAP: Record<string, string | undefined> = {
  "competitive-analysis": process.env.N8N_COMPETITIVE_ANALYSIS_WEBHOOK,
  "gap-analysis": process.env.N8N_GAP_ANALYSIS_WEBHOOK,
  "prd": process.env.N8N_PRD_WEBHOOK,
  "tech-spec": process.env.N8N_TECH_SPEC_WEBHOOK,
}

export async function callN8NWebhook(
  type: string,
  payload: N8NPayload
): Promise<{ content: string; source: "n8n"; model: string }> {
  const baseUrl = process.env.N8N_WEBHOOK_BASE_URL
  const webhookPath = WEBHOOK_MAP[type]

  // If no webhook URL is configured, immediately fall back
  if (!baseUrl || !webhookPath) {
    throw new Error("N8N webhook not configured")
  }

  const webhookUrl = `${baseUrl}${webhookPath}`

  try {
    // Build webhook body with optional fields
    const webhookBody: Record<string, unknown> = {
      type,
      idea: payload.idea,
      name: payload.name,
      projectId: payload.projectId,
      timestamp: new Date().toISOString(),
    }

    // Add optional fields only if they have values
    if (payload.prd) {
      webhookBody.prd = payload.prd
    }
    if (payload.competitiveAnalysis) {
      webhookBody.competitiveAnalysis = payload.competitiveAnalysis
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookBody),
      signal: AbortSignal.timeout(30000), // 30s — n8n cloud sync webhooks won't respond beyond this
    })

    if (!response.ok) {
      throw new Error(`N8N webhook returned ${response.status}`)
    }

    const data = await response.json()

    // N8N can return content in different formats
    const content = data.content || data.output || data.result || JSON.stringify(data)
    // N8N workflows can optionally return which model they used
    const model = data.model || "n8n-workflow"

    return { content, source: "n8n", model }
  } catch (error) {
    console.error(`N8N webhook failed for ${type}:`, error)
    throw error
  }
}

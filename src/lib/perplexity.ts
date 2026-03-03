import OpenAI from "openai"

// Perplexity uses an OpenAI-compatible interface with a different base URL
const perplexity = new OpenAI({
  baseURL: "https://api.perplexity.ai",
  apiKey: process.env.PERPLEXITY_API_KEY || "",
})

export interface PerplexityCompetitorResult {
  competitors: Array<{
    name: string
    description: string
    whyCompetes: string
    url: string
  }>
  rawResponse: string
}

export async function searchCompetitors(
  idea: string,
  name: string
): Promise<PerplexityCompetitorResult> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured")
  }

  const systemPrompt = `You are a competitive intelligence analyst.
Your task is to identify 3-5 real, currently active competitors for a given business idea.

Prioritize:
- Closest functional match first
- Same target user or customer problem
- Similar core value proposition (not just loosely related tools)

Avoid:
- Generic or broad platforms unless they directly compete
- Tangential or unrelated companies

For each competitor, return:
1. Company name
2. One-line description of what they do
3. Why they are a close competitor
4. Official website URL

If no exact competitors exist, return the nearest adjacent alternatives and clearly state that they are partial matches.

Return your response as a JSON object with this exact structure:
{
  "competitors": [
    {
      "name": "CompanyName",
      "description": "What they do",
      "whyCompetes": "Why they compete with the idea",
      "url": "https://example.com"
    }
  ]
}

Only include real companies. Only return valid JSON with no other text.`

  const userPrompt = `Find 3-5 real competitors for this business idea:
Business Name: ${name}
Business Idea: ${idea}

Return the JSON object with competitors as described in your instructions.`

  const response = await perplexity.chat.completions.create({
    model: "sonar-pro",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 2048,
    temperature: 0.2,
  })

  const rawResponse = response.choices[0]?.message?.content || ""

  try {
    // Extract JSON from response (Perplexity may wrap it in markdown code blocks)
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { competitors: [] }
    return { competitors: parsed.competitors || [], rawResponse }
  } catch {
    // If JSON parsing fails, return empty competitors but preserve raw response
    // The synthesis step will still run with whatever context is available
    console.warn("[Perplexity] Failed to parse JSON response, using raw text")
    return { competitors: [], rawResponse }
  }
}

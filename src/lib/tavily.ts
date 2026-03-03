export interface TavilyExtractResult {
  url: string
  content: string
  title?: string
}

export interface TavilyExtractResponse {
  results: TavilyExtractResult[]
  failed_results: Array<{ url: string; error: string }>
}

export async function extractCompetitorInfo(
  urls: string[]
): Promise<TavilyExtractResponse> {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error("Tavily API key not configured")
  }

  // Filter out bad URLs and cap at 5 (one per competitor)
  const cleanUrls = urls
    .filter((u) => u && u.startsWith("http"))
    .slice(0, 5)

  if (cleanUrls.length === 0) {
    return { results: [], failed_results: [] }
  }

  const response = await fetch("https://api.tavily.com/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      urls: cleanUrls,
    }),
    signal: AbortSignal.timeout(30000), // 30s timeout
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Tavily extract failed: ${response.status} - ${errorText}`)
  }

  return response.json()
}

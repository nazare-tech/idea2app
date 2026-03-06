// Converts bare URLs in generated markdown into clickable markdown links.
// This helps when upstream providers return plain text URLs instead of [text](url).
export function linkifyBareUrls(markdown: string): string {
  // Skip URLs that are already part of markdown links: [text](url)
  const existingLinkUrlPattern = /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/g
  const existingLinkUrls = new Set<string>()

  for (const match of markdown.matchAll(existingLinkUrlPattern)) {
    if (match[1]) {
      existingLinkUrls.add(match[1])
    }
  }

  // Match http(s) URLs and www.* domains that are not already markdown links.
  return markdown.replace(/(^|\s)(https?:\/\/[^\s)\]]+|www\.[^\s)\]]+)/g, (full, prefix: string, rawUrl: string) => {
    const trailingPunctuationMatch = rawUrl.match(/[.,!?;:]+$/)
    const trailingPunctuation = trailingPunctuationMatch ? trailingPunctuationMatch[0] : ""
    const url = trailingPunctuation ? rawUrl.slice(0, -trailingPunctuation.length) : rawUrl

    const normalizedUrl = url.startsWith("www.") ? `https://${url}` : url

    // Keep URL unchanged if it's already linked elsewhere in the markdown.
    if (existingLinkUrls.has(normalizedUrl) || existingLinkUrls.has(url)) {
      return full
    }

    return `${prefix}[${url}](${normalizedUrl})${trailingPunctuation}`
  })
}


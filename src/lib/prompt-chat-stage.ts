export type PromptChatStage = "questions" | "gathering" | "summary" | "post_summary"

export type PromptChatHistoryMessage = {
  role?: string | null
  content?: string | null
  metadata?: unknown
}

const IDEA_REFINEMENT_VERBS = [
  "change",
  "update",
  "modify",
  "adjust",
  "pivot",
  "refine",
  "clarify",
  "narrow",
  "broaden",
  "focus",
  "target",
  "reposition",
  "switch",
  "replace",
  "add",
  "remove",
  "include",
  "exclude",
  "instead",
  "actually",
  "rather",
]

const IDEA_DOMAIN_TERMS = [
  "audience",
  "customer",
  "user",
  "persona",
  "problem",
  "pain point",
  "solution",
  "feature",
  "workflow",
  "use case",
  "market",
  "segment",
  "niche",
  "positioning",
  "business model",
  "revenue",
  "pricing",
  "subscription",
  "buyer",
  "seller",
  "competitor",
  "differentiat",
  "distribution",
  "go-to-market",
  "gtm",
  "mvp",
]

const GENERAL_QUESTION_PREFIXES = [
  "what",
  "why",
  "how",
  "when",
  "where",
  "who",
  "can",
  "could",
  "should",
  "would",
  "do",
  "does",
  "did",
  "is",
  "are",
]

function normalizePromptChatText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function countPromptChatMatches(text: string, phrases: string[]) {
  return phrases.reduce((count, phrase) => {
    if (!phrase) return count
    return text.includes(phrase) ? count + 1 : count
  }, 0)
}

function getPromptChatWordCount(message: string) {
  return normalizePromptChatText(message).split(" ").filter(Boolean).length
}

function getLatestPromptChatAssistantQuestion(history: PromptChatHistoryMessage[] = []) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const message = history[i]
    const metadata = message.metadata as { stage?: string } | null
    if (message.role === "assistant" && metadata?.stage === "questions") {
      return typeof message.content === "string" ? message.content : ""
    }
  }
  return ""
}

export function shouldResummarizePromptChatMessage(message: string) {
  const normalized = normalizePromptChatText(message)
  if (!normalized) return false

  const wordCount = getPromptChatWordCount(message)
  const refinementHits = countPromptChatMatches(normalized, IDEA_REFINEMENT_VERBS)
  const domainHits = countPromptChatMatches(normalized, IDEA_DOMAIN_TERMS)
  const startsAsQuestion = GENERAL_QUESTION_PREFIXES.some(prefix =>
    normalized.startsWith(`${prefix} `)
  )
  const asksForAdvice = /(what do you think|is this good|does this make sense|which is better|what should i do)/.test(normalized)
  const explicitSummaryRequest = /(summari[sz]e|rewrite the summary|update the summary|refresh the summary)/.test(normalized)
  const explicitIdeaEdit = /(change it to|make it for|instead of|the target audience is|the business model is|the main feature is|the problem is)/.test(normalized)

  if (explicitSummaryRequest || explicitIdeaEdit) return true

  if (startsAsQuestion && refinementHits === 0 && domainHits < 2 && !asksForAdvice) {
    return false
  }

  if (refinementHits >= 1 && domainHits >= 1) return true
  if (domainHits >= 3 && wordCount >= 12) return true
  if (asksForAdvice && domainHits >= 2) return false

  return false
}

export function shouldSummarizePromptChatReply(message: string, history: PromptChatHistoryMessage[] = []) {
  const normalized = normalizePromptChatText(message)
  if (!normalized) return false

  const wordCount = getPromptChatWordCount(message)
  const domainHits = countPromptChatMatches(normalized, IDEA_DOMAIN_TERMS)
  const refinementHits = countPromptChatMatches(normalized, IDEA_REFINEMENT_VERBS)
  const lineCount = message.split(/\n+/).map(line => line.trim()).filter(Boolean).length
  const numberedAnswerCount = message.split(/\n+/)
    .map(line => line.trim())
    .filter(line => /^\d+[\.)]\s+/.test(line)).length
  const latestQuestionPrompt = getLatestPromptChatAssistantQuestion(history)
  const questionCount = latestQuestionPrompt.split(/\n+/)
    .map(line => line.trim())
    .filter(line => /^\d+[\.)]\s+\*\*/.test(line)).length

  if (numberedAnswerCount >= 3) return true
  if (lineCount >= 4 && wordCount >= 25) return true
  if (wordCount >= 60) return true
  if (questionCount >= 4 && wordCount >= 30 && (domainHits >= 2 || refinementHits >= 1)) return true
  if (domainHits >= 4 && wordCount >= 20) return true

  return false
}

export function determinePromptChatStage(params: {
  isInitial: boolean
  hasSummary: boolean
  history: PromptChatHistoryMessage[]
  message: string
}): PromptChatStage {
  const { isInitial, hasSummary, history, message } = params
  const messageCount = history.length

  if (isInitial) {
    return "questions"
  }

  if (!hasSummary) {
    if (shouldSummarizePromptChatReply(message, history)) {
      return "summary"
    }

    if (messageCount >= 2) {
      return "gathering"
    }

    return "questions"
  }

  return shouldResummarizePromptChatMessage(message) ? "summary" : "post_summary"
}

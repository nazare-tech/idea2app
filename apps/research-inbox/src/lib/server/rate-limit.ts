const requests = new Map<string, number[]>()

export function checkReplyRateLimit(key: string, limit = 20, windowMs = 60 * 60 * 1_000) {
  const cutoff = Date.now() - windowMs
  const recent = (requests.get(key) ?? []).filter((time) => time > cutoff)
  if (recent.length >= limit) return false
  recent.push(Date.now())
  requests.set(key, recent)
  return true
}

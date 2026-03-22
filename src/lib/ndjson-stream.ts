export async function consumeNdjsonStream<T>(
  response: Response,
  onEvent: (event: T) => void | Promise<void>
) {
  if (!response.body) {
    throw new Error("Stream response had no body")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.trim()) continue
      await onEvent(JSON.parse(line) as T)
    }
  }
}

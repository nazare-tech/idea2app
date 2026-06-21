export type LogLevel = "info" | "warn" | "error"

export type LogContext = Record<string, unknown>

export interface NormalizedLogError {
  name?: string
  message: string
  status?: number
  code?: string
}

const REDACTED = "[redacted]"
const MAX_STRING_LENGTH = 1_000
const MAX_ARRAY_LENGTH = 10
const MAX_OBJECT_DEPTH = 5
const SENSITIVE_VALUE = "[redacted]"

const SENSITIVE_KEY_PARTS = [
  "password",
  "secret",
  "token",
  "apikey",
  "authorization",
  "cookie",
  "signature",
  "session",
  "prompt",
  "body",
  "email",
  "signedurl",
  "imageurl",
  "htmlurl",
  "base64",
  "rawpayload",
  "messages",
]

const SENSITIVE_MESSAGE_KEY_PATTERN =
  "password|secret|access[-_ ]?token|refresh[-_ ]?token|token|x[-_ ]?api[-_ ]?key|api[-_ ]?key|apikey|authorization|cookie|signature|session|prompt|body|email|signed[-_ ]?url|image[-_ ]?url|html[-_ ]?url|base64|raw[-_ ]?payload|content|messages|idea"

const SENSITIVE_KEYED_BLOCK_PATTERN = new RegExp(
  `(["']?)(${SENSITIVE_MESSAGE_KEY_PATTERN})\\1\\s*([:=])\\s*(\\{[^{}]*\\}|\\[[^\\[\\]]*\\])`,
  "gi",
)
const SENSITIVE_KEYED_DOUBLE_QUOTED_PATTERN = new RegExp(
  `(["']?)(${SENSITIVE_MESSAGE_KEY_PATTERN})\\1\\s*([:=])\\s*"[^"\\\\]*(?:\\\\.[^"\\\\]*)*"`,
  "gi",
)
const SENSITIVE_KEYED_SINGLE_QUOTED_PATTERN = new RegExp(
  `(["']?)(${SENSITIVE_MESSAGE_KEY_PATTERN})\\1\\s*([:=])\\s*'[^'\\\\]*(?:\\\\.[^'\\\\]*)*'`,
  "gi",
)
const SENSITIVE_KEYED_BARE_PATTERN = new RegExp(
  `(["']?)(${SENSITIVE_MESSAGE_KEY_PATTERN})\\1\\s*([:=])\\s*[^\\s,;}]+`,
  "gi",
)

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[-_]/g, "").toLowerCase()
  return (
    normalized === "content" ||
    normalized.endsWith("content") ||
    SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part))
  )
}

function truncateString(value: string): string {
  return value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value
}

function sanitizeLogMessage(value: string): string {
  return truncateString(
    value
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${SENSITIVE_VALUE}`)
      .replace(/\b(?:sk|pk|rk)_(?:live|test|proj)_[A-Za-z0-9._-]+/g, SENSITIVE_VALUE)
      .replace(/\bsk-or-v1-[A-Za-z0-9._-]+/g, SENSITIVE_VALUE)
      .replace(/\bwhsec_[A-Za-z0-9._-]+/g, SENSITIVE_VALUE)
      .replace(
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
        SENSITIVE_VALUE,
      )
      .replace(
        /https?:\/\/[^\s"'<>]*(?:token|signature|signed|X-Amz-Signature)[^\s"'<>]*/gi,
        SENSITIVE_VALUE,
      )
      .replace(SENSITIVE_KEYED_BLOCK_PATTERN, (_match, quote, key, separator) =>
        `${quote}${key}${quote}${separator}${SENSITIVE_VALUE}`,
      )
      .replace(SENSITIVE_KEYED_DOUBLE_QUOTED_PATTERN, (_match, quote, key, separator) =>
        `${quote}${key}${quote}${separator}"${SENSITIVE_VALUE}"`,
      )
      .replace(SENSITIVE_KEYED_SINGLE_QUOTED_PATTERN, (_match, quote, key, separator) =>
        `${quote}${key}${quote}${separator}'${SENSITIVE_VALUE}'`,
      )
      .replace(SENSITIVE_KEYED_BARE_PATTERN, (_match, quote, key, separator) =>
        `${quote}${key}${quote}${separator}${SENSITIVE_VALUE}`,
      ),
  )
}

function sanitizeValue(key: string, value: unknown, depth: number): unknown {
  if (isSensitiveKey(key)) {
    return REDACTED
  }

  if (value instanceof Error) {
    return normalizeLogError(value)
  }

  if (typeof value === "string") {
    return sanitizeLogMessage(value)
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return value
  }

  if (Array.isArray(value)) {
    const values = value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item, index) => sanitizeValue(String(index), item, depth + 1))
    if (value.length > MAX_ARRAY_LENGTH) {
      values.push("[truncated]")
    }
    return values
  }

  if (typeof value === "object") {
    if (depth >= MAX_OBJECT_DEPTH) {
      return "[truncated]"
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeValue(entryKey, entryValue, depth + 1),
      ]),
    )
  }

  return String(value)
}

export function sanitizeLogContext(context: LogContext = {}): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, sanitizeValue(key, value, 0)]),
  )
}

function readNumberProperty(value: object, property: string): number | undefined {
  const raw = (value as Record<string, unknown>)[property]
  return typeof raw === "number" ? raw : undefined
}

function readStringProperty(value: object, property: string): string | undefined {
  const raw = (value as Record<string, unknown>)[property]
  return typeof raw === "string" ? sanitizeLogMessage(raw) : undefined
}

export function normalizeLogError(error: unknown): NormalizedLogError {
  if (error instanceof Error) {
    const normalized: NormalizedLogError = {
      name: error.name,
      message: sanitizeLogMessage(error.message),
    }
    const status = readNumberProperty(error, "status")
    const code = readStringProperty(error, "code")
    if (status !== undefined) normalized.status = status
    if (code !== undefined) normalized.code = code
    return normalized
  }

  if (typeof error === "object" && error !== null) {
    const message = readStringProperty(error, "message") ?? "Unknown error"
    const normalized: NormalizedLogError = { message }
    const name = readStringProperty(error, "name")
    const status = readNumberProperty(error, "status")
    const code = readStringProperty(error, "code")
    if (name !== undefined) normalized.name = name
    if (status !== undefined) normalized.status = status
    if (code !== undefined) normalized.code = code
    return normalized
  }

  return {
    message: sanitizeLogMessage(String(error)),
  }
}

function writeLog(
  level: LogLevel,
  scope: string,
  event: string,
  context: LogContext = {},
  error?: unknown,
): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    event,
    context: sanitizeLogContext(context),
    ...(error !== undefined ? { error: normalizeLogError(error) } : {}),
  }
  const message = JSON.stringify(payload)

  if (level === "error") {
    console.error(message)
  } else if (level === "warn") {
    console.warn(message)
  } else {
    console.info(message)
  }
}

export function logInfo(scope: string, event: string, context: LogContext = {}): void {
  writeLog("info", scope, event, context)
}

export function logWarn(
  scope: string,
  event: string,
  context: LogContext = {},
  error?: unknown,
): void {
  writeLog("warn", scope, event, context, error)
}

export function logError(
  scope: string,
  event: string,
  error: unknown,
  context: LogContext = {},
): void {
  writeLog("error", scope, event, context, error)
}

export function buildRequestLogContext(
  request: Request,
  context: LogContext = {},
): LogContext {
  const url = new URL(request.url)
  const requestId =
    request.headers.get("x-request-id") ||
    request.headers.get("x-correlation-id") ||
    request.headers.get("cf-ray") ||
    crypto.randomUUID()

  return {
    requestId,
    method: request.method,
    pathname: url.pathname,
    ...context,
  }
}

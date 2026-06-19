import * as Sentry from "@sentry/nextjs"

type LogLevel = "debug" | "info" | "warn" | "error"
type LogContext = Record<string, unknown>

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    }
  }

  return error
}

function writeConsole(level: LogLevel, message: string, context: LogContext) {
  const payload = {
    level,
    message,
    ts: new Date().toISOString(),
    ...context,
  }

  if (process.env.NODE_ENV === "production") {
    const line = JSON.stringify(payload)
    if (level === "error") console.error(line)
    else if (level === "warn") console.warn(line)
    else if (level === "debug") console.debug(line)
    else console.info(line)
    return
  }

  if (level === "error") console.error(message, context)
  else if (level === "warn") console.warn(message, context)
  else if (level === "debug") console.debug(message, context)
  else console.info(message, context)
}

function captureWithSentry(level: LogLevel, message: string, context: LogContext) {
  if (level === "error" && context.error instanceof Error) {
    Sentry.captureException(context.error, { extra: context })
    return
  }

  if (level === "error" || level === "warn") {
    Sentry.captureMessage(message, {
      level: level === "warn" ? "warning" : "error",
      extra: context,
    })
  }
}

function log(level: LogLevel, message: string, context: LogContext = {}) {
  const normalizedContext = {
    ...context,
    error: normalizeError(context.error),
  }

  writeConsole(level, message, normalizedContext)
  captureWithSentry(level, message, context)
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
}

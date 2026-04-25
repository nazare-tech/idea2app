export const DEFAULT_AUTH_REDIRECT_FALLBACK = "/projects"

export const DEFAULT_ALLOWED_AUTH_REDIRECT_PATH_PREFIXES = [
  "/dashboard",
  "/projects",
  "/billing",
  "/preferences",
  "/reset-password",
] as const

export const DEFAULT_AUTH_REDIRECT_PARAM_NAMES = ["next", "redirect"] as const

export type SafeRedirectOptions = {
  fallback?: string
  allowedPathPrefixes?: readonly string[]
}

export type AuthRedirectParamSource =
  | URLSearchParams
  | Pick<URLSearchParams, "get">
  | Record<string, unknown>

type SafeRedirectParseResult = {
  path: string
}

const SAFE_REDIRECT_BASE_URL = "https://idea2app.local"
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/

export function sanitizeInternalRedirect(
  value: unknown,
  options: SafeRedirectOptions = {}
): string {
  const allowedPathPrefixes = normalizeAllowedPathPrefixes(options.allowedPathPrefixes)
  const parsed = parseSafeInternalRedirect(value, allowedPathPrefixes)

  if (parsed) {
    return parsed.path
  }

  const fallback = parseSafeInternalRedirect(
    options.fallback ?? DEFAULT_AUTH_REDIRECT_FALLBACK,
    allowedPathPrefixes
  )

  return fallback?.path ?? allowedPathPrefixes[0] ?? DEFAULT_AUTH_REDIRECT_FALLBACK
}

export function isSafeInternalRedirect(
  value: unknown,
  options: Omit<SafeRedirectOptions, "fallback"> = {}
): boolean {
  return parseSafeInternalRedirect(
    value,
    normalizeAllowedPathPrefixes(options.allowedPathPrefixes)
  ) !== null
}

export function getSafeAuthRedirect(
  params: AuthRedirectParamSource,
  options: SafeRedirectOptions & { paramNames?: readonly string[] } = {}
): string {
  const paramNames = options.paramNames ?? DEFAULT_AUTH_REDIRECT_PARAM_NAMES

  for (const name of paramNames) {
    const value = getParamValue(params, name)

    if (value != null) {
      return sanitizeInternalRedirect(value, options)
    }
  }

  return sanitizeInternalRedirect(null, options)
}

function parseSafeInternalRedirect(
  value: unknown,
  allowedPathPrefixes: readonly string[]
): SafeRedirectParseResult | null {
  if (typeof value !== "string") {
    return null
  }

  const candidate = value.trim()

  if (
    candidate === "" ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    CONTROL_CHAR_PATTERN.test(candidate)
  ) {
    return null
  }

  let url: URL

  try {
    url = new URL(candidate, SAFE_REDIRECT_BASE_URL)
  } catch {
    return null
  }

  if (url.origin !== SAFE_REDIRECT_BASE_URL || !isAllowedPath(url.pathname, allowedPathPrefixes)) {
    return null
  }

  return {
    path: `${url.pathname}${url.search}${url.hash}`,
  }
}

function normalizeAllowedPathPrefixes(pathPrefixes?: readonly string[]): string[] {
  const source =
    pathPrefixes && pathPrefixes.length > 0
      ? pathPrefixes
      : DEFAULT_ALLOWED_AUTH_REDIRECT_PATH_PREFIXES

  const normalized = source
    .map((prefix) => prefix.trim())
    .filter((prefix) => prefix.startsWith("/") && !prefix.startsWith("//"))
    .map((prefix) => {
      if (prefix === "/") {
        return prefix
      }

      return prefix.endsWith("/") ? prefix.slice(0, -1) : prefix
    })

  return [...new Set(normalized)]
}

function isAllowedPath(pathname: string, allowedPathPrefixes: readonly string[]): boolean {
  return allowedPathPrefixes.some((prefix) => {
    if (prefix === "/") {
      return true
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  })
}

function getParamValue(params: AuthRedirectParamSource, name: string): unknown {
  if ("get" in params && typeof params.get === "function") {
    return params.get(name)
  }

  const value = (params as Record<string, unknown>)[name]

  return Array.isArray(value) ? value[0] : value
}

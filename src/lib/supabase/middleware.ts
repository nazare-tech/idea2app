import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSafeAuthRedirect } from '@/lib/safe-redirect'

const SUPABASE_AUTH_COOKIE_PATTERN = /^sb-.+-auth-token(?:\.\d+)?$/
const RECOVERABLE_AUTH_COOKIE_ERRORS = new Set([
  'invalid_refresh_token',
  'refresh_token_not_found',
  'session_not_found',
])

function isRecoverableAuthCookieError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const authError = error as { code?: string; message?: string }
  if (authError.code && RECOVERABLE_AUTH_COOKIE_ERRORS.has(authError.code)) {
    return true
  }

  const message = authError.message?.toLowerCase() ?? ''
  return message.includes('invalid refresh token') || message.includes('refresh token not found')
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies
    .getAll()
    .filter((cookie) => SUPABASE_AUTH_COOKIE_PATTERN.test(cookie.name))
    .forEach((cookie) => {
      response.cookies.set(cookie.name, '', {
        path: '/',
        maxAge: 0,
      })
    })
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const shouldClearAuthCookies = isRecoverableAuthCookieError(authError)
  if (shouldClearAuthCookies) {
    clearSupabaseAuthCookies(request, supabaseResponse)
  }

  // Protected routes
  const protectedPaths = ['/dashboard', '/projects', '/billing', '/preferences']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    // Redirect to auth if accessing protected route without auth
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    const redirectResponse = NextResponse.redirect(url)
    if (shouldClearAuthCookies) {
      clearSupabaseAuthCookies(request, redirectResponse)
    }
    return redirectResponse
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/auth', '/forgot-password', '/reset-password']
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname === path
  )

  if (isAuthPath && user) {
    const url = request.nextUrl.clone()
    const redirectPath = getSafeAuthRedirect(request.nextUrl.searchParams)
    const redirectUrl = new URL(redirectPath, request.nextUrl.origin)
    url.pathname = redirectUrl.pathname
    url.search = redirectUrl.search
    url.hash = redirectUrl.hash
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

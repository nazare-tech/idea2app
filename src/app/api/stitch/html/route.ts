import { NextResponse } from "next/server"

/**
 * Server-side proxy for Stitch HTML download URLs.
 * Fetches the HTML from Google's CDN (no CORS restrictions server-side)
 * and returns it without X-Frame-Options, allowing iframe srcdoc rendering.
 *
 * GET /api/stitch/html?url=<encoded-stitch-download-url>
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  // Only allow Google's Stitch CDN domains
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  const allowed = ["contribution.usercontent.google.com", "lh3.googleusercontent.com"]
  if (!allowed.includes(parsed.hostname)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 })
  }

  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: 502 })
    }

    const html = await res.text()
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // No X-Frame-Options — allows srcdoc/iframe embedding from same origin
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (err) {
    console.error("[Stitch HTML proxy] fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch HTML" }, { status: 502 })
  }
}

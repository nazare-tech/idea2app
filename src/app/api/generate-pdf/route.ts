import { existsSync } from "node:fs"
import { NextResponse } from "next/server"
import puppeteer from "puppeteer"
import { marked } from "marked"
import { renderMermaid } from "beautiful-mermaid"

import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 300

const MAX_MARKDOWN_LENGTH = 250_000

type PdfBody = {
  projectId?: unknown
  documentId?: unknown
  documentType?: unknown
}

type PdfDocument = {
  content: string
  projectName: string
  documentType: string
}

function resolveChromeExecutablePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((value): value is string => Boolean(value))

  return candidates.find((candidate) => existsSync(candidate))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = checkRateLimit({
    key: `generate-pdf:${user.id}:${getClientIp(request)}`,
    limit: 10,
    windowMs: 60_000,
  })
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many PDF requests. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    )
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

  try {
    const body = (await request.json()) as PdfBody
    const projectId = typeof body.projectId === "string" ? body.projectId : ""
    const documentId = typeof body.documentId === "string" ? body.documentId : ""
    const documentType = typeof body.documentType === "string" ? body.documentType : ""

    if (!projectId || !documentType) {
      return NextResponse.json(
        { error: "projectId and documentType are required" },
        { status: 400 },
      )
    }

    const document = await loadOwnedDocument({
      supabase,
      userId: user.id,
      projectId,
      documentId,
      documentType,
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (document.content.length > MAX_MARKDOWN_LENGTH) {
      return NextResponse.json({ error: "Document is too large to export" }, { status: 413 })
    }

    const htmlContent = await renderMarkdownToHTML(document.content)
    const html = generateHTMLTemplate(htmlContent, document.projectName, document.documentType)
    const executablePath = resolveChromeExecutablePath()

    browser = await puppeteer.launch({
      headless: true,
      args: ["--disable-setuid-sandbox"],
      ...(process.env.NODE_ENV !== "production" ? { args: ["--no-sandbox", "--disable-setuid-sandbox"] } : {}),
      ...(executablePath ? { executablePath } : {}),
    })

    const page = await browser.newPage()
    await page.setJavaScriptEnabled(false)
    await page.setRequestInterception(true)
    page.on("request", (interceptedRequest) => {
      const requestUrl = interceptedRequest.url()
      if (requestUrl.startsWith("data:") || requestUrl.startsWith("about:")) {
        interceptedRequest.continue()
        return
      }
      interceptedRequest.abort()
    })

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    })

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
      printBackground: true,
      preferCSSPageSize: false,
    })

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildPdfFilename(document.projectName, document.documentType)}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    )
  } finally {
    if (browser) await browser.close()
  }
}

async function loadOwnedDocument({
  supabase,
  userId,
  projectId,
  documentId,
  documentType,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  userId: string
  projectId: string
  documentId: string
  documentType: string
}): Promise<PdfDocument | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single()

  if (!project) return null

  if (documentType === "prompt") {
    return {
      content: project.description ?? "",
      projectName: project.name ?? "Project Document",
      documentType: "Prompt",
    }
  }

  if (!documentId) return null

  if (documentType === "prd") {
    const { data } = await supabase
      .from("prds")
      .select("content")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .single()
    return data ? toPdfDocument(data.content, project.name, "PRD") : null
  }

  if (documentType === "mvp" || documentType === "mvp-plan") {
    const { data } = await supabase
      .from("mvp_plans")
      .select("content")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .single()
    return data ? toPdfDocument(data.content, project.name, "MVP Plan") : null
  }

  if (documentType === "techspec" || documentType === "tech-spec") {
    const { data } = await supabase
      .from("tech_specs")
      .select("content")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .single()
    return data ? toPdfDocument(data.content, project.name, "Tech Spec") : null
  }

  if (documentType === "competitive" || documentType === "competitive-analysis") {
    const { data } = await supabase
      .from("analyses")
      .select("content, type")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .eq("type", "competitive-analysis")
      .single()
    return data ? toPdfDocument(data.content, project.name, "Competitive Analysis") : null
  }

  if (documentType === "launch" || documentType === "launch-plan") {
    const { data } = await supabase
      .from("analyses")
      .select("content, type")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .eq("type", "launch-plan")
      .single()
    return data ? toPdfDocument(data.content, project.name, "Marketing Plan") : null
  }

  return null
}

function toPdfDocument(content: string, projectName: string, documentType: string): PdfDocument {
  return {
    content,
    projectName,
    documentType,
  }
}

async function renderMarkdownToHTML(markdown: string): Promise<string> {
  marked.setOptions({
    breaks: true,
    gfm: true,
  })

  let html = sanitizeHtml(marked(markdown) as string)
  const mermaidRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g
  const mermaidMatches = [...html.matchAll(mermaidRegex)]
  const mermaidTheme = {
    bg: "#FFFFFF",
    fg: "#000000",
    line: "#1F2937",
    accent: "#DC2626",
    muted: "#F5F5F5",
    font: "ui-monospace, 'IBM Plex Mono', monospace",
    textColor: "#000000",
    primaryTextColor: "#000000",
    secondaryTextColor: "#000000",
    tertiaryTextColor: "#000000",
    nodeTextColor: "#000000",
    labelTextColor: "#000000",
    edgeLabelText: "#000000",
    clusterTextColor: "#000000",
    darkTextColor: "#000000",
    mainContrastColor: "#000000",
    primaryColor: "#1E3A8A",
    primaryBorderColor: "#1E40AF",
    secondaryColor: "#374151",
    secondaryBorderColor: "#1F2937",
    tertiaryColor: "#0F766E",
    tertiaryBorderColor: "#115E59",
    mainBkg: "#1E3A8A",
    secondBkg: "#374151",
    tertiaryBkg: "#0F766E",
    clusterBkg: "#1F2937",
    clusterBorder: "#374151",
    lineColor: "#1F2937",
    arrowheadColor: "#1F2937",
    nodeBorder: "#1F2937",
    defaultLinkColor: "#1F2937",
  }

  for (const match of mermaidMatches) {
    try {
      const mermaidCode = decodeHtmlEntities(match[1].trim())
      const svg = await renderMermaid(mermaidCode, mermaidTheme)
      html = html.replace(match[0], `<div class="mermaid-diagram-wrapper">${sanitizeHtml(svg)}</div>`)
    } catch (error) {
      console.error("Error rendering mermaid diagram:", error)
    }
  }

  return html
}

function sanitizeHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "")
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildPdfFilename(projectName: string, documentType: string) {
  const safeName = `${projectName}-${documentType}-${new Date().toISOString().slice(0, 10)}`
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)

  return `${safeName || "document"}.pdf`
}

function generateHTMLTemplate(
  content: string,
  projectName: string,
  analysisType: string,
): string {
  const safeProjectName = escapeHtml(projectName)
  const safeAnalysisType = escapeHtml(analysisType)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeProjectName} - ${safeAnalysisType}</title>
  <style>
    :root {
      --font-weight-bold: 700;
      --font-weight-semibold: 600;
      --accent-color: #00d4ff;
      --text-primary: #1a1a1a;
      --text-secondary: #666;
      --text-muted: #999;
    }

    @page { margin: 20mm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-primary);
      background: #ffffff;
    }
    .header { margin-bottom: 30px; border-bottom: 2px solid var(--accent-color); padding-bottom: 20px; }
    .header h1 { margin: 0 0 10px 0; font-size: 26px; color: var(--text-primary); }
    .header .analysis-type { margin: 0; font-size: 15px; color: #666; text-transform: capitalize; }
    .header .date { margin: 10px 0 0 0; font-size: 11px; color: #999; }
    .content h1 { font-size: 24px; margin: 30px 0 15px 0; color: #1a1a1a; font-weight: var(--font-weight-bold); page-break-after: avoid; }
    .content h2 { font-size: 20px; margin: 25px 0 12px 0; color: var(--text-primary); font-weight: var(--font-weight-semibold); page-break-after: avoid; }
    .content h3 { font-size: 18px; margin: 20px 0 10px 0; color: var(--text-primary); font-weight: var(--font-weight-semibold); page-break-after: avoid; }
    .content h4 { font-size: 16px; margin: 15px 0 8px 0; color: var(--text-primary); font-weight: var(--font-weight-semibold); page-break-after: avoid; }
    .content p { margin: 12px 0; color: #333; }
    .content ul, .content ol { margin: 12px 0; padding-left: 25px; color: #333; }
    .content li { margin: 6px 0; }
    .content strong { color: #000; font-weight: var(--font-weight-semibold); }
    .content code { background: #f5f5f5; padding: 3px 8px; border-radius: 4px; font-family: 'Courier New', Consolas, monospace; font-size: 12px; color: var(--text-primary); border: 1px solid #e0e0e0; }
    .content pre { background: #f8f9fa; padding: 16px 20px; border-radius: 6px; overflow-x: auto; margin: 20px 0; border: 1px solid #e0e0e0; page-break-inside: avoid; }
    .content pre code { background: none; padding: 0; border: none; color: #1a1a1a; display: block; white-space: pre-wrap; word-wrap: break-word; }
    .content blockquote { border-left: 4px solid var(--accent-color); padding-left: 15px; margin: 15px 0; color: #555; font-style: italic; }
    .content table { border-collapse: collapse; width: 100%; margin: 15px 0; page-break-inside: avoid; }
    .content th, .content td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    .content th { background: #f5f5f5; font-weight: var(--font-weight-semibold); }
    .content a { color: var(--accent-color); text-decoration: none; }
    .mermaid-diagram-wrapper { margin: 15px 0; padding: 15px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; page-break-inside: avoid; display: flex; justify-content: center; align-items: center; }
    .mermaid-diagram-wrapper svg { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${safeProjectName}</h1>
    <p class="analysis-type">${safeAnalysisType.replace(/-/g, " ")}</p>
    <p class="date">${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}</p>
  </div>

  <div class="content">
    ${content}
  </div>
</body>
</html>
  `.trim()
}

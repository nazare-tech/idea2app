import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export async function downloadMarkdownAsPDF(
  content: string,
  filename: string,
  projectName: string,
  analysisType: string
) {
  try {
    // Create a temporary container to render the markdown
    const container = document.createElement("div")
    container.style.position = "absolute"
    container.style.left = "-9999px"
    container.style.top = "0"
    container.style.width = "800px"
    container.style.padding = "40px"
    container.style.backgroundColor = "#ffffff"
    container.style.fontFamily = "system-ui, -apple-system, sans-serif"
    container.style.fontSize = "14px"
    container.style.lineHeight = "1.6"
    container.style.color = "#1a1a1a"

    // Add header
    const header = document.createElement("div")
    header.style.marginBottom = "30px"
    header.style.borderBottom = "2px solid #00d4ff"
    header.style.paddingBottom = "20px"
    header.innerHTML = `
      <h1 style="margin: 0 0 10px 0; font-size: 28px; color: #1a1a1a;">${projectName}</h1>
      <p style="margin: 0; font-size: 16px; color: #666; text-transform: capitalize;">${analysisType.replace(/-/g, " ")}</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</p>
    `
    container.appendChild(header)

    // Create a temporary div for markdown content
    const contentDiv = document.createElement("div")
    contentDiv.className = "pdf-content"
    contentDiv.innerHTML = await renderMarkdownToHTML(content)

    // Style the content
    const style = document.createElement("style")
    style.textContent = `
      .pdf-content h1 { font-size: 24px; margin: 30px 0 15px 0; color: #1a1a1a; font-weight: 700; }
      .pdf-content h2 { font-size: 20px; margin: 25px 0 12px 0; color: #1a1a1a; font-weight: 600; }
      .pdf-content h3 { font-size: 18px; margin: 20px 0 10px 0; color: #1a1a1a; font-weight: 600; }
      .pdf-content h4 { font-size: 16px; margin: 15px 0 8px 0; color: #1a1a1a; font-weight: 600; }
      .pdf-content p { margin: 12px 0; color: #333; }
      .pdf-content ul, .pdf-content ol { margin: 12px 0; padding-left: 25px; color: #333; }
      .pdf-content li { margin: 6px 0; }
      .pdf-content strong { color: #000; font-weight: 600; }
      .pdf-content code {
        background: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        color: #00d4ff;
      }
      .pdf-content pre {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 15px 0;
      }
      .pdf-content pre code {
        background: none;
        padding: 0;
      }
      .pdf-content blockquote {
        border-left: 4px solid #00d4ff;
        padding-left: 15px;
        margin: 15px 0;
        color: #555;
        font-style: italic;
      }
      .pdf-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 15px 0;
      }
      .pdf-content th, .pdf-content td {
        border: 1px solid #ddd;
        padding: 10px;
        text-align: left;
      }
      .pdf-content th {
        background: #f5f5f5;
        font-weight: 600;
      }
      .pdf-content a {
        color: #00d4ff;
        text-decoration: none;
      }
    `
    container.appendChild(style)
    container.appendChild(contentDiv)
    document.body.appendChild(container)

    // Convert to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    })

    // Remove temporary container
    document.body.removeChild(container)

    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    // Add image to PDF
    const imgData = canvas.toDataURL("image/png")
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // Add new pages if content is longer
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // Download
    pdf.save(filename)
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw new Error("Failed to generate PDF")
  }
}

// Helper function to convert markdown to HTML
async function renderMarkdownToHTML(markdown: string): Promise<string> {
  // Import marked library for markdown parsing
  const { marked } = await import("marked")

  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true,
  })

  return marked(markdown) as string
}

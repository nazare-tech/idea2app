export async function downloadMarkdownAsPDF(
  content: string,
  filename: string,
  projectName: string,
  analysisType: string
) {
  try {
    // Call the server-side PDF generation API
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        filename,
        projectName,
        analysisType,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to generate PDF")
    }

    // Get the PDF blob from the response
    const blob = await response.blob()

    // Create a download link and trigger download
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw new Error("Failed to generate PDF")
  }
}

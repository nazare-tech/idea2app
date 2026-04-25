export async function downloadMarkdownAsPDF({
  projectId,
  documentType,
  documentId,
}: {
  projectId: string
  documentType: string
  documentId?: string
}) {
  try {
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        documentType,
        documentId,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.error || "Failed to generate PDF")
    }

    const blob = await response.blob()
    const disposition = response.headers.get("content-disposition")
    const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? "document.pdf"
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw new Error("Failed to generate PDF")
  }
}

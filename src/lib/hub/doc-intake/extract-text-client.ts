/**
 * Client-side text extraction from uploaded files (PDF, CSV, plain text).
 * Images without embedded text fall back to manual paste in Smart Setup.
 */

const PASTE_BUFFER_KEY = "hauldesk-paste-buffer"

export async function extractTextFromFile(file: File): Promise<{ text: string; warning?: string }> {
  const name = file.name.toLowerCase()

  if (file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".csv") || name.endsWith(".tsv")) {
    return { text: await file.text() }
  }

  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    try {
      const pdfjs = await import("pdfjs-dist")
      if (typeof window !== "undefined") {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
      }
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
      const parts: string[] = []
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const content = await page.getTextContent()
        parts.push(
          content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
        )
      }
      const text = parts.join("\n").trim()
      if (!text) {
        return {
          text: "",
          warning: "This PDF looks like a scan with no selectable text. Paste the text below or re-export as a text PDF.",
        }
      }
      return { text }
    } catch {
      return { text: "", warning: "Could not read this PDF — paste the text manually below." }
    }
  }

  if (file.type.startsWith("image/")) {
    return {
      text: "",
      warning: "Photo received — use your phone's text scan, or paste copied text below. True OCR is coming; paste works today.",
    }
  }

  return { text: "", warning: "Unsupported file type — try PDF, CSV, or paste text." }
}

export function stashRateConForPaste(text: string) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(PASTE_BUFFER_KEY, text)
  }
}

export function consumePasteBuffer(): string | null {
  if (typeof window === "undefined") return null
  const text = sessionStorage.getItem(PASTE_BUFFER_KEY)
  if (text) sessionStorage.removeItem(PASTE_BUFFER_KEY)
  return text
}

export { PASTE_BUFFER_KEY }

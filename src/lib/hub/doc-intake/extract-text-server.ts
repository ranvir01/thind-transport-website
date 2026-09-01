/**
 * Server-side text extraction (PDF, CSV, plain text).
 *
 * `extract-text-client.ts` is the browser half — it takes a `File` and points
 * pdf.js at a CDN worker. The mailbox poller runs in a Vercel cron with no
 * DOM, no `File`, and no business fetching a worker over the network, so this
 * is the Node mirror: same shapes in and out, `Uint8Array` instead of `File`.
 *
 * The pdf.js setup (legacy build, no worker fetch, no eval, local standard
 * fonts) is the one already proven in `__tests__/pdf-branding.test.ts`.
 * pdfjs-dist is an existing dependency; nothing new is added here.
 */
import path from "node:path"
import { pathToFileURL } from "node:url"

export interface ExtractedText {
  text: string
  /** Set when nothing readable came out. The caller keeps the file anyway. */
  warning?: string
}

const TEXT_EXTENSIONS = [".txt", ".csv", ".tsv", ".eml", ".md"]

function looksLikeText(filename: string, contentType?: string): boolean {
  const name = filename.toLowerCase()
  if (contentType?.startsWith("text/")) return true
  if (contentType === "application/csv") return true
  return TEXT_EXTENSIONS.some((ext) => name.endsWith(ext))
}

function looksLikePdf(filename: string, contentType?: string): boolean {
  return contentType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")
}

/**
 * pdf.js resolves its bundled metrics for the 14 standard fonts from this
 * directory. Without it every rate con set in Helvetica logs font warnings and
 * can drop glyphs — which is exactly the text we are trying to read.
 */
function standardFontDataUrl(): string {
  return pathToFileURL(path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/")).href + "/"
}

async function extractPdfText(bytes: Uint8Array): Promise<ExtractedText> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const pdf = await pdfjs.getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    standardFontDataUrl: standardFontDataUrl(),
  }).promise

  const parts: string[] = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    parts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "))
  }
  return { text: parts.join("\n").trim() }
}

/**
 * Never throws. A rate con we cannot read is still a rate con someone emailed
 * us: the caller stages the draft with the warning attached so the attachment
 * is preserved and a human can open it, rather than the poller losing it the
 * way the old unmatched-mail branch did.
 */
export async function extractTextFromBuffer(
  bytes: Uint8Array,
  filename: string,
  contentType?: string
): Promise<ExtractedText> {
  if (looksLikeText(filename, contentType)) {
    try {
      return { text: new TextDecoder().decode(bytes).trim() }
    } catch {
      return { text: "", warning: "Could not decode this text attachment." }
    }
  }

  if (looksLikePdf(filename, contentType)) {
    let extracted: ExtractedText
    try {
      extracted = await extractPdfText(bytes)
    } catch {
      return { text: "", warning: "Could not read this PDF — open the attachment and enter the load by hand." }
    }
    if (!extracted.text) {
      return {
        text: "",
        warning: "This PDF looks like a scan with no selectable text. Open the attachment to enter the load by hand.",
      }
    }
    return extracted
  }

  if (contentType?.startsWith("image/")) {
    return { text: "", warning: "Photo attachment — no text to read yet. Open it to enter the load by hand." }
  }

  return { text: "", warning: `Unsupported attachment type (${contentType || path.extname(filename) || "unknown"}).` }
}

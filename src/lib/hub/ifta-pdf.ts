/**
 * IFTA-export PDF post-processing. buildIftaPdf (shared pdf.ts builder) lays
 * out the worksheet itself; this module prepends a warnings cover page so an
 * office user printing/transcribing the download can't miss the caveats the
 * on-screen worksheet shows. Lives beside the IFTA domain code because the
 * shared builder in pdf.ts is not export-extensible from here.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib"
import { winAnsiSafe } from "./pdf"

const NAVY = rgb(0.055, 0.086, 0.129)
const AMBER = rgb(0.85, 0.55, 0)
const GRAY = rgb(0.35, 0.39, 0.45)

const PAGE_W = 612 // US Letter, matches pdf.ts
const PAGE_H = 792
const MARGIN = 40
const BODY_SIZE = 10.5
const LINE_H = 15

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Returns the PDF with a warnings page inserted as page 1 (a cover, so the
 * warnings are read before the numbers are transcribed). No warnings → the
 * input bytes are returned untouched.
 */
export async function withIftaWarningsCoverPage(
  pdfBytes: Uint8Array,
  input: { quarter: string; warnings: string[] }
): Promise<Uint8Array> {
  if (input.warnings.length === 0) return pdfBytes

  const doc = await PDFDocument.load(pdfBytes)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.insertPage(0, [PAGE_W, PAGE_H])

  // Same title-bar shape as the worksheet header so the cover reads as part
  // of the same document, with the accent slot carrying the warning.
  page.drawRectangle({ x: 0, y: 752, width: PAGE_W, height: 40, color: NAVY })
  const title = winAnsiSafe(`IFTA WORKSHEET ${input.quarter}`)
  page.drawText(title, { x: MARGIN, y: 766, size: 16, font: bold, color: rgb(1, 1, 1) })
  const badge = "WARNINGS"
  page.drawText(badge, {
    x: PAGE_W - MARGIN - bold.widthOfTextAtSize(badge, 13),
    y: 767, size: 13, font: bold, color: AMBER,
  })

  let y = 712
  page.drawText(winAnsiSafe("Resolve before filing"), { x: MARGIN, y, size: 12, font: bold, color: AMBER })
  y -= 24

  const maxWidth = PAGE_W - MARGIN * 2 - 14
  for (const warning of input.warnings) {
    const lines = wrap(winAnsiSafe(warning), regular, BODY_SIZE, maxWidth)
    page.drawText("-", { x: MARGIN, y, size: BODY_SIZE, font: bold, color: AMBER })
    for (const line of lines) {
      page.drawText(line, { x: MARGIN + 14, y, size: BODY_SIZE, font: regular, color: NAVY })
      y -= LINE_H
    }
    y -= 6
  }

  y -= 8
  for (const line of wrap(
    winAnsiSafe(
      "The worksheet on the following pages was computed while the issues above were outstanding. Resolve them and recompute the quarter in LoadOff before transcribing into the filing portal."
    ),
    regular, 8.5, PAGE_W - MARGIN * 2
  )) {
    page.drawText(line, { x: MARGIN, y, size: 8.5, font: regular, color: GRAY })
    y -= 12
  }

  return doc.save()
}

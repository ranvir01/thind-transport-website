/**
 * The mailbox runs in a cron, so it cannot use extract-text-client (browser
 * `File`, CDN worker). This is the Node half. The cases that matter most are
 * the ones that must NOT throw: a scan with no text layer and a file that is
 * not a PDF at all both arrive by email, and losing them is the failure the
 * Inbox exists to end.
 */
import { describe, expect, it } from "vitest"
import { PDFDocument, StandardFonts } from "pdf-lib"
import { extractTextFromBuffer } from "../doc-intake/extract-text-server"

async function pdfWithText(lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.addPage([612, 792])
  lines.forEach((line, i) => page.drawText(line, { x: 48, y: 720 - i * 18, size: 11, font }))
  return doc.save()
}

describe("extractTextFromBuffer", () => {
  it("reads the text layer out of a real PDF", async () => {
    const bytes = await pdfWithText(["RATE CONFIRMATION", "Load # PCL-99120", "Linehaul: $3,200.00"])
    const { text, warning } = await extractTextFromBuffer(bytes, "ratecon.pdf", "application/pdf")
    expect(warning).toBeUndefined()
    expect(text).toContain("RATE CONFIRMATION")
    expect(text).toContain("PCL-99120")
  })

  it("reads every page, not just the first", async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    doc.addPage([612, 792]).drawText("PAGE ONE", { x: 48, y: 720, size: 11, font })
    doc.addPage([612, 792]).drawText("SIGNATURE PAGE", { x: 48, y: 720, size: 11, font })
    const { text } = await extractTextFromBuffer(await doc.save(), "two.pdf", "application/pdf")
    expect(text).toContain("PAGE ONE")
    expect(text).toContain("SIGNATURE PAGE")
  })

  it("warns instead of throwing on a PDF with no text layer (a scan)", async () => {
    const doc = await PDFDocument.create()
    doc.addPage([612, 792])
    const { text, warning } = await extractTextFromBuffer(await doc.save(), "scan.pdf", "application/pdf")
    expect(text).toBe("")
    expect(warning).toMatch(/scan/i)
  })

  it("warns instead of throwing on bytes that are not a PDF at all", async () => {
    const { text, warning } = await extractTextFromBuffer(
      new TextEncoder().encode("this is not a pdf"),
      "broken.pdf",
      "application/pdf"
    )
    expect(text).toBe("")
    expect(warning).toBeTruthy()
  })

  it("decodes csv and plain text by extension and by content type", async () => {
    const csv = new TextEncoder().encode("ref,city\nPCL-1,Kent\n")
    expect((await extractTextFromBuffer(csv, "loads.csv")).text).toContain("PCL-1")
    expect((await extractTextFromBuffer(csv, "noextension", "text/plain")).text).toContain("PCL-1")
  })

  it("returns a warning — never a throw — for images and unknown types", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    expect((await extractTextFromBuffer(bytes, "logo.png", "image/png")).warning).toBeTruthy()
    expect((await extractTextFromBuffer(bytes, "thing.bin", "application/octet-stream")).warning).toBeTruthy()
  })
})

/**
 * withIftaWarningsCoverPage against real pdf-lib documents: no warnings must
 * return the exact input bytes (no re-serialize churn), warnings must insert
 * a cover as page 1 while keeping the original worksheet pages behind it.
 */
import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { withIftaWarningsCoverPage } from "@/lib/hub/ifta-pdf"

async function basePdf(pages = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([612, 792])
  return doc.save()
}

describe("withIftaWarningsCoverPage", () => {
  it("returns the input bytes untouched when there are no warnings", async () => {
    const pdf = await basePdf()
    const out = await withIftaWarningsCoverPage(pdf, { quarter: "2026Q1", warnings: [] })
    expect(out).toBe(pdf)
  })

  it("inserts one cover page ahead of the existing worksheet pages", async () => {
    const pdf = await basePdf(2)
    const out = await withIftaWarningsCoverPage(pdf, {
      quarter: "2026Q1",
      warnings: ["Missing rates for AZ — these lines are priced at $0. Import rates and recompute before filing."],
    })
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(3)
  })

  it("survives long and non-WinAnsi warning text", async () => {
    const pdf = await basePdf()
    const long =
      "1,234 gal of tractor fuel have no state and are excluded from tax-paid credit and fleet MPG — " +
      "this overstates MPG and understates taxable gallons. Set each purchase's state in Fuel and recompute. " +
      "Kent, WA → Boise, ID"
    const out = await withIftaWarningsCoverPage(pdf, { quarter: "2026Q4", warnings: [long, long, long] })
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(2)
  })
})

/**
 * Invoice / settlement / IFTA / 1099 PDFs carry a diagonal SIMULATION stamp
 * so a printed copy can never be mistaken for a bill or a filing.
 */
import { describe, expect, it } from "vitest"
import path from "node:path"
import { pathToFileURL } from "node:url"
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"
import {
  build1099Pdf,
  buildIftaPdf,
  buildInvoicePdf,
  buildSettlementPdf,
  buildStatementPdf,
} from "../pdf"

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const standardFontDataUrl =
    pathToFileURL(path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/")).href + "/"
  const pdf = await pdfjs.getDocument({
    data: bytes, useWorkerFetch: false, isEvalSupported: false, standardFontDataUrl,
  }).promise
  const page = await pdf.getPage(1)
  const content = await page.getTextContent()
  return content.items.map((item) => ("str" in item ? item.str : "")).join(" ")
}

const brand = { name: "Thind Transport LLC" }

describe("simulation PDF watermark", () => {
  it("stamps an invoice", async () => {
    const withStamp = await buildInvoicePdf({
      brand, number: "THD-INV-1", issuedOn: "2026-08-01", dueOn: "2026-08-31",
      billTo: { name: "Pacific Crest Logistics" }, loadReference: "THD-1008",
      lane: "Kent, WA -> Fresno, CA",
      lines: [{ label: "Linehaul", amountCents: 320000 }],
      totalCents: 320000, remitTo: "Thind Transport LLC", factored: false,
      simulation: true,
    })
    const clean = await buildInvoicePdf({
      brand, number: "THD-INV-1", issuedOn: "2026-08-01", dueOn: "2026-08-31",
      billTo: { name: "Pacific Crest Logistics" }, loadReference: "THD-1008",
      lane: "Kent, WA -> Fresno, CA",
      lines: [{ label: "Linehaul", amountCents: 320000 }],
      totalCents: 320000, remitTo: "Thind Transport LLC", factored: false,
    })
    const stamped = await extractPdfText(withStamp)
    const cleanText = await extractPdfText(clean)
    expect(stamped).toMatch(/SIMULATION/)
    expect(stamped).toMatch(/NOT A REAL DOCUMENT/)
    expect(cleanText).not.toMatch(/NOT A REAL DOCUMENT/)
  })

  it("stamps settlement, statement, IFTA, and 1099 copies", async () => {
    const settlement = await buildSettlementPdf({
      brand, driverName: "Harpreet Singh", periodStart: "2026-08-01", periodEnd: "2026-08-07",
      lines: [{ kind: "earning", label: "Loaded miles", amountCents: 31500 }],
      grossCents: 31500, deductionsCents: 7500, netCents: 24000, simulation: true,
    })
    const statement = await buildStatementPdf({
      brand, customerName: "Pacific Crest", statementDate: "2026-08-26",
      invoices: [{ number: "1", loadReference: "THD-1", dueOn: "2026-09-01", bucket: "current", openCents: 1000 }],
      totalOpenCents: 1000, simulation: true,
    })
    const ifta = await buildIftaPdf({
      brand, quarter: "2026Q3", mileageSource: "ELD", fleetMiles: 10000, fleetGallons: 1600, mpg: 6.25,
      rows: [{
        jurisdiction: "WA", miles: 1000, taxableGallons: 160, taxPaidGallons: 160,
        rate: 0.494, surchargeRate: 0, taxCents: 7904, surchargeCents: 0, netCents: 0,
      }],
      netTaxCents: 0, simulation: true,
    })
    const nec = await build1099Pdf({
      brand, year: 2025, payees: [{ name: "Jasdeep Brar", compensationCents: 8421055 }], simulation: true,
    })
    for (const bytes of [settlement, statement, ifta, nec]) {
      const text = await extractPdfText(bytes)
      expect(text).toMatch(/SIMULATION/)
      expect(text).toMatch(/NOT A REAL DOCUMENT/)
    }
  })
})

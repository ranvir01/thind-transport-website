/**
 * Regression: pdf-lib StandardFonts throw on non-WinAnsi characters — invoice
 * creation died on the "→" every lane contains. The builder sanitizes at the
 * PDF boundary; app strings keep their typography.
 */
import { describe, expect, it } from "vitest"
import { buildInvoicePdf, winAnsiSafe } from "../pdf"

describe("winAnsiSafe", () => {
  it("maps common typography to ASCII", () => {
    expect(winAnsiSafe("Kent, WA → Boise, ID")).toBe("Kent, WA -> Boise, ID")
    expect(winAnsiSafe("Referral bonus — Jasdeep (30 days)")).toBe("Referral bonus - Jasdeep (30 days)")
    expect(winAnsiSafe("It’s “quoted”…")).toBe(`It's "quoted"...`)
  })

  it("de-accents and never leaves chars beyond Latin-1", () => {
    expect(winAnsiSafe("Café Zürich")).toBe("Cafe Zurich")
    expect(winAnsiSafe("载货")).toBe("??")
  })

  it("invoice PDF with an arrow lane builds (the bug that blocked all invoicing)", async () => {
    const bytes = await buildInvoicePdf({
      brand: { name: "Thind Transport", dot: "1234567", mc: "MC-987654" },
      number: "THD-INV-9999",
      issuedOn: "2026-07-03",
      dueOn: "2026-08-02",
      billTo: { name: "Cascade Produce Co." },
      loadReference: "THD-1008",
      customerReference: "BRK—31008",
      lane: "Kent, WA → Los Angeles, CA",
      lines: [{ label: "Linehaul — Kent, WA → Los Angeles, CA", amountCents: 240000 }],
      totalCents: 240000,
      remitTo: "Thind Transport\n123 Main St",
      factored: false,
    })
    expect(bytes.length).toBeGreaterThan(1000)
  })
})

/**
 * Regression: table() columns must sum to 536, not 540 — the row/header shading
 * spans x=36..576 (540 wide) but columns start at x=40, so widths summing to 540
 * push right-aligned text 4pt past the shaded band (IFTA's NET TAX column did;
 * invoice/statement/settlement carried the same latent 4pt overhang). The
 * invariant is now enforced in table() itself instead of relying on a comment.
 */
import { describe, expect, it } from "vitest"
import { buildInvoicePdf, buildSettlementPdf, buildStatementPdf, newBuilder } from "../pdf"

describe("table() column width invariant", () => {
  it("throws when columns sum past 536", async () => {
    const b = await newBuilder()
    expect(() =>
      b.table(
        [
          { header: "DESCRIPTION", width: 420 },
          { header: "AMOUNT", width: 120, align: "right" },
        ],
        []
      )
    ).toThrow(/536/)
  })

  it("accepts columns summing to exactly 536", async () => {
    const b = await newBuilder()
    expect(() =>
      b.table(
        [
          { header: "DESCRIPTION", width: 420 },
          { header: "AMOUNT", width: 116, align: "right" },
        ],
        []
      )
    ).not.toThrow()
  })
})

describe("shipped document tables stay within the shaded band", () => {
  it("invoice builds (DESCRIPTION 420 + AMOUNT 116 = 536)", async () => {
    const bytes = await buildInvoicePdf({
      brand: { name: "Thind Transport" },
      number: "THD-INV-1",
      issuedOn: "2026-07-03",
      dueOn: "2026-08-02",
      billTo: { name: "Cascade Produce Co." },
      loadReference: "THD-1008",
      lane: "Kent, WA -> Seattle, WA",
      lines: [{ label: "Linehaul", amountCents: 100000 }],
      totalCents: 100000,
      remitTo: "Thind Transport",
      factored: false,
    })
    expect(bytes.length).toBeGreaterThan(1000)
  })

  it("statement builds (INVOICE+LOAD+DUE+AGING+OPEN = 536)", async () => {
    const bytes = await buildStatementPdf({
      brand: { name: "Thind Transport" },
      customerName: "Cascade Produce Co.",
      statementDate: "2026-07-03",
      invoices: [{ number: "THD-INV-1", loadReference: "THD-1008", dueOn: "2026-08-02", bucket: "current", openCents: 100000 }],
      totalOpenCents: 100000,
    })
    expect(bytes.length).toBeGreaterThan(1000)
  })

  it("settlement builds (TYPE+DESCRIPTION+AMOUNT = 536)", async () => {
    const bytes = await buildSettlementPdf({
      brand: { name: "Thind Transport" },
      driverName: "Jasdeep Singh",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-07",
      lines: [{ kind: "pay", label: "Linehaul", amountCents: 100000 }],
      grossCents: 100000,
      deductionsCents: 0,
      netCents: 100000,
    })
    expect(bytes.length).toBeGreaterThan(1000)
  })
})

import { describe, expect, it } from "vitest"
import { normalizeQboInvoice, reconcileQboInvoice } from "../integrations/qbo"

describe("QBO invoice row normalization", () => {
  it("maps the documented Query API shape into cents-based fields", () => {
    const row = normalizeQboInvoice({
      Id: "128",
      DocNumber: "INV-1042",
      TotalAmt: 1850.5,
      Balance: 0,
      TxnDate: "2026-06-30",
    })
    expect(row).toEqual({
      external_id: "128",
      docNumber: "INV-1042",
      totalCents: 185050,
      balanceCents: 0,
      txnDate: "2026-06-30",
    })
  })

  it("falls back safely when optional fields are missing or malformed", () => {
    const row = normalizeQboInvoice({ Id: "1" })
    expect(row.docNumber).toBe("")
    expect(row.totalCents).toBe(0)
    expect(row.balanceCents).toBe(0)
    expect(row.txnDate).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })
})

describe("QBO reconciliation decision (pure, no DB)", () => {
  const row = normalizeQboInvoice({ Id: "128", DocNumber: "INV-1042", TotalAmt: 1000, Balance: 0, TxnDate: "2026-06-30" })

  it("records the full amount as newly paid when LoadOff has nothing recorded yet", () => {
    const decision = reconcileQboInvoice(row, 0)
    expect(decision).toEqual({ newlyPaidCents: 100000, reference: "qbo:128:100000" })
  })

  it("records only the delta when LoadOff already has a partial payment", () => {
    const decision = reconcileQboInvoice(row, 40000)
    expect(decision).toEqual({ newlyPaidCents: 60000, reference: "qbo:128:100000" })
  })

  it("is idempotent — a replay after the delta was recorded computes nothing new", () => {
    const first = reconcileQboInvoice(row, 0)!
    const second = reconcileQboInvoice(row, first.newlyPaidCents)
    expect(second).toBeNull()
  })

  it("does nothing when QBO shows no payment yet (balance == total)", () => {
    const unpaid = normalizeQboInvoice({ Id: "9", DocNumber: "INV-2", TotalAmt: 500, Balance: 500 })
    expect(reconcileQboInvoice(unpaid, 0)).toBeNull()
  })

  it("never goes negative — a QBO balance increase (credit memo) doesn't claw back a payment", () => {
    const decision = reconcileQboInvoice(row, 150000)
    expect(decision).toBeNull()
  })
})

/**
 * disputeInvoiceAction must report failure (and skip revalidation) when
 * setInvoiceStatus touches 0 rows — a foreign or missing invoice id —
 * instead of toasting success. Mirrors updateFacilityAction /
 * savePriceBookEntryAction.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Accountant", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/invoices", () => ({
  createInvoiceFromLoad: vi.fn(),
  recordPayment: vi.fn(),
  sendFactoringPacket: vi.fn(),
  setInvoiceStatus: vi.fn(),
  sendCustomerStatement: vi.fn(),
}))
vi.mock("@/lib/hub/settlements", () => ({
  approveSettlement: vi.fn(),
  createAdvance: vi.fn(),
  draftSettlements: vi.fn(),
  markSettlementPaid: vi.fn(),
}))
vi.mock("@/lib/hub/expenses", () => ({ createExpense: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/integrations/factor", () => ({
  submitInvoiceToFactor: vi.fn(),
}))
vi.mock("@/lib/hub/integrations/qbo", () => ({
  pushInvoiceToQbo: vi.fn(),
}))

import { revalidatePath } from "next/cache"
import { setInvoiceStatus } from "@/lib/hub/invoices"
import { disputeInvoiceAction } from "@/app/hub/_actions/money"

const setStatusMock = vi.mocked(setInvoiceStatus)
const revalidateMock = vi.mocked(revalidatePath)

describe("disputeInvoiceAction — 0-row foreign invoice id", () => {
  beforeEach(() => {
    setStatusMock.mockReset()
    revalidateMock.mockClear()
  })

  it("reports failure when 0 rows changed", async () => {
    setStatusMock.mockResolvedValueOnce(0)
    const result = await disputeInvoiceAction("foreign-invoice")
    expect(result).toEqual({ ok: false, error: "Invoice not found" })
    expect(revalidateMock).not.toHaveBeenCalled()
  })

  it("returns ok and revalidates when the update matched a row", async () => {
    setStatusMock.mockResolvedValueOnce(1)
    const result = await disputeInvoiceAction("inv-1")
    expect(result).toEqual({ ok: true })
    expect(setStatusMock).toHaveBeenCalledWith(
      "carrier-1",
      "inv-1",
      "disputed",
      expect.objectContaining({ id: "u1", carrierId: "carrier-1" })
    )
    expect(revalidateMock).toHaveBeenCalled()
  })
})

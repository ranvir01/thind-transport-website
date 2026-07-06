/**
 * Regression: savePriceBookEntryAction mutated hub.accessorial_types (default
 * accessorial pricing feeding invoice/rate calculations) with no logAudit
 * call, unlike every other money mutation in this file. (1c money audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Accountant", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/invoices", () => ({
  createInvoiceFromLoad: vi.fn(), recordPayment: vi.fn(), sendFactoringPacket: vi.fn(), setInvoiceStatus: vi.fn(),
}))
vi.mock("@/lib/hub/settlements", () => ({
  approveSettlement: vi.fn(), createAdvance: vi.fn(), draftSettlements: vi.fn(), markSettlementPaid: vi.fn(),
}))
vi.mock("@/lib/hub/expenses", () => ({ createExpense: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))

import { logAudit } from "@/lib/hub/audit"
import { savePriceBookEntryAction } from "@/app/hub/_actions/money"

const logAuditMock = vi.mocked(logAudit)

beforeEach(() => logAuditMock.mockClear())

describe("savePriceBookEntryAction", () => {
  it("logs an audit entry when saving a price book entry", async () => {
    const result = await savePriceBookEntryAction({ name: "Detention", amount: "60.00", unit: "per_hour" })
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "accessorial_type", action: "saved" })
    )
  })
})

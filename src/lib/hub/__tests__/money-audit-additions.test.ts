/**
 * Regression: savePriceBookEntryAction mutated hub.accessorial_types (default
 * accessorial pricing feeding invoice/rate calculations) with no logAudit
 * call, unlike every other money mutation in this file. (1c money audit.)
 *
 * The UPDATE path also discarded the result: a foreign or missing id still
 * logged a success audit and returned ok. RETURNING/row-count like
 * updateFacilityAction / decideAdvanceAction.
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
import { query } from "@/lib/hub/db"
import { savePriceBookEntryAction } from "@/app/hub/_actions/money"

const logAuditMock = vi.mocked(logAudit)
const queryMock = vi.mocked(query)

beforeEach(() => {
  logAuditMock.mockClear()
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
})

describe("savePriceBookEntryAction", () => {
  it("logs an audit entry when saving a price book entry", async () => {
    const result = await savePriceBookEntryAction({ name: "Detention", amount: "60.00", unit: "per_hour" })
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "accessorial_type", action: "saved" })
    )
  })

  it("reports failure and skips the audit log when an UPDATE matches 0 rows", async () => {
    queryMock.mockResolvedValueOnce([])
    const result = await savePriceBookEntryAction({
      id: "foreign-type",
      name: "Detention",
      amount: "60.00",
      unit: "per_hour",
    })
    expect(result).toEqual({ ok: false, error: "Price book entry not found" })
    expect(logAuditMock).not.toHaveBeenCalled()
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE carrier_id = $1 AND id = $2")
    expect(String(sql)).toContain("RETURNING id")
    expect((params as unknown[]).slice(0, 2)).toEqual(["carrier-1", "foreign-type"])
  })

  it("logs the audit entry when a carrier-scoped UPDATE matched a row", async () => {
    queryMock.mockResolvedValueOnce([{ id: "type-1" }])
    const result = await savePriceBookEntryAction({
      id: "type-1",
      name: "Detention",
      amount: "75.00",
      unit: "per_hour",
    })
    expect(result).toEqual({ ok: true })
    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "accessorial_type",
        entityId: "type-1",
        action: "saved",
        newValue: { name: "Detention", amountCents: 7500, unit: "per_hour" },
      })
    )
  })
})

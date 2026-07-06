/**
 * pushInvoiceToQboAction — the office "Push to QuickBooks" button's server
 * action. Permission + tenancy live here (requirePermission → user.carrierId),
 * the QBO mechanics live in integrations/qbo.ts (covered by qbo.test.ts).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Accountant", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/invoices", () => ({
  createInvoiceFromLoad: vi.fn(), recordPayment: vi.fn(), sendFactoringPacket: vi.fn(),
  setInvoiceStatus: vi.fn(), sendCustomerStatement: vi.fn(),
}))
vi.mock("@/lib/hub/settlements", () => ({
  approveSettlement: vi.fn(), createAdvance: vi.fn(), draftSettlements: vi.fn(), markSettlementPaid: vi.fn(),
}))
vi.mock("@/lib/hub/expenses", () => ({ createExpense: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/integrations/factor", () => ({ submitInvoiceToFactor: vi.fn() }))
vi.mock("@/lib/hub/integrations/qbo", () => ({ pushInvoiceToQbo: vi.fn() }))

import { pushInvoiceToQbo } from "@/lib/hub/integrations/qbo"
import { requirePermission } from "@/lib/hub/session"
import { pushInvoiceToQboAction } from "@/app/hub/_actions/money"

const pushMock = vi.mocked(pushInvoiceToQbo)
const requirePermissionMock = vi.mocked(requirePermission)

beforeEach(() => {
  pushMock.mockReset()
  requirePermissionMock.mockClear()
})

describe("pushInvoiceToQboAction", () => {
  it("pushes with the session user's carrierId and requires money:write", async () => {
    pushMock.mockResolvedValue({ connected: true, pushed: true })
    const result = await pushInvoiceToQboAction("invoice-1")
    expect(result.ok).toBe(true)
    expect(requirePermissionMock).toHaveBeenCalledWith("money:write")
    expect(pushMock).toHaveBeenCalledWith("carrier-1", "invoice-1", expect.objectContaining({ id: "u1" }))
  })

  it("returns a settings pointer instead of a raw error when QBO is not connected", async () => {
    pushMock.mockResolvedValue({ connected: false })
    const result = await pushInvoiceToQboAction("invoice-1")
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Settings → Integrations/)
  })

  it("reports an already-pushed invoice without treating it as an error", async () => {
    pushMock.mockResolvedValue({ connected: true, alreadyPushed: true })
    const result = await pushInvoiceToQboAction("invoice-1")
    expect(result).toEqual({ ok: true, alreadyPushed: true })
  })
})

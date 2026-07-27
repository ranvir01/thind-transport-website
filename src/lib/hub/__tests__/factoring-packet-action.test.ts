/**
 * factoringPacketAction (TEST_GAPS.md #13) — the office "Send factoring
 * packet" button. Permission + tenancy live here (requirePermission →
 * user.carrierId), the send mechanics live in invoices.ts's
 * sendFactoringPacket (covered by send-factoring-packet.test.ts). Confirms a
 * send failure surfaces as { ok: false, error } rather than a swallowed catch.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Office", carrierId: "carrier-1" })),
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

import { sendFactoringPacket } from "@/lib/hub/invoices"
import { requirePermission } from "@/lib/hub/session"
import { factoringPacketAction } from "@/app/hub/_actions/money"

const sendMock = vi.mocked(sendFactoringPacket)
const requirePermissionMock = vi.mocked(requirePermission)

beforeEach(() => {
  sendMock.mockReset()
  requirePermissionMock.mockClear()
})

describe("factoringPacketAction", () => {
  it("sends with the session user's carrierId and requires money:write", async () => {
    sendMock.mockResolvedValue({ to: "ops@factorco.test" })
    const result = await factoringPacketAction("invoice-1")

    expect(result).toEqual({ ok: true, error: undefined, id: "ops@factorco.test" })
    expect(requirePermissionMock).toHaveBeenCalledWith("money:write")
    expect(sendMock).toHaveBeenCalledWith("carrier-1", "invoice-1", expect.objectContaining({ id: "u1" }))
  })

  it("surfaces a send failure as ok:false instead of throwing or swallowing it", async () => {
    sendMock.mockRejectedValue(new Error("Could not read pod-pod.pdf — the factor would receive an incomplete packet."))
    const result = await factoringPacketAction("invoice-1")

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/incomplete packet/)
  })

  it("returns Forbidden without ever calling sendFactoringPacket when permission is denied", async () => {
    requirePermissionMock.mockRejectedValueOnce(new Error("Forbidden"))
    const result = await factoringPacketAction("invoice-1")

    expect(result.ok).toBe(false)
    expect(sendMock).not.toHaveBeenCalled()
  })
})

/**
 * Every money server action in src/app/hub/_actions/money.ts must gate on the
 * right permission string. money:write and money:approve are meaningfully
 * different (see AGENTS.md — permissions are enforced in server actions,
 * never UI-only): approve-tier actions (settlement approval/payout, advance
 * decisions) move cash and must stay on money:approve. Nothing pinned which
 * string each of the 14 actions passes, so a copy-paste that downgrades an
 * approve gate to money:write would pass every existing test. (TEST_GAPS.md
 * §2 item 4.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Accountant", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/invoices", () => ({
  createInvoiceFromLoad: vi.fn(async () => ({ invoice: { id: "inv-1" }, emailed: false })),
  recordPayment: vi.fn(async () => undefined),
  sendFactoringPacket: vi.fn(async () => ({ to: "factor@example.com" })),
  setInvoiceStatus: vi.fn(async () => 1),
  sendCustomerStatement: vi.fn(async () => ({ emailed: false, to: "c@example.com", totalOpenCents: 0, invoiceCount: 0 })),
}))
vi.mock("@/lib/hub/settlements", () => ({
  approveSettlement: vi.fn(async () => ({ emailed: false })),
  createAdvance: vi.fn(async () => undefined),
  draftSettlements: vi.fn(async () => ({ created: 0, skipped: 0 })),
  markSettlementPaid: vi.fn(async () => true),
}))
vi.mock("@/lib/hub/expenses", () => ({ createExpense: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => [{ id: "adv-1", driver_id: "driver-1", amount_cents: 10000 }]),
}))
vi.mock("@/lib/hub/notify", () => ({ notifyDriver: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/integrations/factor", () => ({
  submitInvoiceToFactor: vi.fn(async () => ({ connected: true })),
}))
vi.mock("@/lib/hub/integrations/qbo", () => ({
  pushInvoiceToQbo: vi.fn(async () => ({ connected: true })),
}))

import { requirePermission } from "@/lib/hub/session"
import {
  approveSettlementAction,
  createAdvanceAction,
  createExpenseAction,
  createInvoiceAction,
  decideAdvanceAction,
  disputeInvoiceAction,
  draftSettlementsAction,
  factoringPacketAction,
  markSettlementPaidAction,
  pushInvoiceToQboAction,
  recordPaymentAction,
  savePriceBookEntryAction,
  sendCustomerStatementAction,
  submitInvoiceToFactorAction,
} from "@/app/hub/_actions/money"

const requirePermissionMock = vi.mocked(requirePermission)

beforeEach(() => requirePermissionMock.mockClear())

describe("money.ts server actions — permission gate per action", () => {
  const cases: Array<[string, "money:write" | "money:approve", () => Promise<unknown>]> = [
    ["createInvoiceAction", "money:write", () => createInvoiceAction("load-1")],
    ["recordPaymentAction", "money:write", () =>
      recordPaymentAction("inv-1", { amount: "10.00", paidOn: "2026-01-01" })],
    ["disputeInvoiceAction", "money:write", () => disputeInvoiceAction("inv-1")],
    ["factoringPacketAction", "money:write", () => factoringPacketAction("inv-1")],
    ["submitInvoiceToFactorAction", "money:write", () => submitInvoiceToFactorAction("inv-1")],
    ["pushInvoiceToQboAction", "money:write", () => pushInvoiceToQboAction("inv-1")],
    ["sendCustomerStatementAction", "money:write", () => sendCustomerStatementAction("cust-1")],
    ["draftSettlementsAction", "money:write", () => draftSettlementsAction()],
    ["approveSettlementAction", "money:approve", () => approveSettlementAction("settle-1")],
    ["markSettlementPaidAction", "money:approve", () => markSettlementPaidAction("settle-1")],
    ["createAdvanceAction", "money:write", () =>
      createAdvanceAction({ driverId: "driver-1", amount: "100.00", issuedOn: "2026-01-01" })],
    ["decideAdvanceAction", "money:approve", () => decideAdvanceAction("adv-1", "approve")],
    ["createExpenseAction", "money:write", () =>
      createExpenseAction({
        category: "fuel", amount: "10.00", incurredOn: "2026-01-01",
        reimbursable: false, billable: false,
      })],
    ["savePriceBookEntryAction", "money:write", () =>
      savePriceBookEntryAction({ name: "Detention", amount: "60.00", unit: "per_hour" })],
  ]

  for (const [name, expectedPermission, run] of cases) {
    it(`${name} requires ${expectedPermission}`, async () => {
      await run()
      expect(requirePermissionMock).toHaveBeenCalledWith(expectedPermission)
      expect(requirePermissionMock).toHaveBeenCalledTimes(1)
    })
  }

  it("never lets an approve-tier action fall back to money:write", async () => {
    const approveTier = [
      () => approveSettlementAction("settle-1"),
      () => markSettlementPaidAction("settle-1"),
      () => decideAdvanceAction("adv-1", "approve"),
    ]
    for (const run of approveTier) {
      requirePermissionMock.mockClear()
      await run()
      expect(requirePermissionMock).not.toHaveBeenCalledWith("money:write")
      expect(requirePermissionMock).toHaveBeenCalledWith("money:approve")
    }
  })
})

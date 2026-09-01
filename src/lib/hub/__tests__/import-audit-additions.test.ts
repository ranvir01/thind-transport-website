/**
 * Regression: importFuelAction and importTollsAction inserted money-bearing
 * rows (fuel_transactions.total_cents, toll_transactions.amount_cents) with
 * no logAudit call, unlike the sibling importLoadsAction. (1c money audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Dispatcher", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/loads", () => ({ createLoad: vi.fn() }))
vi.mock("@/lib/hub/customers", () => ({ findCustomerByName: vi.fn(), createCustomer: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))

import { logAudit } from "@/lib/hub/audit"
import { importFuelAction, importTollsAction } from "@/app/hub/_actions/import"

const logAuditMock = vi.mocked(logAudit)

beforeEach(() => logAuditMock.mockClear())

describe("importFuelAction", () => {
  it("logs an audit entry summarizing the import batch", async () => {
    const result = await importFuelAction([], "efs")
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "import_fuel", entityType: "import" })
    )
  })
})

describe("importTollsAction", () => {
  it("logs an audit entry summarizing the import batch", async () => {
    const result = await importTollsAction([], "pcmiler")
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "import_tolls", entityType: "import" })
    )
  })
})

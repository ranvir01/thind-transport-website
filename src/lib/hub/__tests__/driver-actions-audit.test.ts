/**
 * Regression: driverRequestAdvance and driverUploadDocument's receipt→expense
 * branch wrote money-bearing rows (hub.advances, hub.expenses) with no
 * logAudit call, unlike every other money mutation. (1c money/tenancy audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requireDriverUser: vi.fn(async () => ({ id: "u1", name: "Sam Driver", carrierId: "carrier-1", driverId: "driver-1" })),
}))
vi.mock("@/lib/hub/loads", () => ({
  addLoadEvent: vi.fn(async () => undefined),
  changeLoadStatus: vi.fn(async () => undefined),
  setStopTimestamp: vi.fn(async () => null),
  getLoad: vi.fn(async () => ({ id: "load-1", reference: "L-1" })),
}))
vi.mock("@/lib/hub/driver-app", () => ({
  driverOwnsLoad: vi.fn(async () => ({ id: "load-1", status: "delivered" })),
  DRIVER_STATUS_FLOW: {},
}))
vi.mock("@/lib/hub/documents", () => ({
  saveDocument: vi.fn(async () => ({ id: "doc-1" })),
}))
vi.mock("@/lib/hub/facilities", () => ({ addFacilityNote: vi.fn(async () => true) }))
vi.mock("@/lib/hub/timeoff", () => ({ createTimeOffRequest: vi.fn(), cancelTimeOff: vi.fn() }))
vi.mock("@/lib/hub/announcements", () => ({ acknowledgeAnnouncement: vi.fn() }))
vi.mock("@/lib/hub/notify", () => ({ notifyRoles: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => [{ id: "row-1" }]),
  queryOne: vi.fn(async () => null),
}))

import { query } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { driverRequestAdvance, driverUploadDocument } from "@/app/hub/_actions/driver"

const queryMock = vi.mocked(query)
const logAuditMock = vi.mocked(logAudit)

beforeEach(() => {
  queryMock.mockClear()
  logAuditMock.mockClear()
  queryMock.mockResolvedValue([{ id: "row-1" }])
})

describe("driverRequestAdvance", () => {
  it("logs an audit entry for the advance request", async () => {
    const result = await driverRequestAdvance({ amount: "150.00" })
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "advance", action: "requested", newValue: { amountCents: 15000 } })
    )
  })
})

describe("driverUploadDocument — receipt with an amount", () => {
  it("logs an audit entry for the auto-created reimbursable expense", async () => {
    const formData = new FormData()
    formData.set("load_id", "load-1")
    formData.set("kind", "receipt")
    formData.set("amount", "42.50")
    formData.set("file", new File(["x"], "receipt.jpg", { type: "image/jpeg" }))

    const result = await driverUploadDocument(formData)
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "expense", action: "driver_receipt" })
    )
  })
})

/**
 * Regression: requestDocumentAction wrote an unvalidated loadId onto
 * hub.document_requests, and cancelDocumentRequestAction reported success
 * even when its UPDATE matched 0 rows (foreign or already-decided request).
 * (1c tenancy audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  // comms actions direct drivers — the gate is drivers:write now.
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Dispatcher", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/announcements", () => ({ createAnnouncement: vi.fn() }))
vi.mock("@/lib/hub/timeoff", () => ({ decideTimeOff: vi.fn() }))
vi.mock("@/lib/hub/notify", () => ({ notifyDriver: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => ({ id: "driver-1", name: "Sam Driver" })),
}))

import { query } from "@/lib/hub/db"
import { assertCarrierRefs } from "@/lib/hub/tenancy"
import { cancelDocumentRequestAction, requestDocumentAction } from "@/app/hub/_actions/comms"

const queryMock = vi.mocked(query)
const assertRefsMock = vi.mocked(assertCarrierRefs)

beforeEach(() => {
  queryMock.mockClear()
  assertRefsMock.mockClear()
  queryMock.mockResolvedValue([{ id: "req-1" }])
})

describe("requestDocumentAction", () => {
  it("validates the loadId belongs to the carrier before inserting", async () => {
    await requestDocumentAction({ driverId: "driver-1", kind: "cdl", loadId: "load-1" })
    expect(assertRefsMock).toHaveBeenCalledWith("carrier-1", { load_id: "load-1" })
  })

  it("rejects when the load belongs to a different carrier", async () => {
    assertRefsMock.mockRejectedValueOnce(new Error("Load not found"))
    const result = await requestDocumentAction({ driverId: "driver-1", kind: "cdl", loadId: "foreign-load" })
    expect(result).toEqual({ ok: false, error: "Load not found" })
  })

  it("refuses a kind outside the request panel's options — nothing is written or notified", async () => {
    const result = await requestDocumentAction({ driverId: "driver-1", kind: "ssn_card" })
    expect(result).toEqual({ ok: false, error: "Pick what you need" })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("accepts each kind the driver request panel actually offers", async () => {
    for (const kind of ["pod", "bol", "receipt", "cdl", "medical_card", "other"]) {
      const result = await requestDocumentAction({ driverId: "driver-1", kind })
      expect(result.ok).toBe(true)
    }
  })
})

describe("cancelDocumentRequestAction", () => {
  it("reports failure when the UPDATE matches 0 rows", async () => {
    queryMock.mockResolvedValueOnce([])
    const result = await cancelDocumentRequestAction("req-1")
    expect(result).toEqual({ ok: false, error: "Already decided or not found" })
  })

  it("reports success when a row is actually cancelled", async () => {
    queryMock.mockResolvedValueOnce([{ id: "req-1" }])
    const result = await cancelDocumentRequestAction("req-1")
    expect(result).toEqual({ ok: true })
  })
})

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
vi.mock("@/lib/hub/detention", () => ({ applyDetentionAccrual: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => [{ id: "row-1" }]),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { hubDb, query, queryOne } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { setStopTimestamp } from "@/lib/hub/loads"
import { driverRequestAdvance, driverStopTimestamp, driverUploadDocument } from "@/app/hub/_actions/driver"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const hubDbMock = vi.mocked(hubDb)
const logAuditMock = vi.mocked(logAudit)
const setStopTimestampMock = vi.mocked(setStopTimestamp)

/**
 * driverRequestAdvance's exposure check + insert now runs inside a
 * hubDb().connect() transaction (advisory-lock guarded, see
 * advance-exposure-cap.test.ts) instead of the module-level query/queryOne —
 * fake just enough of a pg client for the cap check to see `exposureCents`.
 */
function mockAdvanceClient(exposureCents: number) {
  hubDbMock.mockReturnValue({
    connect: vi.fn(async () => ({
      query: vi.fn(async (sql: string) => {
        const s = String(sql)
        if (s.includes("SUM(amount_cents)")) return { rows: [{ cents: exposureCents }] }
        if (s.includes("INSERT INTO hub.advances")) return { rows: [{ id: "row-1" }] }
        return { rows: [] }
      }),
      release: vi.fn(),
    })),
  } as unknown as ReturnType<typeof hubDb>)
}

beforeEach(() => {
  queryMock.mockClear()
  queryOneMock.mockClear()
  logAuditMock.mockClear()
  hubDbMock.mockReset()
  setStopTimestampMock.mockClear()
  queryMock.mockResolvedValue([{ id: "row-1" }])
  queryOneMock.mockResolvedValue(null)
  setStopTimestampMock.mockResolvedValue(null)
  mockAdvanceClient(0)
})

describe("driverRequestAdvance", () => {
  it("logs an audit entry for the advance request", async () => {
    const result = await driverRequestAdvance({ amount: "150.00" })
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "advance", action: "requested", newValue: { amountCents: 15000 } })
    )
  })

  it("rejects a request that would push the driver's exposure past the cap, without inserting", async () => {
    mockAdvanceClient(149500)
    const result = await driverRequestAdvance({ amount: "150.00" })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/advance limit/i)
    expect(logAuditMock).not.toHaveBeenCalled()
  })
})

describe("driverUploadDocument — POD with OS&D", () => {
  it("pins the Carmack filing-deadline stop lookup to the driver's carrier", async () => {
    const formData = new FormData()
    formData.set("load_id", "load-1")
    formData.set("kind", "pod")
    formData.set("osd", "1")
    formData.set("file", new File(["x"], "pod.jpg", { type: "image/jpeg" }))

    const result = await driverUploadDocument(formData)
    expect(result.ok).toBe(true)

    const claimSql = queryMock.mock.calls
      .map(([sql]) => String(sql))
      .find((sql) => sql.includes("INSERT INTO hub.claims"))
    expect(claimSql).toBeTruthy()
    // A load_id + type filter alone would let a foreign delivery stop's
    // departed_at set the 9-month filing deadline (hub.stops lateral sweep).
    expect(claimSql).toContain("FROM hub.stops s WHERE s.carrier_id = $1 AND s.load_id = $2 AND s.type = 'delivery'")
    const claimArgs = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO hub.claims")
    )?.[1]
    expect(claimArgs).toEqual(["carrier-1", "load-1"])
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

describe("driverStopTimestamp", () => {
  it("records the tap-time timestamp the client sent, not the server clock at replay", async () => {
    const tapTime = "2026-07-20T03:15:00.000Z"
    const result = await driverStopTimestamp("stop-1", "load-1", "departed_at", tapTime)
    expect(result.ok).toBe(true)
    expect(setStopTimestampMock).toHaveBeenCalledWith("carrier-1", "stop-1", "load-1", "departed_at", tapTime)
  })
})

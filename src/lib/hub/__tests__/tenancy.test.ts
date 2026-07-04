import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))

import { query } from "../db"
import { assertCarrierRefs } from "../tenancy"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const REF = "22222222-2222-2222-2222-222222222222"

describe("assertCarrierRefs", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue([])
  })

  it("skips null, undefined, and empty refs without querying", async () => {
    await expect(
      assertCarrierRefs(CARRIER, { driver_id: null, truck_id: undefined, trailer_id: "" })
    ).resolves.toBeUndefined()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("resolves when the ref belongs to the carrier", async () => {
    queryMock.mockResolvedValue([{ id: REF }])
    await expect(assertCarrierRefs(CARRIER, { driver_id: REF })).resolves.toBeUndefined()
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(sql).toContain("hub.drivers")
    expect(sql).toContain("carrier_id = $1")
    expect(sql).toContain("deleted_at IS NULL")
    expect(params).toEqual([CARRIER, REF])
  })

  it("throws when the ref exists under another carrier (query returns nothing)", async () => {
    await expect(assertCarrierRefs(CARRIER, { driver_id: REF })).rejects.toThrow("Driver not found")
    await expect(assertCarrierRefs(CARRIER, { truck_id: REF })).rejects.toThrow("Truck not found")
    await expect(assertCarrierRefs(CARRIER, { trailer_id: REF })).rejects.toThrow("Trailer not found")
    await expect(assertCarrierRefs(CARRIER, { customer_id: REF })).rejects.toThrow("Customer not found")
    await expect(assertCarrierRefs(CARRIER, { load_id: REF })).rejects.toThrow("Load not found")
  })

  it("guards hard-delete tables without a deleted_at clause", async () => {
    queryMock.mockResolvedValue([{ id: REF }])
    await assertCarrierRefs(CARRIER, { schedule_id: REF })
    const [sql, params] = queryMock.mock.calls[0]
    expect(sql).toContain("hub.maintenance_schedules")
    expect(sql).toContain("carrier_id = $1")
    expect(sql).not.toContain("deleted_at")
    expect(params).toEqual([CARRIER, REF])
  })

  it("throws for cross-carrier refs on the newer ref tables", async () => {
    await expect(assertCarrierRefs(CARRIER, { schedule_id: REF })).rejects.toThrow("Maintenance schedule not found")
    await expect(assertCarrierRefs(CARRIER, { incident_id: REF })).rejects.toThrow("Incident not found")
    await expect(assertCarrierRefs(CARRIER, { applicant_id: REF })).rejects.toThrow("Applicant not found")
    await expect(assertCarrierRefs(CARRIER, { facility_id: REF })).rejects.toThrow("Facility not found")
    await expect(assertCarrierRefs(CARRIER, { message_thread_id: REF })).rejects.toThrow("Thread not found")
  })

  it("checks each provided ref against its own table", async () => {
    queryMock.mockResolvedValue([{ id: REF }])
    await assertCarrierRefs(CARRIER, { customer_id: REF, driver_id: REF, truck_id: REF, trailer_id: REF, load_id: REF })
    const tables = queryMock.mock.calls.map(([sql]) => String(sql))
    expect(tables.some((s) => s.includes("hub.customers"))).toBe(true)
    expect(tables.some((s) => s.includes("hub.drivers"))).toBe(true)
    expect(tables.some((s) => s.includes("hub.trucks"))).toBe(true)
    expect(tables.some((s) => s.includes("hub.trailers"))).toBe(true)
    expect(tables.some((s) => s.includes("hub.loads"))).toBe(true)
  })
})

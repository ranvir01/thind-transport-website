/**
 * fuelFraudFlags is the only duplicate-swipe / over-tank-capacity detector in
 * the product, and had zero coverage (TEST_GAPS.md #10): both its queries
 * carry a tenancy guard inline in the SQL (no shared helper), and its merge
 * of the two result sets was never asserted to actually merge and sort.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
}))

import { query } from "../db"
import { fuelFraudFlags } from "../fuel"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  queryMock.mockReset()
})

describe("fuelFraudFlags", () => {
  it("scopes both the duplicate-swipe and over-capacity queries by carrier_id", async () => {
    queryMock.mockResolvedValue([])
    await fuelFraudFlags(CARRIER, 92)

    expect(queryMock).toHaveBeenCalledTimes(2)

    const [dupSql, dupParams] = queryMock.mock.calls[0]
    expect(String(dupSql)).toContain("WHERE f1.carrier_id = $1 AND f1.ts >= NOW()")
    expect(String(dupSql)).toContain("f2.carrier_id = f1.carrier_id")
    expect(dupParams).toEqual([CARRIER, 92])

    const [capSql, capParams] = queryMock.mock.calls[1]
    expect(String(capSql)).toContain("WHERE f.carrier_id = $1 AND t.tank_capacity_gallons IS NOT NULL")
    expect(String(capSql)).toContain("t.carrier_id = f.carrier_id")
    expect(capParams).toEqual([CARRIER, 92])
  })

  it("defaults the lookback window to 92 days when not specified", async () => {
    queryMock.mockResolvedValue([])
    await fuelFraudFlags(CARRIER)
    expect(queryMock.mock.calls[0][1]).toEqual([CARRIER, 92])
    expect(queryMock.mock.calls[1][1]).toEqual([CARRIER, 92])
  })

  it("merges duplicate and over-capacity flags and sorts them newest-first", async () => {
    queryMock.mockResolvedValueOnce([
      { kind: "duplicate", detail: "dup 1", ts: "2026-07-01T10:00:00", truck_unit: "101" },
    ] as never)
    queryMock.mockResolvedValueOnce([
      { kind: "over_capacity", detail: "over 1", ts: "2026-07-03T10:00:00", truck_unit: "102" },
    ] as never)

    const flags = await fuelFraudFlags(CARRIER)

    expect(flags.map((f) => f.kind)).toEqual(["over_capacity", "duplicate"])
    expect(flags[0].ts).toBe("2026-07-03T10:00:00")
    expect(flags[1].ts).toBe("2026-07-01T10:00:00")
  })

  it("returns an empty list when neither query finds a flag", async () => {
    queryMock.mockResolvedValue([])
    const flags = await fuelFraudFlags(CARRIER)
    expect(flags).toEqual([])
  })
})

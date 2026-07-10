import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { query } from "../db"
import { driverSettlementLines } from "../driver-app"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const DRIVER = "33333333-3333-3333-3333-333333333333"
const SETTLEMENT = "22222222-2222-2222-2222-222222222222"

describe("driverSettlementLines", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue([])
  })

  it("joins hub.settlements on both carrier_id and driver_id (not settlement-id-only)", async () => {
    await driverSettlementLines(CARRIER, DRIVER, SETTLEMENT)
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("JOIN hub.settlements s ON s.id = sl.settlement_id AND s.carrier_id = $1 AND s.driver_id = $2")
    expect(params).toEqual([CARRIER, DRIVER, SETTLEMENT])
  })

  it("a driver requesting another driver's settlement id gets no lines (query returns empty)", async () => {
    queryMock.mockResolvedValueOnce([])
    const lines = await driverSettlementLines(CARRIER, DRIVER, "someone-elses-settlement")
    expect(lines).toEqual([])
  })
})
